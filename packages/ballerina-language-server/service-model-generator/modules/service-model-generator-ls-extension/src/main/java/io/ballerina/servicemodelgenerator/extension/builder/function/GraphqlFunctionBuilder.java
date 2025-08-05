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
import io.ballerina.compiler.syntax.tree.DefaultableParameterNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.FunctionSignatureNode;
import io.ballerina.compiler.syntax.tree.ParameterNode;
import io.ballerina.compiler.syntax.tree.RequiredParameterNode;
import io.ballerina.compiler.syntax.tree.ReturnTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.Token;
import io.ballerina.modelgenerator.commons.Annotation;
import io.ballerina.modelgenerator.commons.ServiceDatabaseManager;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.FunctionReturnType;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.util.Constants;
import io.ballerina.servicemodelgenerator.extension.util.Utils;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_DEFAULT;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_DEFAULTABLE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_MUTATION;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_QUERY;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_REQUIRED;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_RESOURCE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_SUBSCRIPTION;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.REMOTE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SUBSCRIBE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_EXPRESSION;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_IDENTIFIER;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.BALLERINA;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.OBJECT_METHOD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.RESOURCE;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceClassUtil.ServiceClassContext.GRAPHQL_DIAGRAM;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceClassUtil.ServiceClassContext.SERVICE_DIAGRAM;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getPath;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.isInitFunction;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.updateAnnotationAttachmentProperty;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.updateValue;

/**
 * Represents the GraphQL function builder of the service model generator.
 *
 * @since 1.2.0
 */
public class GraphqlFunctionBuilder extends AbstractFunctionBuilder {
    private static final String GRAPHQL_FUNCTION_MODEL_LOCATION = "functions/graphql_%s.json";

