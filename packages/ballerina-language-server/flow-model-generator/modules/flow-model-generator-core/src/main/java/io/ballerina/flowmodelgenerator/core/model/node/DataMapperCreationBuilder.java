/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
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
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.FormBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.utils.FileSystemUtils;
import io.ballerina.modelgenerator.commons.CommonUtils;
import org.ballerinalang.model.types.TypeKind;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Represents the properties of data mapper creation node.
 *
 * @since 2.0.0
 */
public class DataMapperCreationBuilder extends NodeBuilder {

    public static final String LABEL = "Data Mapper";
    public static final String DESCRIPTION = "Define a data mapper";

    public static final String DATA_MAPPER_NAME_LABEL = "Data Mapper Name";
    public static final String DATA_MAPPER_NAME_DOC = "Name of the data mapper";

    public static final String PARAMETERS_LABEL = "Inputs";
    public static final String PARAMETERS_DOC = "Input variables of the data mapper";

    public static final String OUTPUT_LABEL = "Output";
    public static final String OUTPUT_DOC = "Output type of the data mapper";

    private static final Gson gson = new Gson();

    public static final String RETURN_TYPE = TypeKind.ANYDATA.typeName();
    public static final String PARAMETER_TYPE = TypeKind.ANYDATA.typeName();

    protected String getNameLabel() {
        return DATA_MAPPER_NAME_LABEL;
    }

    protected String getNameDoc() {
        return DATA_MAPPER_NAME_DOC;
    }

    protected String getOutputDoc() {
        return OUTPUT_DOC;
    }

