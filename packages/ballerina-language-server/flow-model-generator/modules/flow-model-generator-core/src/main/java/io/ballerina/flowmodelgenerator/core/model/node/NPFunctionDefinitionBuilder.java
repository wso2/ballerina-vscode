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

package io.ballerina.flowmodelgenerator.core.model.node;

import com.google.gson.Gson;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.flowmodelgenerator.core.Constants.NaturalFunctions;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.FormBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.FunctionDataBuilder;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.projects.Package;
import io.ballerina.tools.text.LineRange;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.modelgenerator.commons.ParameterData.Kind.REQUIRED;

/**
 * Represents the properties of a Natural programming function definition node.
 *
 * @since 1.0.0
 */
public class NPFunctionDefinitionBuilder extends FunctionDefinitionBuilder {

    public static final String LABEL = "Natural Function";
    public static final String DESCRIPTION = "Define a natural function";
    public static final String NATURAL_FUNCTION_PREFIX = "naturalFunction";

    public static final String NATURAL_FUNCTION_NAME_DESCRIPTION = "Name of the natural function";
    public static final String NATURAL_FUNCTION_NAME_LABEL = "Name";

    public static final String PARAMETERS_LABEL = "Parameters";
    public static final String PARAMETERS_DOC = "Function parameters";

    private static final String CALL_LLM_FUNCTION = "callLlm";
    private static final String GET_DEFAULT_MODEL_PROVIDER_FUNCTION = "getDefaultModelProvider";

    private static final List<String> MODEL_PROVIDER_OPTIONS = List.of(
            NaturalFunctions.DEFAULT_MODEL_PROVIDER_WSO2,
            NaturalFunctions.ACCEPT_AS_PARAMETER
    );

    private static final Gson gson = new Gson();

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata()
                .node(NodeKind.NP_FUNCTION_DEFINITION)
                .org(NaturalFunctions.BALLERINA_ORG)
                .module(NaturalFunctions.AI_PACKAGE);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        Codedata codedata = context.codedata();

        // Create and set the resolved package for the function
        Optional<Package> resolvedPackage = PackageUtil.safeResolveModulePackage(
                NaturalFunctions.BALLERINA_ORG, NaturalFunctions.AI_PACKAGE);

        FunctionDataBuilder functionDataBuilder = new FunctionDataBuilder()
                .parentSymbolType(codedata.object())
                .name(GET_DEFAULT_MODEL_PROVIDER_FUNCTION)
                .moduleInfo(new ModuleInfo(
                        NaturalFunctions.BALLERINA_ORG,
                        NaturalFunctions.AI_PACKAGE,
                        NaturalFunctions.AI_PACKAGE,
                        null))
                .lsClientLogger(context.lsClientLogger())
                .functionResultKind(FunctionData.Kind.FUNCTION)
                .userModuleInfo(moduleInfo)
                .resolvedPackage(resolvedPackage.orElse(null));

        functionDataBuilder.build();

        properties().functionNameTemplate(NATURAL_FUNCTION_PREFIX,
                context.getAllVisibleSymbolNames(),
                NATURAL_FUNCTION_NAME_LABEL,
                NATURAL_FUNCTION_NAME_DESCRIPTION);
        setMandatoryProperties(this, null);
        endOptionalProperties(this);

        // prompt
        properties().custom()
                    .metadata()
                        .label(NaturalFunctions.PROMPT_LABEL)
                        .description(NaturalFunctions.PROMPT_DESCRIPTION)
                        .stepOut()
                    .codedata()
                        .kind(REQUIRED.name())
                        .stepOut()
                    .placeholder("")
                    .value("")
                    .type(Property.ValueType.RAW_TEMPLATE, NaturalFunctions.MODULE_PREFIXED_PROMPT_TYPE)
                    .editable()
                    .hidden()
                    .stepOut()
                    .addProperty(NaturalFunctions.PROMPT);

        // Model provider
        properties().custom()
                .metadata()
                    .label(NaturalFunctions.MODEL_PROVIDER_LABEL)
                    .description(NaturalFunctions.MODEL_PROVIDER_DESCRIPTION)
                    .stepOut()
                .codedata()
                    .kind(REQUIRED.name())
                    .stepOut()
                .type(Property.ValueType.EXPRESSION, null)
                .value(null)
                .editable()
                .hidden()
                .stepOut()
                .addProperty(NaturalFunctions.MODEL_PROVIDER);

