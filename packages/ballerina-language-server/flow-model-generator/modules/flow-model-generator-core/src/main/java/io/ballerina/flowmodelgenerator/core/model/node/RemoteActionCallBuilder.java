/*
 *  Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com)
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

import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.utils.FlowNodeUtil;
import io.ballerina.flowmodelgenerator.core.utils.WorkflowUtil;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.projects.Document;
import io.ballerina.tools.text.TextRange;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Represents the generalized action invocation node in the flow model.
 *
 * @since 1.0.0
 */
public class RemoteActionCallBuilder extends CallBuilder {

    public static final String TARGET_TYPE_KEY = "targetType";
    public static final String CALL_REMOTE_ACTIVITY_METHOD = "callRemoteActivity";

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        super.setConcreteTemplateData(context);
        Optional<Document> document = context.workspaceManager().document(context.filePath());
        Optional<SemanticModel> model = context.workspaceManager().semanticModel(context.filePath());
        if (document.isPresent() && model.isPresent()) {
            int txtPos = document.get().textDocument().textPositionFrom(context.position());
            NonTerminalNode node = ((ModulePartNode) document.get().syntaxTree().rootNode())
                    .findNode(TextRange.from(txtPos, 0));
            if (WorkflowUtil.isInsideWorkflowFunction(model.get(), node)) {
                ActivityCallBuilder.addCallActivityOptions(context, moduleInfo, this);
            }
        }
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        FlowNode flowNode = sourceBuilder.flowNode;
        Map<String, Property> properties = flowNode.properties();
        boolean isWorkflowCall = properties != null
                && properties.containsKey(ActivityCallBuilder.ADVANCED_PARAM_KEY);

        if (isWorkflowCall) {
            return toActivityCallSource(sourceBuilder, flowNode, properties);
        }
        return toDefaultSource(sourceBuilder, flowNode);
    }

    private Map<Path, List<TextEdit>> toDefaultSource(SourceBuilder sourceBuilder, FlowNode flowNode) {
        sourceBuilder.newVariableWithInferredType();

        if (FlowNodeUtil.hasCheckKeyFlagSet(flowNode)) {
            sourceBuilder.token().keyword(SyntaxKind.CHECK_KEYWORD);
        }

        Optional<Property> connection = sourceBuilder.getProperty(Property.CONNECTION_KEY);
        if (connection.isEmpty()) {
            throw new IllegalStateException("Client must be defined for an action call node");
        }

        return sourceBuilder.token()
                .name(connection.get().toSourceCode())
                .keyword(SyntaxKind.RIGHT_ARROW_TOKEN)
                .name(flowNode.metadata().label())
                .stepOut()
                .functionParameters(flowNode,
                        Set.of(Property.CONNECTION_KEY, Property.VARIABLE_KEY, Property.TYPE_KEY,
                                Property.CHECK_ERROR_KEY))
                .textEdit()
                .acceptImportWithVariableType()
                .build();
    }

    private Map<Path, List<TextEdit>> toActivityCallSource(SourceBuilder sourceBuilder, FlowNode flowNode,
                                                           Map<String, Property> properties) {
        sourceBuilder.newVariable();

        Optional<Property> connection = sourceBuilder.getProperty(Property.CONNECTION_KEY);
        if (connection.isEmpty()) {
            throw new IllegalStateException("Client must be defined for a remote activity call node");
        }

        String ctxParamName = ActivityCallBuilder.resolveContextParamName(sourceBuilder);
        // Generate: ResultType result = check ctx->callRemoteActivity(connection, "methodName", {params...}, options);
        sourceBuilder.token()
                .keyword(SyntaxKind.CHECK_KEYWORD)
                .name(ctxParamName)
                .keyword(SyntaxKind.RIGHT_ARROW_TOKEN)
                .name(CALL_REMOTE_ACTIVITY_METHOD)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN)
                .name(connection.get().toSourceCode())
                .keyword(SyntaxKind.COMMA_TOKEN)
                .name("\"" + flowNode.metadata().label() + "\"")
                .keyword(SyntaxKind.COMMA_TOKEN);

        Set<String> excludedKeys = Set.of(Property.VARIABLE_KEY, Property.TYPE_KEY,
                Property.CHECK_ERROR_KEY, Property.CONNECTION_KEY, ActivityCallBuilder.ADVANCED_PARAM_KEY);
        ActivityCallBuilder.emitArgsMap(sourceBuilder, properties, excludedKeys);
        ActivityCallBuilder.emitOptionsNamedArgs(sourceBuilder, properties);

        sourceBuilder.token()
                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                .endOfStatement();

        return sourceBuilder.textEdit().build();
    }

    @Override
    protected NodeKind getFunctionNodeKind() {
        return NodeKind.REMOTE_ACTION_CALL;
    }

    @Override
    protected FunctionData.Kind getFunctionResultKind() {
        return FunctionData.Kind.REMOTE;
    }
}
