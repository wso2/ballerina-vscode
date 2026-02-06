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
import io.ballerina.flowmodelgenerator.core.model.FormBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.tools.text.LineRange;
import org.ballerinalang.model.types.TypeKind;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Represents the properties of a workflow process function definition node.
 *
 * @since 2.0.0
 */
public class WorkflowBuilder extends FunctionDefinitionBuilder {

    public static final String LABEL = "Workflow Process Function";
    public static final String DESCRIPTION = "Define a workflow process function";

    public static final String PARAMETERS_LABEL = "Parameters";
    public static final String PARAMETERS_DOC = "Workflow process function parameters";

    public static final String CONTEXT_PARAM_KEY = "contextParam";
    public static final String CONTEXT_PARAM_LABEL = "Context Parameter";
    public static final String CONTEXT_PARAM_DOC = "Optional workflow context parameter";

    public static final String INPUT_PARAM_KEY = "inputParam";
    public static final String INPUT_PARAM_LABEL = "Input Parameter";
    public static final String INPUT_PARAM_DOC = "Mandatory input parameter for workflow data";

    public static final String EVENTS_PARAM_KEY = "eventsParam";
    public static final String EVENTS_PARAM_LABEL = "Events Parameter";
    public static final String EVENTS_PARAM_DOC = "Optional events parameter for receiving signals";
    public static final String WORKFLOW_CONTEXT_TYPE = "workflow:Context";
    public static final String WORKFLOW_EVENTS_TYPE = "record {|future...|}";


    private static final Gson gson = new Gson();

    public static Property getParameterSchema() {
        return ParameterSchemaHolder.PARAMETER_SCHEMA;
    }

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata().node(NodeKind.WORKFLOW);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        // Add function name
        properties().functionNameTemplate("workflow", context.getAllVisibleSymbolNames());

        // Add function description
        properties().functionDescription("");

        // Add nested parameters property (schema defined in ParameterSchemaHolder)
        properties().nestedProperty();
        properties().endNestedProperty(Property.ValueType.FIXED_PROPERTY, Property.PARAMETERS_KEY,
                PARAMETERS_LABEL, PARAMETERS_DOC, getParameterSchema(), false, false);

        // Return type
        properties().returnType("error?", null, true);
        properties().returnDescription("");
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        Optional<Property> optDescription = sourceBuilder.getProperty(Property.FUNCTION_NAME_DESCRIPTION_KEY);
        String description = optDescription.map(property -> property.value().toString()).orElse("");

        Optional<Property> funcNameProperty = sourceBuilder.getProperty(Property.FUNCTION_NAME_KEY);
        if (funcNameProperty.isEmpty()) {
            throw new IllegalStateException("Function name is not present");
        }
        String funcName = funcNameProperty.get().value().toString();

        // Add documentation
        if (!description.isEmpty()) {
            sourceBuilder.token().descriptionDoc(description);
        }

        // Add @workflow:Process annotation
        sourceBuilder.token().name("@workflow:Process");

        // Function keyword
        sourceBuilder.token().keyword(SyntaxKind.FUNCTION_KEYWORD);

