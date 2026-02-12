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
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.utils.FlowNodeUtil;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Represents a workflow activity call node.
 * This is a specialized remote action call for workflow:Context.callActivity().
 *
 * @since 2.0.0
 */
public class ActivityCallBuilder extends RemoteActionCallBuilder {

    public static final String LABEL = "Activity Call";
    public static final String DESCRIPTION = "Call a workflow activity function";

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata().
                node(NodeKind.ACTIVITY_CALL)
                .org(WORKFLOW_ORG)
                .module(WORKFLOW_MODULE);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        Codedata codedata = context.codedata();

        // Set metadata from codedata if available (from search result)
        if (codedata != null && codedata.symbol() != null) {
            metadata().label(codedata.symbol()).description(DESCRIPTION);
            codedata()
                    .node(NodeKind.WORKFLOW_START)
                    .org(codedata.org())
                    .module(codedata.module())
                    .symbol(codedata.symbol())
                    .version(codedata.version());
        }

        // Input property with the actual type from the workflow function
//        properties().custom()
//                .metadata()
//                .label(INPUT_LABEL)
//                .description(INPUT_DOC)
//                .stepOut()
//                .type(Property.ValueType.EXPRESSION, inputType)
//                .placeholder("")
//                .value("")
//                .editable(true)
//                .stepOut()
//                .addProperty(INPUT_KEY);

        // Variable property for result
        properties().custom()
                .metadata()
                .label("Workflow ID Variable Name")
                .description("Variable name to receive the started workflow ID.")
                .stepOut()
                .type(Property.ValueType.IDENTIFIER)
                .value("workflowId")
                .editable(true)
                .stepOut()
                .addProperty(Property.VARIABLE_KEY);

        // Check error property
        properties().custom()
                .metadata()
                .label("Check Error")
                .description("Trigger error flow")
                .stepOut()
                .type(Property.ValueType.FLAG)
                .value(true)
                .editable(true)
                .advanced(true)
                .hidden(true)
                .stepOut()
                .addProperty(Property.CHECK_ERROR_KEY);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        FlowNode flowNode = sourceBuilder.flowNode;

        // Get variable name property
        Optional<Property> variableProp = sourceBuilder.getProperty(Property.VARIABLE_KEY);
        String variableName = variableProp
                .map(p -> p.value().toString())
                .orElse("workflowId");

        // Generate: string workflowId = check workflow:createInstance(workflowFunction, input);
        sourceBuilder.token()
                .keyword(SyntaxKind.STRING_KEYWORD)
                .name(variableName)
                .whiteSpace()
                .keyword(SyntaxKind.EQUAL_TOKEN);

        if (FlowNodeUtil.hasCheckKeyFlagSet(flowNode)) {
            sourceBuilder.token().keyword(SyntaxKind.CHECK_KEYWORD);
        }

        // Get workflow function from codedata.symbol()
        String workflowFunction = flowNode.codedata().symbol();
        if (workflowFunction == null) {
            workflowFunction = "";
        }

        // Get input property
//        Optional<Property> inputProp = sourceBuilder.getProperty(INPUT_KEY);
//        String input = inputProp
//                .map(p -> p.value().toString())
//                .orElse("{}");

        // Build: workflow:createInstance(workflowFunction, input)
//        sourceBuilder.token()
//                .name(WORKFLOW_MODULE)
//                .keyword(SyntaxKind.COLON_TOKEN)
//                .name(CREATE_INSTANCE_METHOD)
//                .keyword(SyntaxKind.OPEN_PAREN_TOKEN)
//                .name(workflowFunction)
//                .keyword(SyntaxKind.COMMA_TOKEN)
//                .whiteSpace()
//                .name(input)
//                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
//                .endOfStatement()
//                .stepOut();

        return sourceBuilder
                .textEdit()
                .acceptImport(WORKFLOW_ORG, WORKFLOW_MODULE)
                .build();
    }
}