    @Override
    public Optional<Function> getModelTemplate(GetModelContext context) {
        String resourcePath =  String.format(GRAPHQL_FUNCTION_MODEL_LOCATION, context.functionType());
        InputStream resourceStream = Utils.class.getClassLoader().getResourceAsStream(resourcePath);
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
    public Function getModelFromSource(ModelFromSourceContext context) {
        ServiceDatabaseManager databaseManager = ServiceDatabaseManager.getInstance();
        List<Annotation> annotationAttachments = databaseManager.
                getAnnotationAttachments(BALLERINA, GRAPHQL, OBJECT_METHOD);
        Map<String, Value> annotations = Function.createAnnotationsMap(annotationAttachments);
        Function functionModel = getGraphqlFunctionModel((FunctionDefinitionNode) context.node(), annotations);
        functionModel.setEditable(true);

        if (functionModel.getKind().equals(KIND_RESOURCE)) {
            Optional<Function> resourceFunctionOp = getGraphqlResourceModel(RESOURCE);
            if (resourceFunctionOp.isPresent()) {
                Function resourceFunction = resourceFunctionOp.get();
                if (resourceFunction.getReturnType().getResponses().size() > 1) {
                    resourceFunction.getReturnType().getResponses().remove(1);
                }
                updateFunctionInfo(resourceFunction, functionModel);
                return resourceFunction;
            }
        } else {
            functionModel.setAnnotations(null);
            functionModel.getAccessor().setEnabled(false);
        }
        return functionModel;
    }

    @Override
    public String kind() {
        return GRAPHQL;
    }

    private static Optional<Function> getGraphqlResourceModel(String functionType) {
        InputStream resourceStream = Utils.class.getClassLoader()
                .getResourceAsStream(String.format(GRAPHQL_FUNCTION_MODEL_LOCATION, functionType));
        if (resourceStream == null) {
            return Optional.empty();
        }

        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            return Optional.of(new Gson().fromJson(reader, Function.class));
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    private static void updateFunctionInfo(Function functionModel, Function commonFunction) {
        functionModel.setEditable(commonFunction.isEditable());
        functionModel.setEnabled(true);
        functionModel.setKind(commonFunction.getKind());
        functionModel.setCodedata(commonFunction.getCodedata());
        updateValue(functionModel.getAccessor(), commonFunction.getAccessor());
        updateValue(functionModel.getName(), commonFunction.getName());
        updateValue(functionModel.getReturnType(), commonFunction.getReturnType());
        Set<String> existingTypes = functionModel.getParameters().stream()
                .map(parameter -> parameter.getType().getValue())
                .collect(Collectors.toSet());
        commonFunction.getParameters().stream()
                .filter(commonParam -> !existingTypes.contains(commonParam.getType().getValue()))
                .forEach(functionModel::addParameter);
    }

    public static Function getGraphqlFunctionModel(FunctionDefinitionNode functionDefinitionNode,
                                                   Map<String, Value> annotations) {
        Function functionModel;
        if (isInitFunction(functionDefinitionNode)) {
            functionModel = Function.getNewFunctionModel(SERVICE_DIAGRAM);
            functionModel.setKind(KIND_DEFAULT);
        } else {
            functionModel = Function.getNewFunctionModel(GRAPHQL_DIAGRAM);
        }
        functionModel.setAnnotations(annotations);

        Value functionName = functionModel.getName();
        functionName.setValue(functionDefinitionNode.functionName().text().trim());
        functionName.setValueType(VALUE_TYPE_IDENTIFIER);

        setKind(functionDefinitionNode, functionModel);

        FunctionSignatureNode functionSignatureNode = functionDefinitionNode.functionSignature();
        Optional<ReturnTypeDescriptorNode> returnTypeDesc = functionSignatureNode.returnTypeDesc();
        if (returnTypeDesc.isPresent()) {
            FunctionReturnType returnType = functionModel.getReturnType();
            returnType.setValue(returnTypeDesc.get().type().toString().trim());
        }

        List<Parameter> parameterModels = getGraphqlParameterModelList(functionSignatureNode);

        functionModel.setParameters(parameterModels);
        functionModel.setCodedata(new Codedata(functionDefinitionNode.lineRange()));
        functionModel.setCanAddParameters(true);
        updateAnnotationAttachmentProperty(functionDefinitionNode, functionModel);
        return functionModel;
    }

    public static Optional<Parameter> getGraphqlParameterModel(ParameterNode parameterNode) {
        if (parameterNode instanceof RequiredParameterNode parameter) {
            if (parameter.paramName().isEmpty()) {
                return Optional.empty();
            }
            String paramName = parameter.paramName().get().text().trim();
            Parameter parameterModel = createGraphqlParameter(paramName, KIND_REQUIRED,
                    parameter.typeName().toString().trim());
            return Optional.of(parameterModel);
        } else if (parameterNode instanceof DefaultableParameterNode parameter) {
            if (parameter.paramName().isEmpty()) {
                return Optional.empty();
            }
            String paramName = parameter.paramName().get().text().trim();
            Parameter parameterModel = createGraphqlParameter(paramName, KIND_DEFAULTABLE,
                    parameter.typeName().toString().trim());
            Value defaultValue = parameterModel.getDefaultValue();
            defaultValue.setValue(parameter.expression().toString().trim());
            defaultValue.setValueType(VALUE_TYPE_EXPRESSION);
            defaultValue.setEnabled(true);
            return Optional.of(parameterModel);
        }
        return Optional.empty();
    }

    private static Parameter createGraphqlParameter(String paramName, String paramKind, String typeName) {
        Parameter parameterModel = Parameter.getNewGraphqlParameter();
        parameterModel.setMetadata(new MetaData(paramName, paramName));
        parameterModel.setKind(paramKind);
        parameterModel.getType().setValue(typeName);
        parameterModel.getName().setValue(paramName);
        return parameterModel;
    }

    private static void setKind(FunctionDefinitionNode functionDefinitionNode, Function functionModel) {
        Value accessor = functionModel.getAccessor();
        for (Token qualifier : functionDefinitionNode.qualifierList()) {
            String qualifierText = qualifier.text().trim();
            if (qualifierText.matches(REMOTE)) {
                functionModel.setKind(KIND_MUTATION);
                break;
            } else if (qualifierText.matches(Constants.RESOURCE)) {
                functionModel.setKind(functionModel.getName().getValue().equals(SUBSCRIBE) ? KIND_SUBSCRIPTION :
                        KIND_QUERY);
                accessor.setValue(functionDefinitionNode.functionName().text().trim());
                functionModel.getName().setValue(getPath(functionDefinitionNode.relativeResourcePath()));
                break;
            }
        }
    }

    private static List<Parameter> getGraphqlParameterModelList(FunctionSignatureNode functionSignatureNode) {
        SeparatedNodeList<ParameterNode> parameters = functionSignatureNode.parameters();
        List<Parameter> parameterModels = new ArrayList<>();
        parameters.forEach(parameterNode -> {
            Optional<Parameter> parameterModel = getGraphqlParameterModel(parameterNode);
            parameterModel.ifPresent(parameterModels::add);
        });
        return parameterModels;
    }
}
