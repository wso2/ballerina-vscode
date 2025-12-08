package io.ballerina.copilotagent.core;

import io.ballerina.compiler.syntax.tree.ExpressionFunctionBodyNode;
import io.ballerina.compiler.syntax.tree.FunctionBodyBlockNode;
import io.ballerina.compiler.syntax.tree.FunctionBodyNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.ListenerDeclarationNode;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.TypeDefinitionNode;
import io.ballerina.copilotagent.core.models.ChangeType;
import io.ballerina.copilotagent.core.models.NodeKind;
import io.ballerina.copilotagent.core.models.STNodeRefMap;
import io.ballerina.copilotagent.core.models.SemanticDiff;
import io.ballerina.copilotagent.core.models.ServiceMemberMap;
import io.ballerina.projects.Document;
import io.ballerina.projects.Project;
import io.ballerina.tools.text.LineRange;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class SemanticDiffComputer {
    private final Project originalProject;
    private final Project modifiedProject;
    private final WorkspaceManager originalWorkspaceManager;
    private final WorkspaceManager shadowWorkspaceManager;
    private final List<SemanticDiff> semanticDiffs = new ArrayList<>();
    private final String rootProjectPath;

    public SemanticDiffComputer(Project originalProject,
                                Project modifiedProject,
                                WorkspaceManager originalWorkspaceManager,
                                WorkspaceManager shadowWorkspaceManager) {
        this.originalProject = originalProject;
        this.modifiedProject = modifiedProject;
        this.originalWorkspaceManager = originalWorkspaceManager;
        this.shadowWorkspaceManager = shadowWorkspaceManager;
        this.rootProjectPath = originalProject.sourceRoot().toString();
    }

    public List<SemanticDiff> computeSemanticDiffs() {
        Map<String, Document> originalDocumentMap = collectDocumentMap(originalProject);
        Map<String, Document> modifiedDocumentMap = collectDocumentMap(modifiedProject);

        STNodeRefMap originalNodeRefMap = new STNodeRefMap();
        STNodeRefMap modifiedNodeRefMap = new STNodeRefMap();

        NodeRefExtractor originalNodeRefExtractor = new NodeRefExtractor(originalNodeRefMap);
        NodeRefExtractor modifiedNodeRefExtractor = new NodeRefExtractor(modifiedNodeRefMap);

        for (String docName : originalDocumentMap.keySet()) {
            if (!modifiedDocumentMap.containsKey(docName)) {
                // Document removed in modified project
                continue;
            }
            Document originalDoc = originalDocumentMap.get(docName);
            Document modifiedDoc = modifiedDocumentMap.get(docName);
            modifiedDocumentMap.remove(docName);
            if (originalDoc.syntaxTree().rootNode().toSourceCode().equals(
                    modifiedDoc.syntaxTree().rootNode().toSourceCode())) {
                continue;
            }

            originalDoc.syntaxTree().rootNode().accept(originalNodeRefExtractor);
            modifiedDoc.syntaxTree().rootNode().accept(modifiedNodeRefExtractor);
        }

        // Handle newly added documents in modified project
        for (String docName : modifiedDocumentMap.keySet()) {
            Document modifiedDoc = modifiedDocumentMap.get(docName);
            modifiedDoc.syntaxTree().rootNode().accept(modifiedNodeRefExtractor);
        }

        computeListenerDiffs(originalNodeRefMap.getListenerNodeMap(), modifiedNodeRefMap.getListenerNodeMap());
        computeFunctionDiffs(originalNodeRefMap.getFunctionNodeMap(), modifiedNodeRefMap.getFunctionNodeMap());
        computeServiceDiffs(originalNodeRefMap.getServiceNodeMap(), modifiedNodeRefMap.getServiceNodeMap());
        computeTypeDefDiffs(originalNodeRefMap.getTypeDefNodeMap(), modifiedNodeRefMap.getTypeDefNodeMap());
        return this.semanticDiffs;
    }

    private void computeListenerDiffs(Map<String, ListenerDeclarationNode> originalListenerMap,
                                      Map<String, ListenerDeclarationNode> modifiedListenerMap) {
        for (String listenerName : originalListenerMap.keySet()) {
            if (!modifiedListenerMap.containsKey(listenerName)) {
                // Listener removed in modified project
                SemanticDiff diff = new SemanticDiff(ChangeType.DELETION, NodeKind.LISTENER_DECLARATION,
                        "", null);
                this.semanticDiffs.add(diff);
                continue;
            }
            modifiedListenerMap.remove(listenerName);
        }

        // Handle newly added listeners in modified project
        for (String listenerName : modifiedListenerMap.keySet()) {
            ListenerDeclarationNode listenerDeclarationNode = modifiedListenerMap.get(listenerName);
            LineRange lineRange = listenerDeclarationNode.lineRange();
            SemanticDiff diff = new SemanticDiff(ChangeType.ADDITION, NodeKind.LISTENER_DECLARATION,
                    resolveUri(lineRange.fileName()), lineRange);
            this.semanticDiffs.add(diff);
        }
    }

    private void computeTypeDefDiffs(Map<String, TypeDefinitionNode> originalTypeDefMap,
                                     Map<String, TypeDefinitionNode> modifiedTypeDefMap) {
        for (String typeDefName : originalTypeDefMap.keySet()) {
            if (!modifiedTypeDefMap.containsKey(typeDefName)) {
                // Type definition removed in modified project
                SemanticDiff diff = new SemanticDiff(ChangeType.DELETION, NodeKind.TYPE_DEFINITION,
                        "", null);
                this.semanticDiffs.add(diff);
                continue;
            }
            modifiedTypeDefMap.remove(typeDefName); // TODO: Handle modifications
        }

        // Handle newly added type definitions in modified project
        for (String typeDefName : modifiedTypeDefMap.keySet()) {
            TypeDefinitionNode typeDefinitionNode = modifiedTypeDefMap.get(typeDefName);
            LineRange lineRange = typeDefinitionNode.lineRange();
            SemanticDiff diff = new SemanticDiff(ChangeType.ADDITION, NodeKind.TYPE_DEFINITION,
                    resolveUri(lineRange.fileName()), lineRange);
            this.semanticDiffs.add(diff);
        }
    }

    private void computeFunctionDiffs(Map<String, FunctionDefinitionNode> originalFunctionMap,
                                      Map<String, FunctionDefinitionNode> modifiedFunctionMap) {
        for (String functionName : originalFunctionMap.keySet()) {
            if (!modifiedFunctionMap.containsKey(functionName)) {
                // Function removed in modified project
                SemanticDiff diff = new SemanticDiff(ChangeType.DELETION, NodeKind.MODULE_FUNCTION,
                        "", null);
                this.semanticDiffs.add(diff);
                continue;
            }
            modifiedFunctionMap.remove(functionName);
            compareFunctionBodies(originalFunctionMap.get(functionName), modifiedFunctionMap.get(functionName));
        }

        // Handle newly added functions in modified project
        for (String functionName : modifiedFunctionMap.keySet()) {
            FunctionDefinitionNode functionDefinitionNode = modifiedFunctionMap.get(functionName);
            LineRange lineRange = functionDefinitionNode.lineRange();
            SemanticDiff diff = new SemanticDiff(ChangeType.ADDITION, NodeKind.MODULE_FUNCTION,
                    resolveUri(lineRange.fileName()), lineRange);
            this.semanticDiffs.add(diff);
        }
    }

    private void compareFunctionBodies(FunctionDefinitionNode originalFunction,
                                      FunctionDefinitionNode modifiedFunction) {
        FunctionBodyNode originalFunctionBody = originalFunction.functionBody();
        FunctionBodyNode modifiedFunctionBody = modifiedFunction.functionBody();
        compareFunctionBodies(modifiedFunction, originalFunctionBody, modifiedFunctionBody);
    }

    private void compareFunctionBodies(NonTerminalNode modifiedFunction,
                                       FunctionBodyNode originalFunctionBody,
                                       FunctionBodyNode modifiedFunctionBody) {
        if (originalFunctionBody.toSourceCode().equals(modifiedFunctionBody.toSourceCode())) {
            return;
        }

        if (originalFunctionBody instanceof ExpressionFunctionBodyNode) {
            LineRange lineRange = modifiedFunction.lineRange();
            SemanticDiff diff = new SemanticDiff(ChangeType.MODIFICATION, NodeKind.DATA_MAPPING_FUNCTION,
                    resolveUri(lineRange.fileName()), lineRange);
            this.semanticDiffs.add(diff);
            return;
        }

        if (originalFunctionBody instanceof FunctionBodyBlockNode body
                && modifiedFunctionBody instanceof FunctionBodyBlockNode modBody) {
            if (body.statements().size() != modBody.statements().size()) {
                LineRange lineRange = modifiedFunction.lineRange();
                SemanticDiff diff = new SemanticDiff(ChangeType.MODIFICATION, NodeKind.MODULE_FUNCTION,
                        resolveUri(lineRange.fileName()), lineRange);
                this.semanticDiffs.add(diff);
                return;
            }

            for (int i = 0; i < body.statements().size(); i++) {
                if (!body.statements().get(i).toSourceCode().equals(modBody.statements().get(i).toSourceCode())) {
                    LineRange lineRange = modifiedFunction.lineRange();
                    SemanticDiff diff = new SemanticDiff(ChangeType.MODIFICATION, NodeKind.MODULE_FUNCTION,
                            resolveUri(lineRange.fileName()), lineRange);
                    this.semanticDiffs.add(diff);
                    return;
                }
            }
        }
    }

    private void computeServiceDiffs(Map<String, ServiceDeclarationNode> originalServiceMap,
                                     Map<String, ServiceDeclarationNode> modifiedServiceMap) {
        List<String> foundServices = new ArrayList<>();
        for (String serviceName : originalServiceMap.keySet()) {
            if (modifiedServiceMap.containsKey(serviceName)) {
                ServiceDeclarationNode originalService = originalServiceMap.get(serviceName);
                ServiceDeclarationNode modifiedService = modifiedServiceMap.get(serviceName);
                foundServices.add(serviceName);
                if (!originalService.toSourceCode().equals(modifiedService.toSourceCode())) {
                    analyzeServiceModifications(originalService, modifiedService);
                }
            }
        }
        foundServices.forEach(modifiedServiceMap::remove);
        foundServices.forEach(originalServiceMap::remove);

        // Split keys by # and check if there is a match between first parts
        Map<String, String> originalServiceBasePaths = new HashMap<>();
        Map<String, String> modifiedServiceBasePaths = new HashMap<>();

        for (String serviceName : originalServiceMap.keySet()) {
            String basePath = serviceName.split("#")[0];
            originalServiceBasePaths.put(basePath, serviceName);
        }

        for (String serviceName : modifiedServiceMap.keySet()) {
            String basePath = serviceName.split("#")[0];
            modifiedServiceBasePaths.put(basePath, serviceName);
        }

        // Check for matches and handle differences
        for (String basePath : originalServiceBasePaths.keySet()) {
            if (modifiedServiceBasePaths.containsKey(basePath)) {
                String originalServiceName = originalServiceBasePaths.get(basePath);
                String modifiedServiceName = modifiedServiceBasePaths.get(basePath);
                foundServices.add(originalServiceName);
                foundServices.add(modifiedServiceName);
                ServiceDeclarationNode originalService = originalServiceMap.get(originalServiceName);
                ServiceDeclarationNode modifiedService = modifiedServiceMap.get(modifiedServiceName);
                analyzeServiceModifications(originalService, modifiedService);
            }
        }

        foundServices.forEach(modifiedServiceMap::remove);
        foundServices.forEach(originalServiceMap::remove);

        // Handle whats in left modifiedServiceMap as additions
        modifiedServiceMap.forEach((serviceName, modifiedService) -> {
            ServiceMemberMap modifiedServiceMemberMap = new ServiceMemberMap();
            ServiceMethodExtractor modifiedServiceMethodExtractor =
                    new ServiceMethodExtractor(modifiedServiceMemberMap);
            modifiedService.accept(modifiedServiceMethodExtractor);

            modifiedServiceMemberMap.getRemoteMethods().forEach((key, modifiedMethod) -> {
                LineRange lineRange = modifiedMethod.lineRange();
                SemanticDiff diff = new SemanticDiff(ChangeType.ADDITION, NodeKind.OBJECT_FUNCTION,
                        resolveUri(lineRange.fileName()), lineRange);
                this.semanticDiffs.add(diff);
            });

            modifiedServiceMemberMap.getResourceMethods().forEach((key, modifiedMethod) -> {
                LineRange lineRange = modifiedMethod.lineRange();
                SemanticDiff diff = new SemanticDiff(ChangeType.ADDITION, NodeKind.OBJECT_FUNCTION,
                        resolveUri(lineRange.fileName()), lineRange);
                this.semanticDiffs.add(diff);
            });

            modifiedServiceMemberMap.getObjectMethods().forEach((key, modifiedMethod) -> {
                LineRange lineRange = modifiedMethod.lineRange();
                SemanticDiff diff = new SemanticDiff(ChangeType.ADDITION, NodeKind.OBJECT_FUNCTION,
                        resolveUri(lineRange.fileName()), lineRange);
                this.semanticDiffs.add(diff);
            });
        });

    }

    private void analyzeServiceModifications(ServiceDeclarationNode originalService,
                                             ServiceDeclarationNode modifiedService) {
        ServiceMemberMap originalServiceMemberMap = new ServiceMemberMap();
        ServiceMemberMap modifiedServiceMemberMap = new ServiceMemberMap();

        ServiceMethodExtractor originalServiceMethodExtractor = new ServiceMethodExtractor(originalServiceMemberMap);
        ServiceMethodExtractor modifiedServiceMethodExtractor = new ServiceMethodExtractor(modifiedServiceMemberMap);
        originalService.accept(originalServiceMethodExtractor);
        modifiedService.accept(modifiedServiceMethodExtractor);

        modifiedServiceMemberMap.getRemoteMethods().forEach((key, modifiedMethod) -> {
            if (originalServiceMemberMap.getRemoteMethods().containsKey(key)) {
                FunctionDefinitionNode originalMethod = originalServiceMemberMap.getRemoteMethods().get(key);
                compareFunctionBodies(originalMethod, modifiedMethod);
                return;
            }
            // New remote method added
            LineRange lineRange = modifiedMethod.lineRange();
            SemanticDiff diff = new SemanticDiff(ChangeType.ADDITION, NodeKind.OBJECT_FUNCTION,
                    resolveUri(lineRange.fileName()), lineRange);
            this.semanticDiffs.add(diff);
        });

        modifiedServiceMemberMap.getResourceMethods().forEach((key, modifiedMethod) -> {
            if (originalServiceMemberMap.getResourceMethods().containsKey(key)) {
                FunctionDefinitionNode originalMethod = originalServiceMemberMap.getResourceMethods().get(key);
                compareFunctionBodies(originalMethod, modifiedMethod);
                return;
            }
            // New resource method added
            LineRange lineRange = modifiedMethod.lineRange();
            SemanticDiff diff = new SemanticDiff(ChangeType.ADDITION, NodeKind.OBJECT_FUNCTION,
                    resolveUri(lineRange.fileName()), lineRange);
            this.semanticDiffs.add(diff);
        });

        modifiedServiceMemberMap.getObjectMethods().forEach((key, modifiedMethod) -> {
            if (originalServiceMemberMap.getObjectMethods().containsKey(key)) {
                FunctionDefinitionNode originalMethod = originalServiceMemberMap.getObjectMethods().get(key);
                compareFunctionBodies(originalMethod, modifiedMethod);
                return;
            }
            // New object method added
            LineRange lineRange = modifiedMethod.lineRange();
            SemanticDiff diff = new SemanticDiff(ChangeType.ADDITION, NodeKind.OBJECT_FUNCTION,
                    resolveUri(lineRange.fileName()), lineRange);
            this.semanticDiffs.add(diff);
        });
    }

    private Map<String, Document> collectDocumentMap(Project project) {
        Map<String, Document> documentMap = new HashMap<>();
        project.currentPackage().getDefaultModule().documentIds().stream()
                .map(project.currentPackage().getDefaultModule()::document)
                .filter(Objects::nonNull)
                .forEach(document -> {
                    documentMap.put(document.name(), document);
                });
        return documentMap;
    }

    private String resolveUri(String fileName) {
        Path filePath = Path.of(rootProjectPath).resolve(fileName);
        return "ai"+ filePath.toUri().toString().substring(4);
    }
}
