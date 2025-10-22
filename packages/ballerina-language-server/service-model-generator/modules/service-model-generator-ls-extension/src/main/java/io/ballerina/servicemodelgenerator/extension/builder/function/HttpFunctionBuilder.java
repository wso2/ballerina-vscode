/*
 *  Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com)
 *
 *  WSO2 LLC. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

package io.ballerina.servicemodelgenerator.extension.builder.function;

import com.google.gson.Gson;
import com.google.gson.stream.JsonReader;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.Types;
import io.ballerina.compiler.api.symbols.MapTypeSymbol;
import io.ballerina.compiler.api.symbols.ParameterSymbol;
import io.ballerina.compiler.api.symbols.ResourceMethodSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.syntax.tree.AnnotationNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.FunctionSignatureNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.ParameterNode;
import io.ballerina.compiler.syntax.tree.ReturnTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.TypeDescriptorNode;
import io.ballerina.modelgenerator.commons.Annotation;
import io.ballerina.modelgenerator.commons.ServiceDatabaseManager;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.FunctionReturnType;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import io.ballerina.servicemodelgenerator.extension.util.HttpUtil;
import io.ballerina.servicemodelgenerator.extension.util.Utils;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.tools.text.LineRange;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.BALLERINA;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.HTTP;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.HTTP_PARAM_TYPE_PAYLOAD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.HTTP_PARAM_TYPE_QUERY;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.HTTP_SERVICE_TYPE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_INCLUDED_RECORD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.NEW_LINE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.NEW_LINE_WITH_TAB;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.OBJECT_METHOD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.RESOURCE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.TWO_NEW_LINES;
import static io.ballerina.servicemodelgenerator.extension.util.HttpUtil.generateHttpResourceDefinition;
import static io.ballerina.servicemodelgenerator.extension.util.HttpUtil.getHttpParamTypeAndSetHeaderName;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceClassUtil.ServiceClassContext.SERVICE_DIAGRAM;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.addParamAnnotationAsProperties;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getImportStmt;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getParamAnnotations;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getPath;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getVisibleSymbols;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.importExists;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.updateAnnotationAttachmentProperty;

/**
 * Represents the HTTP function builder of the service model generator.
 *
 * @since 1.2.0
 */
public class HttpFunctionBuilder extends AbstractFunctionBuilder {
    private static final String HTTP_FUNCTION_MODEL_LOCATION = "functions/http_%s.json";
    private static final String HTTP_REQUEST_TYPE = "http:Request";
    private static final String HTTP_CALLER_TYPE = "http:Caller";
    private static final String HTTP_HEADERS_TYPE = "http:Headers";
    private static final String HTTP_REQUEST_CONTEXT_TYPE = "http:RequestContext";

    private static final Map<String, String> HTTP_PARAM_TYPE_MAP = new HashMap<>() {{
        put("Payload", "PAYLOAD");
        put("Query", "QUERY");
        put("Header", "HEADER");
    }};

    @Override
    public Optional<Function> getModelTemplate(GetModelContext context) {
        return getHttpResourceModel();
    }

    @Override
    public Function getModelFromSource(ModelFromSourceContext context) {
        FunctionDefinitionNode funcDefNode = (FunctionDefinitionNode) context.node();
        boolean isResource = funcDefNode.qualifierList().stream().anyMatch(q -> q.text().equals(RESOURCE));
        if (isResource) {
            Function functionModel = getEnrichedResourceModel(funcDefNode, context.semanticModel());
            setResourceEditability(context, functionModel);
            return functionModel;
        }
        Function functionModel = getObjectFunctionFromSource(SERVICE_DIAGRAM, funcDefNode, context.semanticModel());
        functionModel.setEditable(true);
        return functionModel;
    }

    private static void setResourceEditability(ModelFromSourceContext context, Function functionModel) {
        if (context.node().parent() instanceof ServiceDeclarationNode serviceDeclarationNode) {
            Optional<TypeDescriptorNode> typeDescriptorNode = serviceDeclarationNode.typeDescriptor();
            if (typeDescriptorNode.isPresent()) {
                String serviceType = typeDescriptorNode.toString().trim();
                if (!HTTP_SERVICE_TYPE.equals(serviceType)) {
                    functionModel.setEditable(false);
                }
            }
        }
    }

    @Override
    public String kind() {
        return HTTP;
    }

