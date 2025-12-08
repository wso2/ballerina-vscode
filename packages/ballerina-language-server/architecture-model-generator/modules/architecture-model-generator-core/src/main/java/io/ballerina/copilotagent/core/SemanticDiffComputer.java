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
import io.ballerina.copilotagent.core.models.Result;
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
    private final List<SemanticDiff> semanticDiffs = new ArrayList<>();
    private final String rootProjectPath;
    private boolean loadDesignDiagrams = false;

    public SemanticDiffComputer(Project originalProject,
                                Project modifiedProject,
                                WorkspaceManager originalWorkspaceManager,
                                WorkspaceManager shadowWorkspaceManager) {
        this.originalProject = originalProject;
        this.modifiedProject = modifiedProject;
        this.rootProjectPath = originalProject.sourceRoot().toString();
    }

    public Result computeSemanticDiffs() {
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
        computeServiceDiffs(originalNodeRefMap.getServiceNodeMap(), modifiedNodeRefMap.getServiceNodeMap());
        computeFunctionDiffs(originalNodeRefMap.getFunctionNodeMap(), modifiedNodeRefMap.getFunctionNodeMap());
        computeTypeDefDiffs(originalNodeRefMap.getTypeDefNodeMap(), modifiedNodeRefMap.getTypeDefNodeMap());

        if (!loadDesignDiagrams) {
            compareUsingDesignDiagrams();
        }

        return new Result(loadDesignDiagrams, this.semanticDiffs);
    }

    /**
     * Computes listener differences between original and modified projects to determine
     * if design diagrams need to be reloaded.
     *
     * <p>This method performs a shallow comparison of listener declarations to detect
     * structural changes such as listener additions or removals. It sets the
     * {@code loadDesignDiagrams} flag if any differences are found, which indicates
     * that the architecture diagram should be regenerated.
     *
     * <p>Note: This method does not analyze the expression content of listeners since
     * only structural changes affect the design diagram. The comparison terminates
     * early if a difference is already detected to optimize performance.
     *
     * @param originalListenerMap map of listener names to their declaration nodes
     *                           from the original project
     * @param modifiedListenerMap map of listener names to their declaration nodes
     *                           from the modified project
     */
    private void computeListenerDiffs(Map<String, ListenerDeclarationNode> originalListenerMap,
                                      Map<String, ListenerDeclarationNode> modifiedListenerMap) {
        if (loadDesignDiagrams) {
            return;
        }

        for (String listenerName : originalListenerMap.keySet()) {
            if (!modifiedListenerMap.containsKey(listenerName)) {
                loadDesignDiagrams = true;
                return;
            }
            modifiedListenerMap.remove(listenerName);
        }

        if (!modifiedListenerMap.isEmpty()) {
            loadDesignDiagrams = true;
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

    /**
     * Computes function differences between original and modified projects to identify
     * changes and update semantic diffs accordingly.
     *
     * @param originalFunctionMap original map of function names to their definition nodes
     * @param modifiedFunctionMap modified map of function names to their definition nodes
     */
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
            compareFunctionBodies(originalFunctionMap.get(functionName),
                    modifiedFunctionMap.get(functionName), NodeKind.MODULE_FUNCTION);
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

    /**
     * Compares the bodies of two functions to identify modifications and update
     * semantic diffs accordingly.
     *
     * @param originalFunction original function node
     * @param modifiedFunction modified function node
     * @param kind the kind of node being compared
     */
    private void compareFunctionBodies(FunctionDefinitionNode originalFunction,
                                       FunctionDefinitionNode modifiedFunction,
                                       NodeKind kind) {
        FunctionBodyNode originalFunctionBody = originalFunction.functionBody();
        FunctionBodyNode modifiedFunctionBody = modifiedFunction.functionBody();
        compareFunctionBodies(modifiedFunction, originalFunctionBody, modifiedFunctionBody, kind);
    }

    /**
     * Compares the bodies of two functions to identify modifications and update
     * semantic diffs accordingly.
     *
     * @param modifiedFunction modified function node
     * @param originalFunctionBody original function body node
     * @param modifiedFunctionBody modified function body node
     * @param kind the kind of node being compared
     */
    private void compareFunctionBodies(NonTerminalNode modifiedFunction,
                                       FunctionBodyNode originalFunctionBody,
                                       FunctionBodyNode modifiedFunctionBody,
                                       NodeKind kind) {
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

        if (originalFunctionBody instanceof FunctionBodyBlockNode originalBodyNode
                && modifiedFunctionBody instanceof FunctionBodyBlockNode modifiedBodyNode) {
            if (originalBodyNode.statements().size() != modifiedBodyNode.statements().size()) {
                LineRange lineRange = modifiedFunction.lineRange();
                SemanticDiff diff = new SemanticDiff(ChangeType.MODIFICATION, kind,
                        resolveUri(lineRange.fileName()), lineRange);
                this.semanticDiffs.add(diff);
                return;
            }

            // TODO: analyze the do statement block for changes
            for (int i = 0; i < originalBodyNode.statements().size(); i++) {
                if (!originalBodyNode.statements().get(i).toSourceCode().equals(
                        modifiedBodyNode.statements().get(i).toSourceCode())) {
                    LineRange lineRange = modifiedFunction.lineRange();
                    SemanticDiff diff = new SemanticDiff(ChangeType.MODIFICATION, kind,
                            resolveUri(lineRange.fileName()), lineRange);
                    this.semanticDiffs.add(diff);
                    return;
                }
            }
        }
    }


    /**
     * Computes service differences between original and modified projects to identify
     * changes and update semantic diffs accordingly.
     *
     * <p>This method performs a detailed comparison of service declarations between the
     * original and modified projects. It identifies added, removed, and modified services,
     * and updates the semantic diffs list accordingly.
     * <p>The comparison process includes:
     * <ul>
     *     <li>Identifying services present in both projects and comparing their members</li>
     *     <li>Detecting newly added services in the modified project</li>
     *     <li>Setting the {@code loadDesignDiagrams} flag when structural changes are detected</li>
     * </ul>
     *
     * <p>Note: This method only detects additions and modifications. Service deletions
     * are not explicitly tracked in the current implementation.
     *
     * @param originalServiceMap original map of service names to their declaration nodes
     * @param modifiedServiceMap modified map of service names to their declaration nodes
     */
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
        Map<String, String> originalServiceBasePaths = extractServiceBasePaths(originalServiceMap);
        Map<String, String> modifiedServiceBasePaths = extractServiceBasePaths(modifiedServiceMap);

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

        if (modifiedServiceMap.isEmpty()) {
            return;
        }

        loadDesignDiagrams = true;
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

    /**
     * Analyzes modifications between two service declarations to identify changes
     * and update semantic diffs accordingly.
     *
     * <p>This method performs a detailed comparison of service members between the original
     * and modified service declarations. It extracts service members (remote methods,
     * resource methods, and object methods) from both services using the ServiceMethodExtractor
     * and compares them to detect structural and behavioral changes.
     *
     * <p>The comparison process includes:
     * <ul>
     * <li>Extracting all service members from both original and modified services</li>
     * <li>Comparing function bodies of existing members to detect modifications</li>
     * <li>Identifying newly added members in the modified service</li>
     * <li>Setting the {@code loadDesignDiagrams} flag when structural changes are detected</li>
     * </ul>
     *
     * <p>Note: This method only detects additions and modifications. Service member
     * deletions are not explicitly tracked in the current implementation.
     *
     * @param originalService the service declaration from the original project
     * @param modifiedService the service declaration from the modified project
     */
    private void analyzeServiceModifications(ServiceDeclarationNode originalService,
                                             ServiceDeclarationNode modifiedService) {
        ServiceMemberMap original = extractServiceMembers(originalService);
        ServiceMemberMap modified = extractServiceMembers(modifiedService);

        analyzeMethodChanges(original.getRemoteMethods(), modified.getRemoteMethods());
        analyzeMethodChanges(original.getResourceMethods(), modified.getResourceMethods());
        analyzeMethodChanges(original.getObjectMethods(), modified.getObjectMethods());
    }

    /**
     * Analyzes method changes between original and modified method maps.
     *
     * @param originalMethods Map of original method names to their definition nodes
     * @param modifiedMethods Map of modified method names to their definition nodes
     */
    private void analyzeMethodChanges(Map<String, FunctionDefinitionNode> originalMethods,
                                      Map<String, FunctionDefinitionNode> modifiedMethods) {
        modifiedMethods.forEach((key, modifiedMethod) -> {
            if (originalMethods.containsKey(key)) {
                FunctionDefinitionNode originalMethod = originalMethods.get(key);
                compareFunctionBodies(originalMethod, modifiedMethod, NodeKind.OBJECT_FUNCTION);
            } else {
                // New method added
                LineRange lineRange = modifiedMethod.lineRange();
                SemanticDiff diff = new SemanticDiff(ChangeType.ADDITION, NodeKind.OBJECT_FUNCTION,
                        resolveUri(lineRange.fileName()), lineRange);
                this.semanticDiffs.add(diff);
                loadDesignDiagrams = true;
            }
        });
    }

    /**
     * Extracts service members from a given service declaration node.
     *
     * @param service the service declaration node to extract members from
     * @return a ServiceMemberMap containing the extracted service members
     */
    private ServiceMemberMap extractServiceMembers(ServiceDeclarationNode service) {
        ServiceMemberMap serviceMemberMap = new ServiceMemberMap();
        ServiceMethodExtractor extractor = new ServiceMethodExtractor(serviceMemberMap);
        service.accept(extractor);
        return serviceMemberMap;
    }

    /**
     * Collects a map of document names to Document objects from the given project.
     *
     * @param project the Ballerina project to collect documents from
     * @return a map of document names to Document objects
     */
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

    /**
     * Extracts base paths from service names in the given service map.
     *
     * @param serviceMap map of service names to their declaration nodes
     * @return a map of service base paths to full service names
     */
    private Map<String, String> extractServiceBasePaths(Map<String, ServiceDeclarationNode> serviceMap) {
        Map<String, String> serviceBasePaths = new HashMap<>();
        for (String serviceName : serviceMap.keySet()) {
            String basePath = serviceName.split("#")[0];
            serviceBasePaths.put(basePath, serviceName);
        }
        return serviceBasePaths;
    }

    private void compareUsingDesignDiagrams() {
        SemanticDiff diff = new SemanticDiff(ChangeType.MODIFICATION, NodeKind.TYPE_DEFINITION,
                "", null);
        this.semanticDiffs.add(diff);
    }

    private String resolveUri(String fileName) {
        Path filePath = Path.of(rootProjectPath).resolve(fileName);
        return "ai"+ filePath.toUri().toString().substring(4);
    }
}
