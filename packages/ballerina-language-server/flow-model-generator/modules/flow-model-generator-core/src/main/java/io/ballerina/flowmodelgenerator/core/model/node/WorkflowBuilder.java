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

import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.PropertyType;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.model.TypeData;
import io.ballerina.tools.text.LineRange;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Represents the properties of a workflow process function definition node.
 *
 * @since 2.0.0
 */
public class WorkflowBuilder extends FunctionDefinitionBuilder {

    public static final String LABEL = "Workflow Process Function";
    public static final String DESCRIPTION = "Define a workflow process function";

    public static final String INPUT_KEY = "inputType";
    public static final String INPUT_LABEL = "Input Type";
    public static final String INPUT_DOC = "Type of the input data to the workflow";
    public static final String ANYDATA_TYPE = "anydata";

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata()
                .node(NodeKind.WORKFLOW)
                .org(WORKFLOW_ORG)
                .module(WORKFLOW_MODULE);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        // Add function name
        properties().functionNameTemplate("workflow", context.getAllVisibleSymbolNames());

        // Add function description
        properties().functionDescription("");

        // Add input property with WORKFLOW_INPUT_TYPE
        properties().custom()
                .metadata()
                    .label(INPUT_LABEL)
                    .description(INPUT_DOC)
                    .stepOut()
                .type(Property.ValueType.WORKFLOW_INPUT_TYPE, ANYDATA_TYPE)
                .value("")
                .editable(true)
                .stepOut()
                .addProperty(INPUT_KEY);

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

        // Add @workflow:Process annotation with newline
        sourceBuilder.token().name("@workflow:Process").name(System.lineSeparator());

        // Function keyword
        sourceBuilder.token().keyword(SyntaxKind.FUNCTION_KEYWORD);

        // Function name
        sourceBuilder.token()
                .name(funcName)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN);

        // Always add workflow:Context ctx as the first parameter
        StringBuilder paramsBuilder = new StringBuilder("workflow:Context ctx");

        // Build additional parameters from inputType property (only contains the type)
        Optional<Property> inputProperty = sourceBuilder.getProperty(INPUT_KEY);
        if (inputProperty.isPresent()) {
            String inputType = "";
            // Check if there's a typeModel in the types array that needs to be generated
            List<PropertyType> types = inputProperty.get().types();
            if (types != null && !types.isEmpty()) {
                    TypeData typeModel = types.getFirst().typeModel();
                    if (typeModel != null) {
                        // Accept type generation and get the actual type name to use
                        String actualTypeName = sourceBuilder.acceptTypeGeneration(typeModel);
                        if (actualTypeName != null) {
                            inputType = actualTypeName;
                        }
                    }
            }

            paramsBuilder.append(", ").append(inputType).append(" input");
        }

        sourceBuilder.token().name(paramsBuilder.toString());

        sourceBuilder.token().keyword(SyntaxKind.CLOSE_PAREN_TOKEN);

        // Return type
        Optional<Property> returnType = sourceBuilder.getProperty(Property.TYPE_KEY);
        if (returnType.isPresent() && !returnType.get().value().toString().isEmpty()) {
            sourceBuilder.token()
                    .keyword(SyntaxKind.RETURNS_KEYWORD)
                    .name(returnType.get().value().toString());
        }

        // Generate text edits based on the line range. If a line range exists, update the signature of the existing
        // workflow function. Otherwise, create a new function definition in "functions.bal".
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
}