        // Model provider as a parameter
        properties().custom()
                .codedata()
                    .kind(REQUIRED.name())
                    .stepOut()
                .type(Property.ValueType.FLAG)
                .value(false)
                .editable()
                .hidden()
                .stepOut()
                .addProperty(NaturalFunctions.MODEL_PROVIDER_AS_PARAMETER_KEY);
    }

    public static void setMandatoryProperties(NodeBuilder nodeBuilder, String returnType) {
        nodeBuilder.properties()
                .returnType(returnType, null, true)
                .nestedProperty();
    }

    public static void endOptionalProperties(NodeBuilder nodeBuilder) {
        nodeBuilder.properties()
                .endNestedProperty(Property.ValueType.REPEATABLE_PROPERTY, Property.PARAMETERS_KEY, PARAMETERS_LABEL,
                        PARAMETERS_DOC, getParameterSchema(), true, false);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        FlowNode flowNode = sourceBuilder.flowNode;

        Boolean isNew = flowNode.codedata().isNew();
        Optional<Property> functionNameProp = sourceBuilder.getProperty(Property.FUNCTION_NAME_KEY);
        if (functionNameProp.isEmpty()) {
            throw new IllegalStateException("Function name is not present");
        }
        String functionName = functionNameProp.get().value().toString();

        if (isNew != null && isNew) {
            String modelVarReference = String.format("_%sModel", functionName);  // extract the model name
            sourceBuilder.newVariable().token()
                    .keyword(SyntaxKind.FINAL_KEYWORD)
                    .name("ai:Wso2ModelProvider")
                    .whiteSpace()
                    .name(modelVarReference)
                    .keyword(SyntaxKind.EQUAL_TOKEN)
                    .keyword(SyntaxKind.CHECK_KEYWORD)
                    .name("ai:getDefaultModelProvider")
                    .keyword(SyntaxKind.OPEN_PAREN_TOKEN)
                    .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                    .endOfStatement();
        }

        sourceBuilder.token().keyword(SyntaxKind.FUNCTION_KEYWORD);

        // Write the function name
        sourceBuilder.token()
                .name(functionName)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN);

        // Write the model provider parameter if model provider is accepted as a parameter
        Optional<Property> asParameterProperty =
                sourceBuilder.getProperty(NaturalFunctions.MODEL_PROVIDER_AS_PARAMETER_KEY);
        boolean isModelProviderAsParameter = asParameterProperty.isPresent()
                && asParameterProperty.get().value().equals(true);
        if (isModelProviderAsParameter) {
            sourceBuilder.token().name(NaturalFunctions.MODULE_PREFIXED_MODEL_PROVIDER_TYPE +
                    " " + NaturalFunctions.MODEL);
        }

        // Write the function parameters
        Optional<Property> parameters = sourceBuilder.getProperty(Property.PARAMETERS_KEY);
        if (parameters.isPresent() && parameters.get().value() instanceof Map<?, ?> paramMap) {
            List<String> paramList = new ArrayList<>();
            for (Object obj : paramMap.values()) {
                Property paramProperty = gson.fromJson(gson.toJsonTree(obj), Property.class);
                if (!(paramProperty.value() instanceof Map<?, ?> paramData)) {
                    continue;
                }
                Map<String, Property> paramProperties = gson.fromJson(gson.toJsonTree(paramData),
                        FormBuilder.NODE_PROPERTIES_TYPE);

                String paramType = paramProperties.get(Property.TYPE_KEY).value().toString();
                String paramName = paramProperties.get(Property.VARIABLE_KEY).value().toString();
                paramList.add(paramType + " " + paramName);
            }
            if (!paramList.isEmpty()) {
                if (isModelProviderAsParameter) {
                    sourceBuilder.token().keyword(SyntaxKind.COMMA_TOKEN);
                }
                sourceBuilder.token().name(String.join(", ", paramList));
            }
        }
        sourceBuilder.token().keyword(SyntaxKind.CLOSE_PAREN_TOKEN);

        // Write the return type
        Optional<Property> returnType = sourceBuilder.getProperty(Property.TYPE_KEY);
        if (returnType.isPresent() && !returnType.get().value().toString().isEmpty()) {
            if (returnType.get().value().toString().contains("error")) {
                sourceBuilder.token()
                        .keyword(SyntaxKind.RETURNS_KEYWORD)
                        .name(returnType.get().value().toString());
            } else {
                sourceBuilder.token()
                        .keyword(SyntaxKind.RETURNS_KEYWORD)
                        .name(returnType.get().value() + "|error");
            }
        } else {
            sourceBuilder.token().keyword(SyntaxKind.RETURNS_KEYWORD).name("error?");
        }

        String modelVarReference = getModelVariableReference(sourceBuilder, functionName, isModelProviderAsParameter);

        // Write the natural function expression body
        Optional<Property> promptProperty = sourceBuilder.getProperty(NaturalFunctions.PROMPT);
        String promptValue = promptProperty.map(value -> value.value().toString()).orElse("");
        String naturalExprTemplate = "natural (%s) {%n" +
                "%s" +
                "%n}";
        String naturalExpr = naturalExprTemplate.formatted(modelVarReference, promptValue);
        sourceBuilder.token()
                .rightDoubleArrowToken()
                .name(naturalExpr)
                .semicolon();

        sourceBuilder.token().skipFormatting();
        sourceBuilder.acceptImport();

        // Generate text edits based on the line range. If a line range exists, update the signature of the existing
        // function. Otherwise, create a new function definition in "functions.bal".
        LineRange lineRange = flowNode.codedata().lineRange();
        if (lineRange == null) {
            sourceBuilder.textEdit(SourceBuilder.SourceKind.DECLARATION);
        } else {
            sourceBuilder.textEdit();
        }
        return sourceBuilder.build();
    }

    private String getModelVariableReference(SourceBuilder sourceBuilder,
                                             String functionName,
                                             boolean isModelProviderAsParameter) {
        if (isModelProviderAsParameter) {
            return NaturalFunctions.MODEL;
        }
        String inferredModelVarRefName = String.format("_%sModel", functionName);
        Optional<Property> optModelProviderProperty = sourceBuilder.getProperty(NaturalFunctions.MODEL_PROVIDER);
        if (optModelProviderProperty.isEmpty()) {
            return inferredModelVarRefName;
        }
        Property modelProviderProperty = optModelProviderProperty.get();
        return modelProviderProperty.value() != null && !modelProviderProperty.value().toString().isBlank()
                ? modelProviderProperty.value().toString()
                : inferredModelVarRefName;
    }
}