        // Function name
        sourceBuilder.token()
                .name(funcName)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN);

        // Build parameters list from the parameters property
        StringBuilder paramsBuilder = new StringBuilder();

        Optional<Property> parameters = sourceBuilder.getProperty(Property.PARAMETERS_KEY);
        if (parameters.isPresent() && parameters.get().value() instanceof Map<?, ?> paramMap) {
            Map<String, Property> paramProperties = gson.fromJson(gson.toJsonTree(paramMap),
                    FormBuilder.NODE_PROPERTIES_TYPE);

            // Optional context parameter (first)
            Property contextParam = paramProperties.get(CONTEXT_PARAM_KEY);
            if (contextParam != null && contextParam.value() != null &&
                    !contextParam.value().toString().isEmpty()) {
                paramsBuilder.append(contextParam.value());
            }

            // Mandatory input parameter (second)
            Property inputParam = paramProperties.get(INPUT_PARAM_KEY);
            if (inputParam != null && inputParam.value() != null &&
                    !inputParam.value().toString().isEmpty()) {
                if (!paramsBuilder.isEmpty()) {
                    paramsBuilder.append(", ");
                }
                paramsBuilder.append(inputParam.value());
            }

            // Optional events parameter (third)
            Property eventsParam = paramProperties.get(EVENTS_PARAM_KEY);
            if (eventsParam != null && eventsParam.value() != null &&
                    !eventsParam.value().toString().isEmpty()) {
                if (!paramsBuilder.isEmpty()) {
                    paramsBuilder.append(", ");
                }
                paramsBuilder.append(eventsParam.value());
            }
        }

        // Write parameters
        if (!paramsBuilder.isEmpty()) {
            sourceBuilder.token().name(paramsBuilder.toString());
        }

        sourceBuilder.token().keyword(SyntaxKind.CLOSE_PAREN_TOKEN);

        // Return type
        Optional<Property> returnType = sourceBuilder.getProperty(Property.TYPE_KEY);
        if (returnType.isPresent() && !returnType.get().value().toString().isEmpty()) {
            sourceBuilder.token()
                    .keyword(SyntaxKind.RETURNS_KEYWORD)
                    .name(returnType.get().value().toString());
        }

        // Generate text edits based on the line range. If a line range exists, update the signature of the existing
        // function. Otherwise, create a new function definition in "functions.bal".
        LineRange lineRange = sourceBuilder.flowNode.codedata().lineRange();
        if (lineRange == null) {
            sourceBuilder
                    .token()
                        .openBrace()
                        .closeBrace()
                        .stepOut()
                    .textEdit(SourceBuilder.SourceKind.DECLARATION)
                    .acceptImport();
        } else {
            sourceBuilder
                    .token().skipFormatting().stepOut()
                    .textEdit();
        }
        return sourceBuilder.build();
    }

    private static class ParameterSchemaHolder {

        private static final Property PARAMETER_SCHEMA = initParameterSchema();

        private static Property initParameterSchema() {
            FormBuilder<?> formBuilder = new FormBuilder<>(null, null, null, null);

            // Context parameter - EXPRESSION type with ballerinaType for type hints
            formBuilder.custom()
                    .metadata()
                        .label(CONTEXT_PARAM_LABEL)
                        .description(CONTEXT_PARAM_DOC)
                        .stepOut()
                    .value("workflow:Context ctx")
                    .type(Property.ValueType.EXPRESSION, WORKFLOW_CONTEXT_TYPE)
                    .optional(true)
                    .editable()
                    .stepOut()
                    .addProperty(CONTEXT_PARAM_KEY);

            // Input parameter - EXPRESSION type with anydata ballerinaType
            formBuilder.custom()
                    .metadata()
                        .label(INPUT_PARAM_LABEL)
                        .description(INPUT_PARAM_DOC)
                        .stepOut()
                    .value("Input input")
                    .type(Property.ValueType.EXPRESSION, TypeKind.ANYDATA.typeName())
                    .optional(false)
                    .editable()
                    .stepOut()
                    .addProperty(INPUT_PARAM_KEY);

            // Events parameter - EXPRESSION type with record futures ballerinaType
            formBuilder.custom()
                    .metadata()
                        .label(EVENTS_PARAM_LABEL)
                        .description(EVENTS_PARAM_DOC)
                        .stepOut()
                    .value("")
                    .type(Property.ValueType.EXPRESSION, WORKFLOW_EVENTS_TYPE)
                    .optional(true)
                    .editable()
                    .stepOut()
                    .addProperty(EVENTS_PARAM_KEY);

            // Build the properties map containing all three parameters
            Map<String, Property> nodeProperties = formBuilder.build();

            // Wrap the map in a Property object and return it
            // This is different from other builders because we need specific keys for each parameter
            return new Property.Builder<>(null)
                    .value(nodeProperties)
                    .build();
        }
    }
}