    protected String getParametersDoc() {
        return PARAMETERS_DOC;
    }

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata().node(NodeKind.DATA_MAPPER_CREATION);
    }

    public static Property getParameterSchema() {
        return ParameterSchemaHolder.PARAMETER_SCHEMA;
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        properties().functionNameTemplate("transform", context.getAllVisibleSymbolNames(),
                getNameLabel(), getNameDoc());

        setMandatoryProperties(this, null);
        setOptionalProperties(this);
    }

    public void setMandatoryProperties(NodeBuilder nodeBuilder, String returnType) {
        nodeBuilder.properties().custom()
                .metadata()
                    .label(Property.RESULT_NAME)
                    .description(Property.RESULT_DOC)
                .stepOut()
                .value("outputResult")
                .type()
                    .fieldType(Property.ValueType.IDENTIFIER)
                    .selected(true)
                .stepOut()
                .editable()
                .stepOut()
                .addProperty(Property.VARIABLE_KEY);

        nodeBuilder.properties().custom()
                .metadata()
                    .label(OUTPUT_LABEL)
                    .description(getOutputDoc())
                .stepOut()
                .value(returnType)
                .type(Property.ValueType.TYPE, RETURN_TYPE)
                .editable()
                .stepOut()
                .addProperty(Property.TYPE_KEY)
                .nestedProperty();

    }

    public static void setProperty(FormBuilder<?> formBuilder, String type, String name) {
        formBuilder.dataMapperParameter(type, name, Property.ValueType.TYPE, PARAMETER_TYPE);
    }

    public void setOptionalProperties(NodeBuilder nodeBuilder) {
        nodeBuilder.properties()
                .endNestedProperty(Property.ValueType.REPEATABLE_PROPERTY, Property.PARAMETERS_KEY, PARAMETERS_LABEL,
                        getParametersDoc(), getParameterSchema(), false, false);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        Map<Path, List<TextEdit>> definition = createDefinition(sourceBuilder);
        Map<Path, List<TextEdit>> invocation = createInvocation(sourceBuilder);

        Map<Path, List<TextEdit>> combined = new HashMap<>(definition);
        combined.putAll(invocation);
        return combined;
    }

    private Map<Path, List<TextEdit>> createDefinition(SourceBuilder sourceBuilder) {
        sourceBuilder.token().keyword(SyntaxKind.FUNCTION_KEYWORD);

        Optional<Property> property = sourceBuilder.getProperty(Property.FUNCTION_NAME_KEY);
        if (property.isEmpty()) {
            throw new IllegalStateException("Data mapper name is not present");
        }
        sourceBuilder.token()
                .name(property.get().value().toString())
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN);

        Optional<Property> parameters = sourceBuilder.getProperty(Property.PARAMETERS_KEY);
        if (parameters.isPresent() && parameters.get().value() instanceof Map<?, ?> paramMap) {
            List<String> paramList = new ArrayList<>();
            for (Map.Entry<?, ?> entry : paramMap.entrySet()) {
                Object obj = entry.getValue();
                Property paramProperty = gson.fromJson(gson.toJsonTree(obj), Property.class);
                if (!(paramProperty.value() instanceof Map<?, ?> paramData)) {
                    continue;
                }
                Map<String, Property> paramProperties = gson.fromJson(gson.toJsonTree(paramData),
                        FormBuilder.NODE_PROPERTIES_TYPE);
                paramList.add(paramProperties.get(Property.TYPE_KEY).value().toString() + " " + entry.getKey());
            }
            sourceBuilder.token().name(String.join(", ", paramList));
        }
        sourceBuilder.token().keyword(SyntaxKind.CLOSE_PAREN_TOKEN);

        // Write the return type
        Optional<Property> returnType = sourceBuilder.getProperty(Property.TYPE_KEY);
        if (returnType.isEmpty() || returnType.get().value().toString().isEmpty()) {
            throw new IllegalStateException("The return type should be defined");
        }
        String returnTypeString = returnType.get().value().toString();
        sourceBuilder.token()
                .keyword(SyntaxKind.RETURNS_KEYWORD)
                .name(returnTypeString);

        Optional<String> returnBody =
                sourceBuilder.getExpressionBodyText(returnTypeString, returnType.get().imports());
        if (returnBody.isEmpty()) {
            throw new IllegalStateException("Failed to produce the function body");
        }

        endSourceGeneration(sourceBuilder, returnBody.get());
        return sourceBuilder
                .textEdit(SourceBuilder.SourceKind.DECLARATION)
                .build();
    }

    protected void endSourceGeneration(SourceBuilder sourceBuilder, String returnBody) {
        sourceBuilder
                .token()
                .keyword(SyntaxKind.RIGHT_DOUBLE_ARROW_TOKEN)
                .name(returnBody)
                .endOfStatement();
    }

    private Map<Path, List<TextEdit>> createInvocation(SourceBuilder sourceBuilder) {
        FlowNode flowNode = sourceBuilder.flowNode;
        Codedata codedata = flowNode.codedata();
        Path path = FileSystemUtils.resolveFilePathFromCodedata(codedata,
                sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath));
        SourceBuilder callBuilder = new SourceBuilder(flowNode, sourceBuilder.workspaceManager, path);

        callBuilder.newVariableWithInferredType();
        Optional<Property> property = sourceBuilder.getProperty(Property.FUNCTION_NAME_KEY);
        if (property.isEmpty()) {
            throw new IllegalStateException("Name is not present");
        }
        callBuilder.token()
                .name(property.get().value().toString())
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN);

        Optional<Property> parameters = callBuilder.getProperty(Property.PARAMETERS_KEY);
        if (parameters.isPresent() && parameters.get().value() instanceof Map<?, ?> paramMap) {
            List<String> argsList = new ArrayList<>();
            for (Object obj : paramMap.values()) {
                Property paramProperty = gson.fromJson(gson.toJsonTree(obj), Property.class);
                if (!(paramProperty.value() instanceof Map<?, ?> paramData)) {
                    continue;
                }
                Map<String, Property> paramProperties = gson.fromJson(gson.toJsonTree(paramData),
                        FormBuilder.NODE_PROPERTIES_TYPE);
                String paramName = paramProperties.get(Property.VARIABLE_KEY).value().toString();
                argsList.add(paramName);
            }
            callBuilder.token().name(String.join(", ", argsList));
        }
        callBuilder.token().keyword(SyntaxKind.CLOSE_PAREN_TOKEN);
        callBuilder.token().endOfStatement();

        return callBuilder
                .textEdit(SourceBuilder.SourceKind.STATEMENT, path, CommonUtils.toRange(codedata.lineRange()))
                .acceptImportWithVariableType()
                .build();
    }

    private static class ParameterSchemaHolder {

        private static final Property PARAMETER_SCHEMA = initParameterSchema();

        private static Property initParameterSchema() {
            FormBuilder<?> formBuilder = new FormBuilder<>(null, null, null, null);
            setProperty(formBuilder, "", "");
            Map<String, Property> nodeProperties = formBuilder.build();
            return nodeProperties.get("");
        }
    }
}
