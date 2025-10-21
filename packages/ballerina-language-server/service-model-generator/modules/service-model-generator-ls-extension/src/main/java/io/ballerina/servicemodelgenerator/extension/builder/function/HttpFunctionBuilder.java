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
import io.ballerina.compiler.syntax.tree.DefaultableParameterNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.FunctionSignatureNode;
import io.ballerina.compiler.syntax.tree.NodeFactory;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.ParameterNode;
import io.ballerina.compiler.syntax.tree.RequiredParameterNode;
import io.ballerina.compiler.syntax.tree.ReturnTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.modelgenerator.commons.Annotation;
import io.ballerina.modelgenerator.commons.ServiceDatabaseManager;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.FunctionReturnType;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.util.Constants;
import io.ballerina.servicemodelgenerator.extension.util.HttpUtil;
import io.ballerina.servicemodelgenerator.extension.util.ServiceClassUtil;
import io.ballerina.servicemodelgenerator.extension.util.Utils;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.BALLERINA;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.HTTP;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.OBJECT_METHOD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.RESOURCE;
import static io.ballerina.servicemodelgenerator.extension.util.HttpUtil.getHttpParameterType;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getPath;
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

    @Override
    public Optional<Function> getModelTemplate(GetModelContext context) {
        return getHttpResourceModel();
    }

    @Override
    public Function getModelFromSource(ModelFromSourceContext context) {
        FunctionDefinitionNode functionDefinitionNode = (FunctionDefinitionNode) context.node();
        boolean isResource = functionDefinitionNode.qualifierList().stream()
                .anyMatch(qualifier -> qualifier.text().equals(RESOURCE));
        if (isResource) {
            return getEnrichedResourceModel(functionDefinitionNode, context.semanticModel());
        }
        Function functionModel = getObjectFunctionFromSource(ServiceClassUtil.ServiceClassContext.SERVICE_DIAGRAM,
                functionDefinitionNode, context.semanticModel());
        functionModel.setEditable(true);
        return functionModel;
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

        parameters.forEach(parameterNode -> {
            Optional<Parameter> param = getParameterModel(parameterNode);
            if (param.isEmpty()) {
                return;
            }
            Parameter parameterModel = param.get();
            Optional<String> httpParameterType = getHttpParameterType(getParamAnnotations(parameterNode));
            if (httpParameterType.isPresent()) {
                parameterModel.setHttpParamType(httpParameterType.get());
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
                            parameterModel.setHttpParamType(Constants.HTTP_PARAM_TYPE_PAYLOAD);
                            parameterModel.setEditable(true);
                            parameterModels.add(parameterModel);
                            return;
                        }
                    }

                    parameterModel.setHttpParamType(Constants.HTTP_PARAM_TYPE_QUERY);
                    parameterModel.setEditable(true);
                }
            }
            parameterModels.add(parameterModel);
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

    private static NodeList<AnnotationNode> getParamAnnotations(ParameterNode parameterNode) {
        if (parameterNode instanceof RequiredParameterNode requiredParam) {
            return requiredParam.annotations();
        } else if (parameterNode instanceof DefaultableParameterNode defaultableParam) {
            return defaultableParam.annotations();
        }
        return NodeFactory.createEmptyNodeList();
    }
}
