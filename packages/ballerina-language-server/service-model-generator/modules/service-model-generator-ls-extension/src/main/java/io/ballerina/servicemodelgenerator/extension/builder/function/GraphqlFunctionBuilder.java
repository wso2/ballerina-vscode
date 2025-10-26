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
import io.ballerina.servicemodelgenerator.extension.model.context.AddModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import io.ballerina.servicemodelgenerator.extension.util.Constants;
import io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils;
import io.ballerina.servicemodelgenerator.extension.util.Utils;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL_CONTEXT;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL_CONTEXT_KEY;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL_FIELD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL_FIELD_KEY;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_DEFAULT;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_DEFAULTABLE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_MUTATION;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_QUERY;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_REQUIRED;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_SUBSCRIPTION;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.REMOTE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SUBSCRIBE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_EXPRESSION;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.BALLERINA;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.OBJECT_METHOD;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceClassUtil.ServiceClassContext.GRAPHQL_DIAGRAM;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceClassUtil.ServiceClassContext.SERVICE_DIAGRAM;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getPath;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.isInitFunction;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.updateAnnotationAttachmentProperty;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.updateFunctionDocs;
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
        return getGraphqlFunctionModel(context.functionType());
    }

    @Override
    public Map<String, List<TextEdit>> addModel(AddModelContext context) throws Exception {
        updateAdvanceParameters(context.function());
        return buildModel(context);
    }

    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        updateAdvanceParameters(context.function());
        return buildUpdateModel(context);
    }

    @Override
    public Function getModelFromSource(ModelFromSourceContext context) {
        ServiceDatabaseManager databaseManager = ServiceDatabaseManager.getInstance();
        List<Annotation> annotationAttachments = databaseManager.
                getAnnotationAttachments(BALLERINA, GRAPHQL, OBJECT_METHOD);
        Map<String, Value> annotations = Function.createAnnotationsMap(annotationAttachments);
        Function actualFuncModel = getGraphqlFunctionModelFromNode((FunctionDefinitionNode) context.node(),
                annotations, context.semanticModel());
        actualFuncModel.setEditable(true);

        if (actualFuncModel.getKind().equals(KIND_QUERY) || actualFuncModel.getKind().equals(KIND_SUBSCRIPTION)) {
            Optional<Function> commonFuncModel = getGraphqlFunctionModel(actualFuncModel.getKind());
            if (commonFuncModel.isPresent()) {
                Function commonFunction = commonFuncModel.get();
                updateFunctionInfo(commonFunction, actualFuncModel);
                return commonFunction;
            }
        } else if (actualFuncModel.getKind().equals(KIND_MUTATION)) {
            Optional<Function> resourceFunctionOp = getGraphqlFunctionModel(KIND_MUTATION);
            if (resourceFunctionOp.isPresent()) {
                Function resourceFunction = resourceFunctionOp.get();
                updateFunctionInfo(resourceFunction, actualFuncModel);
                return resourceFunction;
            }
        } else {
            actualFuncModel.getAccessor().setEnabled(false);
        }
        return actualFuncModel;
    }

    @Override
    public String kind() {
        return GRAPHQL;
    }

    private static Optional<Function> getGraphqlFunctionModel(String functionType) {
        InputStream resourceStream = Utils.class.getClassLoader()
                .getResourceAsStream(String.format(GRAPHQL_FUNCTION_MODEL_LOCATION,
                        functionType.toLowerCase(Locale.getDefault())));
        if (resourceStream == null) {
            return Optional.empty();
        }

        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            return Optional.of(new Gson().fromJson(reader, Function.class));
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    private static void updateFunctionInfo(Function commonFuncModel, Function actualFunction) {
        commonFuncModel.setEditable(actualFunction.isEditable());
        commonFuncModel.setEnabled(true);
        commonFuncModel.setKind(actualFunction.getKind());
        commonFuncModel.setDocumentation(actualFunction.getDocumentation());
        commonFuncModel.setCodedata(actualFunction.getCodedata());
        updateValue(commonFuncModel.getAccessor(), actualFunction.getAccessor());
        updateValue(commonFuncModel.getName(), actualFunction.getName());
        updateValue(commonFuncModel.getReturnType(), actualFunction.getReturnType());
        Set<String> existingTypes = commonFuncModel.getParameters().stream()
                .map(parameter -> parameter.getType().getValue())
                .collect(Collectors.toSet());
        actualFunction.getParameters().stream()
                .filter(commonParam -> !existingTypes.contains(commonParam.getType().getValue()))
                .forEach(commonFuncModel::addParameter);
        actualFunction.getProperties().forEach(commonFuncModel::addProperty);
    }

    public static Function getGraphqlFunctionModelFromNode(FunctionDefinitionNode functionDefinitionNode,
                                                           Map<String, Value> annotations,
                                                           SemanticModel semanticModel) {
        Function functionModel = getFunctionModel(functionDefinitionNode);
        annotations.forEach(functionModel::addProperty);
        FunctionSignatureNode functionSignatureNode = functionDefinitionNode.functionSignature();
        Optional<ReturnTypeDescriptorNode> returnTypeDesc = functionSignatureNode.returnTypeDesc();
        if (returnTypeDesc.isPresent()) {
            FunctionReturnType returnType = functionModel.getReturnType();
            returnType.setValue(returnTypeDesc.get().type().toString().trim());
            // Check for GraphQL ID annotation on return type
            ServiceModelUtils.setGraphqlIdForReturnType(returnType, functionDefinitionNode, semanticModel);
        }
        updateGraphqlParameters(functionSignatureNode, functionModel, semanticModel);
        functionModel.setCodedata(new Codedata(functionDefinitionNode.lineRange(), GRAPHQL, BALLERINA));
        functionModel.setCanAddParameters(true);
        updateAnnotationAttachmentProperty(functionDefinitionNode, functionModel);
        updateFunctionDocs(functionDefinitionNode, functionModel);
        return functionModel;
    }

    public static Optional<Parameter> getGraphqlParameterModel(ParameterNode parameterNode,
                                                               SemanticModel semanticModel) {
        if (parameterNode instanceof RequiredParameterNode parameter) {
            if (parameter.paramName().isEmpty()) {
                return Optional.empty();
            }
            String paramName = parameter.paramName().get().text().trim();
            Parameter parameterModel = createGraphqlParameter(paramName, KIND_REQUIRED,
                    parameter.typeName().toString().trim());
            // Check for GraphQL ID annotation
            ServiceModelUtils.setGraphqlIdForParameter(parameterModel, parameter, semanticModel);
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
            // Check for GraphQL ID annotation
            ServiceModelUtils.setGraphqlIdForParameter(parameterModel, parameter, semanticModel);
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

    private static List<Parameter> getGraphqlParameterNodelList(FunctionSignatureNode functionSignatureNode,
                                                                SemanticModel semanticModel) {
        SeparatedNodeList<ParameterNode> parameters = functionSignatureNode.parameters();
        List<Parameter> parameterModels = new ArrayList<>();
        parameters.forEach(parameterNode -> {
            Optional<Parameter> parameterModel = getGraphqlParameterModel(parameterNode, semanticModel);
            parameterModel.ifPresent(parameterModels::add);
        });
        return parameterModels;
    }

    private static void updateGraphqlParameters(FunctionSignatureNode functionSignatureNode, Function functionModel,
                                                SemanticModel semanticModel) {
        List<Parameter> parameterModels = getGraphqlParameterNodelList(functionSignatureNode, semanticModel);
        for (Parameter parameterModel : parameterModels) {
            String paramName = parameterModel.getName().getValue();
            if ((paramName.equals(GRAPHQL_CONTEXT) || paramName.equals(GRAPHQL_FIELD)) && parameterModel.isEnabled()) {
                String propertyName = paramName.equals(GRAPHQL_CONTEXT) ? GRAPHQL_CONTEXT_KEY : GRAPHQL_FIELD_KEY;
                if (Objects.nonNull(functionModel.getProperty(propertyName))) {
                    functionModel.getParameters().stream().filter(
                            parameter -> parameter.getName().getValue().equals(paramName)).findFirst().ifPresent(
                                    parameter -> parameter.setEnabled(true));
                    functionModel.getProperty(propertyName).setValue(true);
                }
            } else {
                functionModel.addParameter(parameterModel);
            }
        }
    }

    public static Function getFunctionModel(FunctionDefinitionNode functionDefinitionNode) {
        Function functionModel;
        if (isInitFunction(functionDefinitionNode)) {
            functionModel = Function.getNewFunctionModel(SERVICE_DIAGRAM);
            functionModel.setKind(KIND_DEFAULT);
        } else {
            String functionKind = getFunctionKind(functionDefinitionNode);
            Optional<Function> function = getGraphqlFunctionModel(functionKind);
            functionModel = function.orElseGet(() -> Function.getNewFunctionModel(GRAPHQL_DIAGRAM));
        }
        if (functionModel.getKind().equals(KIND_QUERY) || functionModel.getKind().equals(KIND_SUBSCRIPTION)) {
            functionModel.getName().setValue(getPath(functionDefinitionNode.relativeResourcePath()));
        } else {
            functionModel.getName().setValue(functionDefinitionNode.functionName().text().trim());
        }
        return functionModel;
    }

    public static String getFunctionKind(FunctionDefinitionNode functionDefinitionNode) {
        for (Token qualifier : functionDefinitionNode.qualifierList()) {
            String qualifierText = qualifier.text().trim();
            if (qualifierText.matches(REMOTE)) {
                return KIND_MUTATION;
            } else if (qualifierText.matches(Constants.RESOURCE)) {
                String accessor = functionDefinitionNode.functionName().text().trim();
                return accessor.equals(SUBSCRIBE) ? KIND_SUBSCRIPTION : KIND_QUERY;
            }
        }
        return KIND_DEFAULT;
    }

    private static void updateAdvanceParameters(Function function) {
        function.getParameters().forEach(parameter -> {
            if (parameter.getName().getValue().equals(GRAPHQL_CONTEXT) &&
                    Objects.nonNull(function.getProperty(GRAPHQL_CONTEXT_KEY))) {
                Object value = function.getProperty(GRAPHQL_CONTEXT_KEY).getValueAsObject();
                boolean isEnabled = value instanceof Boolean ? (Boolean) value : false;
                parameter.setEnabled(isEnabled);
            } else if (parameter.getName().getValue().equals(GRAPHQL_FIELD) &&
                        Objects.nonNull(function.getProperty(GRAPHQL_FIELD_KEY))) {
                Object value = function.getProperty(GRAPHQL_FIELD_KEY).getValueAsObject();
                boolean isEnabled = value instanceof Boolean ? (Boolean) value : false;
                parameter.setEnabled(isEnabled);
            }
        });
    }
}