    public static Function getEnrichedResourceModel(FunctionDefinitionNode functionDefinitionNode,
                                                    SemanticModel semanticModel) {
        ServiceDatabaseManager databaseManager = ServiceDatabaseManager.getInstance();
        List<Annotation> annotationAttachments = databaseManager.
                getAnnotationAttachments(BALLERINA, HTTP, OBJECT_METHOD);
        Map<String, Value> annotations = Function.createAnnotationsMap(annotationAttachments);
        Optional<Function> httpFunctionModel = getHttpResourceModel();
        if (httpFunctionModel.isEmpty()) {
            throw new RuntimeException("Failed to load HTTP resource function model");
        }
        Function functionModel = httpFunctionModel.get();
        annotations.forEach(functionModel::addProperty);
        functionModel.getAccessor().setValue(functionDefinitionNode.functionName().text().trim());
        functionModel.getName().setValue(getPath(functionDefinitionNode.relativeResourcePath()));

        FunctionSignatureNode functionSignatureNode = functionDefinitionNode.functionSignature();
        Optional<ReturnTypeDescriptorNode> returnTypeDesc = functionSignatureNode.returnTypeDesc();
        if (returnTypeDesc.isPresent()) {
            FunctionReturnType returnType = functionModel.getReturnType();
            returnType.setValue(returnTypeDesc.get().type().toString().trim());
            Optional<Symbol> functionDefSymbol = semanticModel.symbol(functionDefinitionNode);
            if (functionDefSymbol.isEmpty() || !(functionDefSymbol.get() instanceof ResourceMethodSymbol resource)) {
                throw new RuntimeException("Failed to get resource method symbol");
            }
            HttpUtil.populateHttpResponses(returnType, semanticModel, resource);
        }

        SeparatedNodeList<ParameterNode> parameters = functionSignatureNode.parameters();
        List<Parameter> parameterModels = functionModel.getParameters();

        Types types = semanticModel.types();
        MapTypeSymbol mapTypeSymbol = types.builder().MAP_TYPE.withTypeParam(types.ANYDATA).build();
        List<String> paramAnnotSkipList = List.of();
        parameters.forEach(parameterNode -> {
            Optional<Parameter> param = getParameterModel(parameterNode);
            if (param.isEmpty()) {
                return;
            }
            Parameter parameterModel = param.get();
            NodeList<AnnotationNode> paramAnnotations = getParamAnnotations(parameterNode);
            Optional<String> httpParameterType = getHttpParamTypeAndSetHeaderName(parameterModel, paramAnnotations);
            if (httpParameterType.isPresent()) {
                String httpParamType = httpParameterType.get();
                parameterModel.setHttpParamType(HTTP_PARAM_TYPE_MAP.getOrDefault(httpParamType, httpParamType));
            } else {
                String typeName = parameterModel.getType().getValue();
                if (typeName.equals(HTTP_REQUEST_TYPE)) {
                    Parameter parameter = parameterModels.get(0);
                    parameter.getName().setValue(parameterModel.getName().getValue());
                    parameter.setEnabled(true);
                    return;
                } else if (typeName.equals(HTTP_CALLER_TYPE)) {
                    Parameter parameter = parameterModels.get(1);
                    parameter.getName().setValue(parameterModel.getName().getValue());
                    parameter.setEnabled(true);
                    return;
                } else if (typeName.equals(HTTP_HEADERS_TYPE)) {
                    Parameter parameter = parameterModels.get(2);
                    parameter.getName().setValue(parameterModel.getName().getValue());
                    parameter.setEnabled(true);
                    return;
                }
                if (!typeName.equals(HTTP_REQUEST_CONTEXT_TYPE)) {
                    Optional<Symbol> paramSymbol = semanticModel.symbol(parameterNode);
                    if (paramSymbol.isPresent() && paramSymbol.get() instanceof ParameterSymbol parameterSymbol) {
                        TypeSymbol paramType = parameterSymbol.typeDescriptor();
                        if (paramType.subtypeOf(mapTypeSymbol)) {
                            parameterModel.setHttpParamType(HTTP_PARAM_TYPE_PAYLOAD);
                            parameterModel.setEditable(true);
                            parameterModels.add(parameterModel);
                            return;
                        }
                    }
                    parameterModel.setHttpParamType(HTTP_PARAM_TYPE_QUERY);
                    parameterModel.setEditable(true);
                }
            }

            if (parameterModel.getKind().equals(KIND_INCLUDED_RECORD)) {
                parameterModel.setEditable(false);
            }
            parameterModels.add(parameterModel);
            addParamAnnotationAsProperties(parameterModel, paramAnnotations, paramAnnotSkipList);
        });
        functionModel.setParameters(parameterModels);
        functionModel.setCodedata(new Codedata(functionDefinitionNode.lineRange()));
        functionModel.setCanAddParameters(true);
        updateAnnotationAttachmentProperty(functionDefinitionNode, functionModel);
        return functionModel;
    }

