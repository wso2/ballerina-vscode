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

import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
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

/**
 * Represents a function call node.
 *
 * @since 1.0.0
 */
public class AgentCallBuilder extends CallBuilder {

    private static final String BALLERINA = "ballerina";

    // Agent Properties
    public static final String AGENT = "AGENT";
    public static final String SYSTEM_PROMPT = "systemPrompt";
    public static final String TOOLS = "tools";
    public static final String TYPE = "type";
    public static final String MODEL = "model";
    public static final String MEMORY = "memory";
    public static final String MAX_ITER = "maxIter";
    public static final String VERBOSE = "verbose";

    public static final String ROLE = "role";
    public static final String ROLE_LABEL = "Role";
    public static final String ROLE_DOC = "Define the agent's primary function";
    public static final String ROLE_PLACEHOLDER = "e.g., Customer Support Assistant, Sales Advisor, Data Analyst";

    public static final String INSTRUCTIONS = "instructions";
    public static final String INSTRUCTIONS_LABEL = "Instructions";
    public static final String INSTRUCTIONS_DOC = "Detailed instructions for the agent";
    public static final String INSTRUCTIONS_PLACEHOLDER = "e.g., You are a friendly assistant. Your goal is to...";

    public static final String MODEL_PROVIDER = "modelProvider";
    public static final String MODEL_LABEL = "Model Provider";
    public static final String MODEL_DOC = "Model Provider for the agent";
    public static final String MODEL_PLACEHOLDER = "";

    public static final String[] PARAMS_TO_HIDE = {SYSTEM_PROMPT, TOOLS, TYPE, MODEL};

    @Override
    protected NodeKind getFunctionNodeKind() {
        return NodeKind.AGENT_CALL;
    }

    @Override
    protected FunctionData.Kind getFunctionResultKind() {
        return FunctionData.Kind.FUNCTION;
    }

    @Override
    public void setConcreteConstData() {
        codedata().node(NodeKind.AGENT_CALL);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        if (context == null || context.codedata() == null) {
            throw new IllegalArgumentException("Context or codedata cannot be null");
        }
        addAgentProperties(context);
        super.setConcreteTemplateData(context);
    }

    private void addAgentProperties(TemplateContext context) {
        FlowNode agentNodeTemplate = new AgentBuilder().setConstData().setTemplateData(context).build();
        if (agentNodeTemplate.properties() != null) {
            agentNodeTemplate.properties().entrySet().stream()
                    .filter(entry -> !java.util.Arrays.asList(PARAMS_TO_HIDE).contains(entry.getKey()))
                    .forEach(entry -> addPropertyFromExisting(entry.getKey(), entry.getValue()));
        }
        addSimpleStringProperty(ROLE, ROLE_LABEL, ROLE_DOC, ROLE_PLACEHOLDER, false);
        addSimpleStringProperty(INSTRUCTIONS, INSTRUCTIONS_LABEL, INSTRUCTIONS_DOC, INSTRUCTIONS_PLACEHOLDER, false);
        addSimpleStringProperty(MODEL_PROVIDER, MODEL_LABEL, MODEL_DOC, MODEL_PLACEHOLDER, true);
    }

    private void addPropertyFromExisting(String key, Property property) {
        properties().custom()
                .metadata()
                    .label(property.metadata().label())
                    .description(property.metadata().description())
                    .data("node", AGENT)
                    .stepOut()
                .type(Property.ValueType.valueOf(property.valueType()))
                .placeholder(property.placeholder())
                .defaultValue(property.defaultValue())
                .typeConstraint(property.valueTypeConstraint())
                .imports(property.imports() != null ? property.imports().toString() : null)
                .optional(property.optional())
                .editable(property.editable())
                .advanced(property.advanced())
                .hidden(property.hidden())
                .modified(property.modified())
                .codedata()
                    .kind(property.codedata() != null ? property.codedata().kind() : "")
                    .stepOut()
                .stepOut()
                .addProperty(key);
    }

    private void addSimpleStringProperty(String key, String label, String description, String placeholder,
                                         boolean hidden) {
        properties().custom()
                .metadata()
                    .label(label)
                    .description(description)
                    .data("node", AGENT)
                    .stepOut()
                .type(Property.ValueType.STRING)
                .placeholder(placeholder)
                .optional(true)
                .hidden(hidden)
                .editable()
                .codedata()
                    .kind("REQUIRED")
                    .stepOut()
                .stepOut()
                .addProperty(key);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        sourceBuilder.newVariable();
        FlowNode flowNode = sourceBuilder.flowNode;

        if (FlowNodeUtil.hasCheckKeyFlagSet(flowNode)) {
            sourceBuilder.token().keyword(SyntaxKind.CHECK_KEYWORD);
        }

        Optional<Property> connection = flowNode.getProperty(Property.CONNECTION_KEY);
        if (connection.isEmpty()) {
            throw new IllegalStateException("Client must be defined for an action call node");
        }

        return sourceBuilder.token()
                .name(connection.get().toSourceCode())
                .keyword(BALLERINA.equals(flowNode.codedata().org()) ?
                        SyntaxKind.DOT_TOKEN : SyntaxKind.RIGHT_ARROW_TOKEN)
                .name(flowNode.metadata().label())
                .stepOut()
                .functionParameters(flowNode,
                        Set.of(Property.CONNECTION_KEY, Property.VARIABLE_KEY, Property.TYPE_KEY,
                                Property.CHECK_ERROR_KEY))
                .textEdit()
                .build();
    }
}
