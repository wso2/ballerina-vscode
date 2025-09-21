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
import io.ballerina.flowmodelgenerator.core.AiUtils;
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
    public static final String MODEL = "model";
    public static final String MEMORY = "memory";

    // Agent Call Properties
    public static final String QUERY = "query";
    public static final String SESSION_ID = "sessionId";
    public static final String CONTEXT = "context";

    public static final String ROLE = "role";
    public static final String ROLE_LABEL = "Role";
    public static final String ROLE_DOC = "Define the agent's primary function";
    public static final String ROLE_PLACEHOLDER = "e.g., Customer Support Assistant, Sales Advisor, Data Analyst";

    public static final String INSTRUCTIONS = "instructions";
    public static final String INSTRUCTIONS_LABEL = "Instructions";
    public static final String INSTRUCTIONS_DOC = "Detailed instructions for the agent";
    public static final String INSTRUCTIONS_PLACEHOLDER = "e.g., You are a friendly assistant. Your goal is to...";

    static final Set<String> AGENT_PARAMS_TO_HIDE =
            Set.of(SYSTEM_PROMPT, TOOLS, MEMORY, MODEL, Property.TYPE_KEY, Property.VARIABLE_KEY);
    static final Set<String> AGENT_CALL_PARAMS_TO_SHOW = Set.of(QUERY, SESSION_ID, CONTEXT);

    // Cache for agent templates to avoid expensive repeated creation
    private static final Map<String, FlowNode> agentTemplateCache = new java.util.concurrent.ConcurrentHashMap<>();

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
        setAgentProperties(this, context, null);
        setAdditionalAgentProperties(this, null);
        super.setConcreteTemplateData(context);
    }

    public static void setAgentProperties(NodeBuilder nodeBuilder, TemplateContext context,
                                          Map<String, String> propertyValues) {
        FlowNode agentNodeTemplate = getOrCreateAgentTemplate(context);
        if (agentNodeTemplate.properties() != null) {
            agentNodeTemplate.properties().forEach((key, property) -> {
                String value = (propertyValues != null && propertyValues.containsKey(key))
                        ? propertyValues.get(key)
                        : null;
                boolean isHidden = AGENT_PARAMS_TO_HIDE.contains(key);
                FlowNodeUtil.addPropertyFromTemplate(nodeBuilder, key, property, value, isHidden);
            });
        }
    }

    public static void setAdditionalAgentProperties(NodeBuilder nodeBuilder, Map<String, String> propertyValues) {
        String roleValue = (propertyValues != null && propertyValues.containsKey(ROLE)) ?
                propertyValues.get(ROLE) : "";
        String instructionsValue = (propertyValues != null && propertyValues.containsKey(INSTRUCTIONS)) ?
                propertyValues.get(INSTRUCTIONS) : "";

        FlowNodeUtil.addStringProperty(nodeBuilder, ROLE, ROLE_LABEL, ROLE_DOC, ROLE_PLACEHOLDER, roleValue);
        FlowNodeUtil.addStringProperty(nodeBuilder, INSTRUCTIONS, INSTRUCTIONS_LABEL, INSTRUCTIONS_DOC,
                INSTRUCTIONS_PLACEHOLDER, instructionsValue);
    }

    private static FlowNode getOrCreateAgentTemplate(TemplateContext context) {
        String cacheKey = String.format("%s:%s:%s",
                context.codedata().org(),
                context.codedata().packageName(),
                context.codedata().version());
        return agentTemplateCache.computeIfAbsent(cacheKey, k ->
                new AgentBuilder().setConstData().setTemplateData(context).build()
        );
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        // TODO: Refactor and clean up
        sourceBuilder.newVariable();
        FlowNode agentCallNode = sourceBuilder.flowNode;
        Path projectRoot = sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath);
        Map<Path, List<TextEdit>> textEdits = new java.util.HashMap<>();
        Optional<Property> connection = agentCallNode.getProperty(Property.CONNECTION_KEY);
        FlowNode modelProviderNode = null;

        Optional<Property> model = agentCallNode.getProperty(MODEL);
        if (model.isPresent() && (model.get().value() == null || model.get().value().equals(""))) {
            // TODO: This context has to be the model providers's context, not the agent_call's context
            NodeBuilder.TemplateContext modelProviderContext = new NodeBuilder.TemplateContext(
                    sourceBuilder.workspaceManager,
                    sourceBuilder.filePath,
                    sourceBuilder.flowNode.codedata().lineRange().startLine(),
                    AiUtils.getDefaultModelProviderCodedata(),
                    null
            );
            modelProviderNode =
                    NodeBuilder.getNodeFromKind(NodeKind.MODEL_PROVIDER).setConstData()
                            .setTemplateData(modelProviderContext).build();
            ModelProviderBuilder modelProviderBuilder = new ModelProviderBuilder();
            SourceBuilder modelProviderSourceBuilder =
                    new SourceBuilder(modelProviderNode, sourceBuilder.workspaceManager, projectRoot);
            textEdits.putAll(modelProviderBuilder.toSource(modelProviderSourceBuilder));
        }

        if (connection.isPresent() && (connection.get().value() == null || connection.get().value().equals(""))) {
            // TODO: This context has to be the agent's context, not the agent_call's context
            NodeBuilder.TemplateContext agentContext = new NodeBuilder.TemplateContext(
                    sourceBuilder.workspaceManager,
                    sourceBuilder.filePath,
                    sourceBuilder.flowNode.codedata().lineRange().startLine(),
                    sourceBuilder.flowNode.codedata(),
                    null
            );

            FlowNode agentNode =
                    NodeBuilder.getNodeFromKind(NodeKind.AGENT).setConstData().setTemplateData(agentContext)
                            .build();

            updateAgentNodeProperties(agentNode, agentCallNode, modelProviderNode);

            AgentBuilder agentBuilder = new AgentBuilder();
            agentBuilder.setConstData().setConcreteTemplateData(agentContext);
            SourceBuilder agentSourceBuilder =
                    new SourceBuilder(agentNode, sourceBuilder.workspaceManager, projectRoot);
            textEdits.putAll(agentBuilder.toSource(agentSourceBuilder));
            connection = agentNode.getProperty(Property.VARIABLE_KEY);
        }

        if (FlowNodeUtil.hasCheckKeyFlagSet(agentCallNode)) {
            sourceBuilder.token().keyword(SyntaxKind.CHECK_KEYWORD);
        }

        if (connection.isEmpty()) {
            throw new IllegalStateException("Client must be defined for an action call node");
        }

        Set<String> excludeKeys = agentCallNode.properties() != null
                ? agentCallNode.properties().keySet().stream()
                .filter(key -> !AGENT_CALL_PARAMS_TO_SHOW.contains(key))
                .collect(java.util.stream.Collectors.toSet())
                : new java.util.HashSet<>();

        Map<Path, List<TextEdit>> agentCallTextEdits = sourceBuilder.token()
                .name(connection.get().toSourceCode())
                .keyword(BALLERINA.equals(agentCallNode.codedata().org()) ?
                        SyntaxKind.DOT_TOKEN : SyntaxKind.RIGHT_ARROW_TOKEN)
                .name(agentCallNode.metadata().label())
                .stepOut()
                .functionParameters(agentCallNode, excludeKeys)
                .textEdit()
                .build();

        textEdits.putAll(agentCallTextEdits);
        return textEdits;
    }

    private static void updateAgentNodeProperties(FlowNode agentNode, FlowNode agentCallNode,
                                                  FlowNode modelProviderNode) {
        if (agentNode.properties() == null) {
            return;
        }
        updateSystemPromptProperty(agentNode, agentCallNode);
        FlowNodeUtil.copyPropertyValue(agentNode, modelProviderNode, MODEL, Property.VARIABLE_KEY);
    }

    private static void updateSystemPromptProperty(FlowNode agentNode, FlowNode agentCallNode) {
        Property systemPrompt = agentNode.properties().get(SYSTEM_PROMPT);
        if (systemPrompt == null) {
            return;
        }

        assert systemPrompt.codedata() != null;
        String role = agentCallNode.getProperty(ROLE).map(Property::value).orElse("").toString();
        String instructions = agentCallNode.getProperty(INSTRUCTIONS).map(Property::value).orElse("").toString();
        String systemPromptValue = "{role: \"" + role + "\", instructions: string `" + instructions + "`}";

        Property updatedProperty = FlowNodeUtil.createUpdatedProperty(systemPrompt, systemPromptValue);
        agentNode.properties().put(SYSTEM_PROMPT, updatedProperty);
    }
}