    private static Optional<Function> getHttpResourceModel() {
        InputStream resourceStream = Utils.class.getClassLoader()
                .getResourceAsStream(String.format(HTTP_FUNCTION_MODEL_LOCATION, RESOURCE));
        if (resourceStream == null) {
            return Optional.empty();
        }

        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            return Optional.of(new Gson().fromJson(reader, Function.class));
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    @Override
    public Map<String, List<TextEdit>> addModel(AddModelContext context) {
        Map<String, String> imports = new HashMap<>();
        List<String> newTypeDefinitions = new ArrayList<>();
        String functionNode = NEW_LINE_WITH_TAB + generateHttpResourceDefinition(context.function(),
                context.semanticModel(), context.document(), newTypeDefinitions, imports)
                .replace(NEW_LINE, NEW_LINE_WITH_TAB) + NEW_LINE;

        List<String> importStmts = new ArrayList<>();
        ModulePartNode rootNode = context.document().syntaxTree().rootNode();
        imports.values().forEach(moduleId -> {
            String[] importParts = moduleId.split("/");
            String orgName = importParts[0];
            String moduleName = importParts[1].split(":")[0];
            if (!importExists(rootNode, orgName, moduleName)) {
                importStmts.add(getImportStmt(orgName, moduleName));
            }
        });

        List<TextEdit> edits = new ArrayList<>();
        if (!importStmts.isEmpty()) {
            String importsStmts = String.join(NEW_LINE, importStmts);
            edits.add(new TextEdit(Utils.toRange(rootNode.lineRange().startLine()), importsStmts));
        }

        ServiceDeclarationNode serviceDeclarationNode = (ServiceDeclarationNode) context.node();
        NodeList<Node> members = serviceDeclarationNode.members();
        LineRange functionLineRange = members.isEmpty() ? serviceDeclarationNode.openBraceToken().lineRange() :
                members.get(members.size() - 1).lineRange();
        edits.add(new TextEdit(Utils.toRange(functionLineRange.endLine()), functionNode));

        if (!newTypeDefinitions.isEmpty()) {
            String newTypeDefinition = String.join(TWO_NEW_LINES, newTypeDefinitions);
            edits.add(new TextEdit(Utils.toRange(serviceDeclarationNode.lineRange().endLine()), newTypeDefinition));
        }
        return Map.of(context.filePath(), edits);
    }

    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        List<TextEdit> edits = new ArrayList<>();
        FunctionDefinitionNode functionDefinitionNode = context.functionNode();
        Utils.addFunctionAnnotationTextEdits(context.function(), functionDefinitionNode, edits, new HashMap<>());

        String functionName = functionDefinitionNode.functionName().text().trim();
        LineRange nameRange = functionDefinitionNode.functionName().lineRange();
        String newFunctionName = context.function().getName().getValue();

        if (!functionName.equals(context.function().getAccessor().getValue())) {
            edits.add(new TextEdit(Utils.toRange(nameRange), context.function().getAccessor().getValue()));
        }

        NodeList<Node> path = functionDefinitionNode.relativeResourcePath();
        if (Objects.nonNull(path) && !newFunctionName.equals(getPath(path))) {
            LinePosition startPos = path.get(0).lineRange().startLine();
            LinePosition endPos = path.get(path.size() - 1).lineRange().endLine();
            LineRange lineRange = context.function().getCodedata().getLineRange();
            LineRange pathLineRange = LineRange.from(lineRange.fileName(), startPos, endPos);
            TextEdit pathEdit = new TextEdit(Utils.toRange(pathLineRange), newFunctionName);
            edits.add(pathEdit);
        }


        Map<String, String> imports = new HashMap<>();
        List<String> newStatusCodeTypesDef = new ArrayList<>();
        Set<String> visibleSymbols = getVisibleSymbols(context.semanticModel(), context.document());
        String functionSignature = HttpUtil.generateHttpResourceSignature(context.function(), newStatusCodeTypesDef,
                imports, visibleSymbols, false);

        List<String> importStmts = new ArrayList<>();
        ModulePartNode rootNode = context.document().syntaxTree().rootNode();
        imports.values().forEach(moduleId -> {
            String[] importParts = moduleId.split("/");
            String orgName = importParts[0];
            String moduleName = importParts[1].split(":")[0];
            if (!importExists(rootNode, orgName, moduleName)) {
                importStmts.add(getImportStmt(orgName, moduleName));
            }
        });

        if (!importStmts.isEmpty()) {
            String importsStmt = String.join(NEW_LINE, importStmts);
            edits.addFirst(new TextEdit(Utils.toRange(rootNode.lineRange().startLine()), importsStmt));
        }

        LineRange signatureRange = functionDefinitionNode.functionSignature().lineRange();
        edits.add(new TextEdit(Utils.toRange(signatureRange), functionSignature));

        if (!newStatusCodeTypesDef.isEmpty() &&
                functionDefinitionNode.parent() instanceof ServiceDeclarationNode serviceNode) {
            String statusCodeResEdits = String.join(TWO_NEW_LINES, newStatusCodeTypesDef);
            edits.add(new TextEdit(Utils.toRange(serviceNode.closeBraceToken().lineRange().endLine()),
                    NEW_LINE + statusCodeResEdits));
        }
        return Map.of(context.filePath(), edits);
    }
}
