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
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.utils.FlowNodeUtil;
import io.ballerina.modelgenerator.commons.FunctionData;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Represents a workflow activity call node.
 * This generates code like: int result = check ctx->callActivity(myActivity, input);
 *
 * @since 2.0.0
 */
public class ActivityCallBuilder extends CallBuilder {

    public static final String LABEL = "Activity Call";
    public static final String DESCRIPTION = "Call a workflow activity function";

    private static final String CALL_ACTIVITY_METHOD = "callActivity";
    private static final String DEFAULT_RETURN_TYPE = "anydata";

    @Override
    protected NodeKind getFunctionNodeKind() {
        return NodeKind.ACTIVITY_CALL;
    }

    @Override
    protected FunctionData.Kind getFunctionResultKind() {
        return FunctionData.Kind.ACTIVITY;
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        FlowNode flowNode = sourceBuilder.flowNode;

        // Get properties
        Optional<Property> typeProp = sourceBuilder.getProperty(Property.TYPE_KEY);
        Optional<Property> variableProp = sourceBuilder.getProperty(Property.VARIABLE_KEY);

        String resultType = typeProp
                .map(p -> p.value().toString())
                .orElse(DEFAULT_RETURN_TYPE);
        String variableName = variableProp
                .map(p -> p.value().toString())
                .orElse("result");

        // Get activity function from codedata.symbol()
        String activityFunction = flowNode.codedata().symbol();
        if (activityFunction == null) {
            activityFunction = "";
        }

        // Generate: int result = check ctx->callActivity(myActivity, input);
        sourceBuilder.token()
                .name(resultType)
                .whiteSpace()
                .name(variableName)
                .whiteSpace()
                .keyword(SyntaxKind.EQUAL_TOKEN);
        sourceBuilder.token().keyword(SyntaxKind.CHECK_KEYWORD);

        //Todo: ctx value should be dynamic based on the context variable name
        //Todo: handle activity function from imported modules with module prefix
        sourceBuilder.token()
                .name("ctx")
                .keyword(SyntaxKind.RIGHT_ARROW_TOKEN)
                .name(CALL_ACTIVITY_METHOD)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN)
                .name(activityFunction)
                .keyword(SyntaxKind.COMMA_TOKEN);

        // Add function parameters (excluding variable, type, checkError)
        Set<String> excludedKeys = Set.of(Property.VARIABLE_KEY, Property.TYPE_KEY,
                Property.CHECK_ERROR_KEY);
        // Include the parameters as a map of key-value pairs in of the function call.
        sourceBuilder.token().keyword(SyntaxKind.OPEN_BRACE_TOKEN);
        Map<String, Property> properties = flowNode.properties();
        if (properties != null) {
            boolean isFirstArg = true;
            for (Map.Entry<String, Property> entry : properties.entrySet()) {
                if (excludedKeys.contains(entry.getKey())) {
                    continue;
                }

                Object value = entry.getValue().value();
                if (value == null) {
                    continue;
                }

                if (!isFirstArg) {
                    sourceBuilder.token()
                            .keyword(SyntaxKind.COMMA_TOKEN);
                } else {
                    isFirstArg = false;
                }
                sourceBuilder.token()
                        .whiteSpace()
                        .name(entry.getKey())
                        .keyword(SyntaxKind.COLON_TOKEN)
                        .name(value.toString());
            }
        }

        sourceBuilder.token()
                .keyword(SyntaxKind.CLOSE_BRACE_TOKEN)
                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                .endOfStatement()
                .stepOut();

        return sourceBuilder
                .textEdit()
                .build();
    }
}
