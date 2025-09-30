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

import com.google.gson.Gson;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.flowmodelgenerator.core.AiUtils;
import io.ballerina.flowmodelgenerator.core.Constants;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.utils.FileSystemUtils;
import io.ballerina.flowmodelgenerator.core.utils.FlowNodeUtil;
import io.ballerina.modelgenerator.commons.FunctionData;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

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
    public static final String NAME = "name";

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
    private static final Map<String, FlowNode> agentTemplateCache = new ConcurrentHashMap<>();

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
        agentNodeTemplate.properties().forEach((key, property) -> {
            String value = (propertyValues != null && propertyValues.containsKey(key))
                    ? propertyValues.get(key)
                    : null;
            boolean isHidden = AGENT_PARAMS_TO_HIDE.contains(key);
            FlowNodeUtil.addPropertyFromTemplate(nodeBuilder, key, property, value, isHidden);
        });
    }

    public static void setAdditionalAgentProperties(NodeBuilder nodeBuilder, Map<String, String> propertyValues) {
        String roleValue = (propertyValues != null && propertyValues.containsKey(ROLE)) ?
                propertyValues.get(ROLE) : "";
        String instructionsValue = (propertyValues != null && propertyValues.containsKey(INSTRUCTIONS)) ?
                propertyValues.get(INSTRUCTIONS) : "";

        FlowNodeUtil.addStringProperty(nodeBuilder, ROLE, ROLE_LABEL, ROLE_DOC, ROLE_PLACEHOLDER, roleValue);
        FlowNodeUtil.addStringProperty(nodeBuilder, INSTRUCTIONS, INSTRUCTIONS_LABEL, INSTRUCTIONS_DOC,
                INSTRUCTIONS_PLACEHOLDER, instructionsValue);

        nodeBuilder.properties().custom().optional(true).hidden(true).stepOut().addProperty(NAME);
    }

    private static FlowNode getOrCreateAgentTemplate(TemplateContext context) {
        String cacheKey = String.format("%s|%s|%s",
                context.codedata().org(),
                context.codedata().packageName(),
                context.codedata().version());
        return agentTemplateCache.computeIfAbsent(cacheKey, k ->
                new AgentBuilder().setConstData().setTemplateData(context).build()
        );
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        sourceBuilder.newVariable();

        FlowNode agentCallNode = sourceBuilder.flowNode;
        Path projectRoot = sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath);
        Map<Path, List<TextEdit>> allTextEdits = new HashMap<>();

        FlowNode modelProviderNode =
                createModelProviderIfNeeded(sourceBuilder, agentCallNode, projectRoot, allTextEdits);
        TemplateContext agentTemplateContext = resolveAgentContext(sourceBuilder, agentCallNode, projectRoot);
        FlowNode agentNode = createAndConfigureAgentNode(agentTemplateContext, agentCallNode, modelProviderNode);

        generateAgentSource(sourceBuilder, agentNode, agentTemplateContext, projectRoot, allTextEdits);
        generateAgentCallSource(sourceBuilder, agentCallNode, agentNode, allTextEdits);

        return allTextEdits;
    }

    private FlowNode createModelProviderIfNeeded(SourceBuilder sourceBuilder, FlowNode agentCallNode,
                                                 Path projectRoot, Map<Path, List<TextEdit>> allTextEdits) {
        Optional<Property> model = agentCallNode.getProperty(MODEL);
        if (model.isPresent() && model.get().value() != null && !model.get().value().toString().isEmpty()) {
            // Skip creating a new model provider since a model provider already exists
            return null;
        }

        NodeBuilder.TemplateContext modelProviderContext =
                FlowNodeUtil.createDefaultTemplateContext(sourceBuilder,
                        AiUtils.getDefaultModelProviderCodedata(agentCallNode.codedata().org()));
        FlowNode modelProviderNode = NodeBuilder.getNodeFromKind(
                        Objects.equals(agentCallNode.codedata().org(), BALLERINA) ? NodeKind.MODEL_PROVIDER :
                                NodeKind.CLASS_INIT)
                .setConstData()
                .setTemplateData(modelProviderContext)
                .build();

        // If name is provided, use it to create a unique variable name for the model provider
        Optional<Property> name = agentCallNode.getProperty(NAME);
        if (name.isPresent() && name.get().value() != null && !name.get().value().toString().isEmpty()) {
            String agentVariableName = name.get().value() + Constants.Ai.MODEL_TYPE_NAME;
            Property variableProperty = modelProviderNode.properties().get(Property.VARIABLE_KEY);
            if (variableProperty != null) {
                Property updatedProperty = FlowNodeUtil.createUpdatedProperty(variableProperty, agentVariableName);
                modelProviderNode.properties().put(Property.VARIABLE_KEY, updatedProperty);
            }
        }

        SourceBuilder modelProviderSourceBuilder = new SourceBuilder(modelProviderNode,
                sourceBuilder.workspaceManager, projectRoot);
        Map<Path, List<TextEdit>> modelProviderTextEdits =
                new ModelProviderBuilder().toSource(modelProviderSourceBuilder);
        modelProviderTextEdits.forEach((path, textEdits) ->
                allTextEdits.merge(path, textEdits, (existing, incoming) -> {
                    List<TextEdit> merged = new ArrayList<>(existing);
                    merged.addAll(incoming);
                    return merged;
                }));

        return modelProviderNode;
    }

    private TemplateContext resolveAgentContext(SourceBuilder sourceBuilder, FlowNode agentCallNode, Path projectRoot) {
        return agentCallNode.getProperty(Property.CONNECTION_KEY)
                .filter(connection -> connection.value() != null && !connection.value().toString().isEmpty())
                .map(connection -> extractAgentCodedata(sourceBuilder, agentCallNode, projectRoot))
                .orElse(FlowNodeUtil.createDefaultTemplateContext(sourceBuilder,
                        AiUtils.getDefaultAgentCodedata(agentCallNode.codedata().org())));
    }

    private TemplateContext extractAgentCodedata(SourceBuilder sourceBuilder, FlowNode agentCallNode,
                                                 Path projectRoot) {
        Object agentCodedataObj = agentCallNode.metadata().data().get(Constants.Ai.AGENT_CODEDATA);

        if (agentCodedataObj == null) {
            return FlowNodeUtil.createDefaultTemplateContext(sourceBuilder,
                    AiUtils.getDefaultAgentCodedata(agentCallNode.codedata().org()));
        }

        Gson gson = new Gson();
        Codedata agentCodedata = gson.fromJson(gson.toJson(agentCodedataObj), Codedata.class);

        Path agentFilePath =
                FileSystemUtils.resolveFilePathFromCodedata(agentCodedata, projectRoot);

        return new NodeBuilder.TemplateContext(sourceBuilder.workspaceManager, agentFilePath,
                agentCodedata.lineRange().startLine(), agentCodedata, null);
    }

    private FlowNode createAndConfigureAgentNode(TemplateContext agentTemplateContext, FlowNode agentCallNode,
                                                 FlowNode modelProviderNode) {
        FlowNode agentNode = new AgentBuilder().setConstData().setTemplateData(agentTemplateContext).build();
        updateAgentNodeProperties(agentNode, agentCallNode);

        if (modelProviderNode != null) {
            FlowNodeUtil.copyPropertyValue(agentNode, modelProviderNode, MODEL, Property.VARIABLE_KEY);
        } else {
            FlowNodeUtil.copyPropertyValue(agentNode, agentCallNode, MODEL, MODEL);
            FlowNodeUtil.copyPropertyValue(agentNode, agentCallNode, Property.VARIABLE_KEY, Property.CONNECTION_KEY);
        }

        return agentNode;
    }

    private void generateAgentSource(SourceBuilder sourceBuilder, FlowNode agentNode,
                                     TemplateContext agentTemplateContext, Path projectRoot,
                                     Map<Path, List<TextEdit>> allTextEdits) {
        Path agentFilePath =
                FileSystemUtils.resolveFilePathFromCodedata(agentTemplateContext.codedata(), projectRoot);
        SourceBuilder agentSourceBuilder = new SourceBuilder(agentNode, sourceBuilder.workspaceManager, agentFilePath);
        Map<Path, List<TextEdit>> agentTextEdits =
                NodeBuilder.getNodeFromKind(agentNode.codedata().node()).toSource(agentSourceBuilder);
        agentTextEdits.forEach((path, textEdits) ->
                allTextEdits.merge(path, textEdits, (existing, incoming) -> {
                    List<TextEdit> merged = new ArrayList<>(existing);
                    merged.addAll(incoming);
                    return merged;
                }));
    }

    private void generateAgentCallSource(SourceBuilder sourceBuilder, FlowNode agentCallNode, FlowNode agentNode,
                                         Map<Path, List<TextEdit>> allTextEdits) {
        Optional<Property> connection = agentNode.getProperty(Property.VARIABLE_KEY);
        if (connection.isEmpty()) {
            throw new IllegalStateException("Agent variable must be defined for an agent call node");
        }

        if (FlowNodeUtil.hasCheckKeyFlagSet(agentCallNode)) {
            sourceBuilder.token().keyword(SyntaxKind.CHECK_KEYWORD);
        }

        Set<String> excludeKeys = getExcludeKeys(agentCallNode);
        Map<Path, List<TextEdit>> callTextEdits = sourceBuilder.token()
                .name(connection.get().toSourceCode())
                .keyword(BALLERINA.equals(agentCallNode.codedata().org()) ?
                        SyntaxKind.DOT_TOKEN : SyntaxKind.RIGHT_ARROW_TOKEN)
                .name(agentCallNode.metadata().label())
                .stepOut()
                .functionParameters(agentCallNode, excludeKeys)
                .textEdit()
                .build();

        callTextEdits.forEach((path, textEdits) ->
                allTextEdits.merge(path, textEdits, (existing, incoming) -> {
                    List<TextEdit> merged = new ArrayList<>(existing);
                    merged.addAll(incoming);
                    return merged;
                }));
    }

    private Set<String> getExcludeKeys(FlowNode agentCallNode) {
        return agentCallNode.properties() != null
                ? agentCallNode.properties().keySet().stream()
                .filter(key -> !AGENT_CALL_PARAMS_TO_SHOW.contains(key))
                .collect(Collectors.toSet())
                : new HashSet<>();
    }

    private void updateAgentNodeProperties(FlowNode agentNode, FlowNode agentCallNode) {
        if (agentNode.properties() == null) {
            return;
        }
        FlowNodeUtil.copyCommonProperties(agentNode, agentCallNode);

        // If name is provided in the agent call, update the variable name in the agent node
        Optional<Property> name = agentCallNode.getProperty(NAME);
        if (name.isPresent() && name.get().value() != null && !name.get().value().toString().isEmpty()) {
            String agentVariableName = name.get().value() + Constants.Ai.AGENT_TYPE_NAME;
            Property variableProperty = agentNode.properties().get(Property.VARIABLE_KEY);
            if (variableProperty != null) {
                Property updatedProperty = FlowNodeUtil.createUpdatedProperty(variableProperty, agentVariableName);
                agentNode.properties().put(Property.VARIABLE_KEY, updatedProperty);
            }
        }

        updateSystemPromptProperty(agentNode, agentCallNode);
    }

    private void updateSystemPromptProperty(FlowNode agentNode, FlowNode agentCallNode) {
        Property systemPrompt = agentNode.properties().get(SYSTEM_PROMPT);
        if (systemPrompt == null) {
            return;
        }
        String role = agentCallNode.getProperty(ROLE).map(Property::value).orElse("").toString();
        String instructions = agentCallNode.getProperty(INSTRUCTIONS).map(Property::value).orElse("").toString();

        // Escape backticks and backslashes to prevent injection
        String escapedRole = role.replace("\\", "\\\\").replace("`", "\\`");
        String escapedInstructions = instructions.replace("\\", "\\\\").replace("`", "\\`");

        String systemPromptValue =
                "{role: string `" + escapedRole + "`, instructions: string `" + escapedInstructions + "`}";

        Property updatedProperty = FlowNodeUtil.createUpdatedProperty(systemPrompt, systemPromptValue);
        agentNode.properties().put(SYSTEM_PROMPT, updatedProperty);
    }
}
