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

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.flowmodelgenerator.core.AiUtils;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.utils.FileSystemUtils;
import io.ballerina.flowmodelgenerator.core.utils.FlowNodeUtil;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.projects.Document;
import io.ballerina.tools.diagnostics.Location;
import io.ballerina.tools.text.LinePosition;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import static io.ballerina.flowmodelgenerator.core.Constants.AI;

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
        FlowNode modelProviderNode = null;

        Path projectRoot = sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath);
        Map<Path, List<TextEdit>> textEdits = new java.util.HashMap<>();

        Optional<Property> connection = agentCallNode.getProperty(Property.CONNECTION_KEY);
        Optional<Property> model = agentCallNode.getProperty(MODEL);

        NodeBuilder.TemplateContext agentContext;

        if (model.isEmpty()) {
            throw new IllegalStateException("Agent call node must have a model property");
        }

        if (connection.isEmpty()) {
            throw new IllegalStateException("Agent call node must have a connection property");
        }

        // If model is not set, create a default model provider node
        if (model.get().value() == null || model.get().value().equals("")) {
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

        // If connection is not set, create a default agent node
        if (connection.get().value() == null || connection.get().value().equals("")) {
            agentContext = new TemplateContext(
                    sourceBuilder.workspaceManager,
                    sourceBuilder.filePath,
                    sourceBuilder.flowNode.codedata().lineRange().startLine(),
                    AiUtils.getDefaultAgentCodedata(),
                    null
            );
        } else {
            String agentVariableName = Objects.requireNonNull(connection.get().value()).toString();
            agentContext = findAgentContext(sourceBuilder, agentVariableName);
        }

        FlowNode agentNode = new AgentBuilder().setConstData().setTemplateData(agentContext).build();
        updateAgentNodeProperties(agentNode, agentCallNode);

        if (modelProviderNode != null) {
            FlowNodeUtil.copyPropertyValue(agentNode, modelProviderNode, MODEL, Property.VARIABLE_KEY);
        } else {
            FlowNodeUtil.copyPropertyValue(agentNode, agentCallNode, MODEL, MODEL);
            FlowNodeUtil.copyPropertyValue(agentNode, agentCallNode, Property.VARIABLE_KEY, Property.CONNECTION_KEY);
        }

        Path agentFilePath;
        if (agentContext.codedata().lineRange() != null) {
            String fileName = agentContext.codedata().lineRange().fileName();
            if (sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath) != null) {
                agentFilePath = sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath)
                        .resolve(fileName);
            } else {
                agentFilePath = sourceBuilder.filePath.getParent().resolve(fileName);
            }
        } else {
            agentFilePath = projectRoot;
        }

        SourceBuilder agentSourceBuilder = new SourceBuilder(agentNode, sourceBuilder.workspaceManager, agentFilePath);
        textEdits.putAll(NodeBuilder.getNodeFromKind(agentNode.codedata().node()).toSource(agentSourceBuilder));
        connection = agentNode.getProperty(Property.VARIABLE_KEY);

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

    private static void updateAgentNodeProperties(FlowNode agentNode, FlowNode agentCallNode) {
        if (agentNode.properties() == null) {
            return;
        }
        updateSystemPromptProperty(agentNode, agentCallNode);
        // TODO: Copy values of other properties of agentCallNode to agentNode (maxIter, verbose, etc.)
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

    /**
     * Finds the agent context for a given connection variable name. If the connection exists, searches for the agent
     * symbol using visibleSymbols and returns its context. Otherwise, returns a default agent context.
     */
    private static NodeBuilder.TemplateContext findAgentContext(SourceBuilder sourceBuilder, String agentVariableName) {
        Optional<NodeBuilder.TemplateContext> agentContext =
                findAgentContextByVariableName(sourceBuilder, agentVariableName);

        if (agentContext.isEmpty()) {
            throw new IllegalStateException("Agent call node must have a connection property");
        }

        return agentContext.get();
    }

    /**
     * Searches for an agent symbol by variable name using visibleSymbols and returns its context.
     */
    private static Optional<NodeBuilder.TemplateContext> findAgentContextByVariableName(
            SourceBuilder sourceBuilder, String variableName) {
        try {
            // Load the semantic model for the current file
            sourceBuilder.workspaceManager.loadProject(sourceBuilder.filePath);
            Document document = FileSystemUtils.getDocument(sourceBuilder.workspaceManager, sourceBuilder.filePath);
            SemanticModel semanticModel =
                    FileSystemUtils.getSemanticModel(sourceBuilder.workspaceManager, sourceBuilder.filePath);

            // Use visibleSymbols to find the agent variable in current scope
            LinePosition position = sourceBuilder.flowNode.codedata().lineRange().startLine();
            List<Symbol> visibleSymbols = semanticModel.visibleSymbols(document, position);

            for (Symbol symbol : visibleSymbols) {
                if (symbol.kind() == SymbolKind.VARIABLE) {
                    VariableSymbol varSymbol = (VariableSymbol) symbol;

                    if (varSymbol.getName().isPresent() && varSymbol.getName().get().equals(variableName)) {
                        return buildAgentContext(sourceBuilder, varSymbol);
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error finding agent context: " + e.getMessage(), e);
        }
        return Optional.empty();
    }

    /**
     * Builds the agent context from the variable symbol.
     */
    private static Optional<NodeBuilder.TemplateContext> buildAgentContext(SourceBuilder sourceBuilder,
                                                                           VariableSymbol varSymbol) {
        try {
            Location location = varSymbol.getLocation().orElse(null);
            if (location == null) {
                return Optional.empty();
            }

            // Get the file path for the agent variable
            String fileName = location.lineRange().fileName();
            java.nio.file.Path agentFilePath;

            if (sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath) != null) {
                agentFilePath = sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath)
                        .resolve(fileName);
            } else {
                agentFilePath = sourceBuilder.filePath.getParent().resolve(fileName);
            }

            // Get the document and find the complete statement node
            Document document = FileSystemUtils.getDocument(sourceBuilder.workspaceManager, agentFilePath);
            NonTerminalNode childNode = CommonUtils.getNode(document.syntaxTree(), location.textRange());
            // Navigate to the parent statement node to get the full agent definition
            NonTerminalNode statementNode = childNode.parent().parent();

            // Create codedata for the agent using the full statement's line range
            Codedata agentCodedata =
                    new Codedata.Builder<>(null)
                            .node(NodeKind.AGENT)
                            .lineRange(statementNode.lineRange())
                            .object("Agent")
                            .org(BALLERINA)
                            .module(AI)
                            .packageName(AI)
                            .symbol("init")
                            .sourceCode(statementNode.toSourceCode().strip())
                            .isNew(false)
                            .build();

            return Optional.of(new NodeBuilder.TemplateContext(
                    sourceBuilder.workspaceManager,
                    agentFilePath,
                    location.lineRange().startLine(),
                    agentCodedata,
                    null
            ));
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
