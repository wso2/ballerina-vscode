/*
 *  Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.flowmodelgenerator.core.model;

import com.google.gson.Gson;
import io.ballerina.compiler.syntax.tree.SyntaxInfo;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.flowmodelgenerator.core.AiUtils;
import io.ballerina.flowmodelgenerator.core.utils.FileSystemUtils;
import io.ballerina.flowmodelgenerator.core.utils.FlowNodeUtil;
import io.ballerina.flowmodelgenerator.core.utils.ParamUtils;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.FunctionDataBuilder;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.ParameterData;
import io.ballerina.projects.Document;
import io.ballerina.projects.Project;
import io.ballerina.tools.text.LineRange;
import org.ballerinalang.langserver.common.utils.NameUtil;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static io.ballerina.flowmodelgenerator.core.Constants.Ai;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.MCP_TOOL_KIT;
import static io.ballerina.flowmodelgenerator.core.model.Property.CHECK_ERROR_KEY;
import static io.ballerina.flowmodelgenerator.core.model.Property.GLOBAL_SCOPE;
import static io.ballerina.flowmodelgenerator.core.model.Property.RESULT_DOC;
import static io.ballerina.flowmodelgenerator.core.model.Property.RESULT_NAME;
import static io.ballerina.flowmodelgenerator.core.model.Property.RESULT_TYPE_LABEL;
import static io.ballerina.flowmodelgenerator.core.model.Property.SCOPE_KEY;
import static io.ballerina.flowmodelgenerator.core.model.Property.TYPE_KEY;
import static io.ballerina.flowmodelgenerator.core.model.Property.VARIABLE_KEY;
import static io.ballerina.flowmodelgenerator.core.model.Property.ValueType;
import static io.ballerina.modelgenerator.commons.CommonUtils.generateIcon;
import static io.ballerina.modelgenerator.commons.ParameterData.Kind;

/**
 * Represents a Generated McpToolKitClass node in the flow model.
 *
 * @since 1.3.1
 */
public class McpToolKitBuilder extends NodeBuilder {

    private static final String TOOL_KIT_NAME_PROPERTY = "toolKitName";
    private static final String TOOL_KIT_NAME_PROPERTY_LABEL = "MCP Toolkit Name";
    private static final String TOOL_KIT_NAME_DESCRIPTION = "Name of the MCP toolkit";
    private static final String TOOL_KIT_DEFAULT_CLASS_NAME = "McpToolKit";
    private static final String PERMITTED_TOOLS_PROPERTY = "permittedTools";
    private static final String AI_MCP_TOOL_KIT_CLASS = "McpToolKit";
    private static final String AI_MCP_BASE_TOOL_KIT_TYPE_WITH_PREFIX = "ai:McpBaseToolKit";
    private static final String INIT_METHOD_NAME = "init";
    private static final String MINIMUM_COMPATIBLE_AI_VERSION = "1.6.0";
    private static final String CONNECTIONS_BAL = "connections.bal";
    public static final String MCP_CLASS_DEFINITION = "mcpClassDefinition";
    private static final Gson gson = new Gson();
    private static final String NEW_LINE = System.lineSeparator();

    @Override
    public void setConcreteConstData() {
        codedata().node(MCP_TOOL_KIT);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        String aiModuleVersion = getAiModuleVersion(context);
        ModuleInfo codedataModuleInfo = new ModuleInfo(Ai.BALLERINA_ORG, Ai.AI_PACKAGE, Ai.AI_PACKAGE, aiModuleVersion);

        // Both the generated class init method and the ai:McpToolKit class init method have similar input argument
        // Hence use the ai:McpToolKit to build the form data
        FunctionData functionData = new FunctionDataBuilder().parentSymbolType(AI_MCP_TOOL_KIT_CLASS)
                .name(INIT_METHOD_NAME).moduleInfo(codedataModuleInfo).userModuleInfo(moduleInfo)
                .lsClientLogger(context.lsClientLogger()).functionResultKind(FunctionData.Kind.MCP_TOOL_KIT)
                .build();

        metadata().label(functionData.packageName()).description(functionData.description())
                .icon(generateIcon(functionData.org(), functionData.packageName(), functionData.version()));

        codedata().org(functionData.org()).module(functionData.moduleName()).packageName(functionData.packageName())
                .object(functionData.name()).version(functionData.version());

        metadata().label(functionData.packageName()).description(functionData.description())
                .icon(generateIcon(functionData.org(), functionData.packageName(), functionData.version()));
        codedata().org(functionData.org()).module(functionData.moduleName()).packageName(functionData.packageName())
                .object(functionData.name()).version(functionData.version());

        setParameterProperties(functionData);

        // Hide permittedTools property
        functionData.parameters().remove(PERMITTED_TOOLS_PROPERTY);
        setPermittedToolsProperty(this, null);

        if (hasCompatibleAiVersion(aiModuleVersion)) {
            String uniqueToolKitName =
                    NameUtil.getValidatedSymbolName(context.getAllVisibleSymbolNames(), TOOL_KIT_DEFAULT_CLASS_NAME);
            setToolKitNameProperty(this, uniqueToolKitName);
            setReturnType(AI_MCP_BASE_TOOL_KIT_TYPE_WITH_PREFIX, context);
        } else {
            setReturnType(functionData.returnType(), context);
        }
    }

    public static void setToolKitNameProperty(NodeBuilder nodeBuilder, String toolKitName) {
        nodeBuilder.properties().custom()
                .metadata().label(TOOL_KIT_NAME_PROPERTY_LABEL).description(TOOL_KIT_NAME_DESCRIPTION).stepOut()
                .typeWithScope(ValueType.IDENTIFIER, GLOBAL_SCOPE).value(toolKitName)
                .editable().stepOut().addProperty(TOOL_KIT_NAME_PROPERTY);
    }

    public static void setPermittedToolsProperty(NodeBuilder nodeBuilder, String permittedTools) {
        if (permittedTools != null) {
            nodeBuilder.properties().custom()
                    .codedata().kind(Kind.INCLUDED_FIELD.name()).originalName(PERMITTED_TOOLS_PROPERTY).stepOut()
                    .placeholder("()").hidden().value(permittedTools).editable().stepOut()
                    .addProperty(PERMITTED_TOOLS_PROPERTY);
        } else {
            nodeBuilder.properties().custom()
                    .codedata().kind(Kind.INCLUDED_FIELD.name()).originalName(PERMITTED_TOOLS_PROPERTY).stepOut()
                    .placeholder("()").hidden().editable().stepOut()
                    .addProperty(PERMITTED_TOOLS_PROPERTY);
        }
    }

    private boolean hasCompatibleAiVersion(String aiModuleVersion) {
        // checks if aiModule version is latest or have required features implemented in ai module
        return aiModuleVersion == null || AiUtils.compareSemver(aiModuleVersion, MINIMUM_COMPATIBLE_AI_VERSION) >= 0;
    }

    private void setParameterProperties(FunctionData function) {
        boolean onlyRestParams = function.parameters().size() == 1;
        for (ParameterData param : function.parameters().values()) {
            // Skip irrelevant parameter kinds
            if (param.kind() == Kind.PARAM_FOR_TYPE_INFER || param.kind() == Kind.INCLUDED_RECORD) {
                continue;
            }

            String unescapedName = ParamUtils.removeLeadingSingleQuote(param.name());
            String label = (param.label() == null || param.label().isEmpty()) ? unescapedName : param.label();
            Property.Builder<FormBuilder<NodeBuilder>> builder = properties().custom()
                    .metadata().label(label).description(param.description()).stepOut()
                    .codedata()
                        .kind(param.kind().name())
                        .originalName(param.name())
                        .stepOut()
                    .placeholder(param.placeholder())
                    .defaultValue(param.defaultValue())
                    .editable()
                    .defaultable(param.optional());

            // Configure property type & defaultability by parameter kind
            switch (param.kind()) {
                case INCLUDED_RECORD_REST -> {
                    applyRestDefaultability(builder, onlyRestParams);
                    unescapedName = "additionalValues";
                    builder.type(ValueType.MAPPING_EXPRESSION_SET);
                }
                case REST_PARAMETER -> {
                    applyRestDefaultability(builder, onlyRestParams);
                    builder.type(ValueType.EXPRESSION_SET);
                }
                default -> builder.typeWithExpression(param.typeSymbol(), moduleInfo);
            }
            builder.stepOut().addProperty(FlowNodeUtil.getPropertyKey(unescapedName));
        }
    }

    private void applyRestDefaultability(Property.Builder<FormBuilder<NodeBuilder>> builder, boolean onlyRestParam) {
        if (onlyRestParam) {
            builder.defaultable(false);
        }
    }

    private void setReturnType(String returnType, TemplateContext context) {
        properties().type(returnType, false, null, true, RESULT_TYPE_LABEL)
                .data(returnType, context.getAllVisibleSymbolNames(), RESULT_NAME, RESULT_DOC);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {

        Path connectionsFilePath =
                sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath).resolve(CONNECTIONS_BAL);
        Range defaultRange = getDefaultLineRange(sourceBuilder, connectionsFilePath);

        if ((sourceBuilder.flowNode.codedata().isNew() == null || !sourceBuilder.flowNode.codedata().isNew())) {
            connectionsFilePath = sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath)
                    .resolve(sourceBuilder.flowNode.codedata().lineRange().fileName());
            LineRange lineRange = sourceBuilder.flowNode.codedata().lineRange();
            defaultRange = CommonUtils.toRange(lineRange);
        }

        Set<String> ignoredProperties =
                new HashSet<>(Set.of(VARIABLE_KEY, TYPE_KEY, SCOPE_KEY, CHECK_ERROR_KEY));
        Property toolKitNameProperty = getToolKitNameProperty(sourceBuilder.flowNode);
        if (toolKitNameProperty == null) {
            // Generate the following code
            // ```final ai:McpToolKit aiMcpToolkit = new ("http://...")```
            ignoredProperties.add(TOOL_KIT_NAME_PROPERTY);
            sourceBuilder.token().keyword(SyntaxKind.FINAL_KEYWORD).stepOut().newVariable()
                    .token().keyword(SyntaxKind.CHECK_KEYWORD).keyword(SyntaxKind.NEW_KEYWORD).stepOut()
                    .functionParameters(sourceBuilder.flowNode, ignoredProperties)
                    .acceptImport().textEdit(SourceBuilder.SourceKind.STATEMENT, connectionsFilePath, defaultRange);
            return sourceBuilder.build();
        } else {
            // 1. Generate the MCP toolkit class in user code
            Property permittedToolsProperty = sourceBuilder.flowNode.properties().get(PERMITTED_TOOLS_PROPERTY);
            String permittedTools = permittedToolsProperty.value() instanceof String
                    ? (String) permittedToolsProperty.value()
                    : "()";
            String toolKitName = String.valueOf(toolKitNameProperty.value());

            String sourceCode = generateMcpToolKitClassSource(toolKitName, permittedTools);

            // Check if class definition data exists in codedata
            Map<String, Object> data = sourceBuilder.flowNode.codedata().data();
            if (data != null && data.containsKey(MCP_CLASS_DEFINITION)) {
                Object classDefinitionCodedata = data.get(MCP_CLASS_DEFINITION);
                Codedata codedata = gson.fromJson(gson.toJsonTree(classDefinitionCodedata),
                        Codedata.class);
                LineRange lineRange = codedata.lineRange();

                // Use the class definition location for the text edit
                Path classFilePath = sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath)
                        .resolve(lineRange.fileName());
                Range classRange = CommonUtils.toRange(lineRange);

                sourceBuilder.token().source(sourceCode).skipFormatting().stepOut()
                        .textEdit(SourceBuilder.SourceKind.STATEMENT, classFilePath, classRange);
            } else {
                // Use default agents.bal location
                sourceBuilder.acceptImport(Ai.BALLERINA_ORG, Ai.MCP_PACKAGE);
                sourceBuilder.acceptImport(Ai.BALLERINA_ORG, Ai.AI_PACKAGE);

                sourceBuilder.token().source(sourceCode).skipFormatting().stepOut().textEdit();
            }

            // 2. Initialize an instance of that class
            sourceBuilder.flowNode.properties().remove(TOOL_KIT_NAME_PROPERTY);
            sourceBuilder.flowNode.properties().remove(PERMITTED_TOOLS_PROPERTY);
            sourceBuilder.flowNode.properties().remove(TYPE_KEY);
            sourceBuilder.flowNode.properties().put(TYPE_KEY, toolKitNameProperty);
            sourceBuilder.token().keyword(SyntaxKind.FINAL_KEYWORD).stepOut().newVariable()
                    .token().keyword(SyntaxKind.CHECK_KEYWORD).keyword(SyntaxKind.NEW_KEYWORD).stepOut()
                    .functionParameters(sourceBuilder.flowNode, ignoredProperties);
        }
        return sourceBuilder.textEdit(SourceBuilder.SourceKind.STATEMENT, connectionsFilePath, defaultRange).build();
    }

    private static Range getDefaultLineRange(SourceBuilder sourceBuilder, Path connectionsFilePath) {
        Range defaultRange;
        try {
            sourceBuilder.workspaceManager.loadProject(sourceBuilder.filePath);
            Document document = FileSystemUtils.getDocument(sourceBuilder.workspaceManager, connectionsFilePath);
            // If the file exists, get the end of the file
            defaultRange = CommonUtils.toRange(document.syntaxTree().rootNode().lineRange().endLine());
        } catch (WorkspaceDocumentException | EventSyncException e) {
            throw new RuntimeException(e);
        }
        return defaultRange;
    }

    private static Property getToolKitNameProperty(FlowNode flowNode) {
        try {
            return flowNode.properties().get(TOOL_KIT_NAME_PROPERTY);
        } catch (Exception e) {
            return null;
        }
    }

    private String generateMcpToolKitClassSource(String className, String permittedTools) {
        String initBody;
        String toolFunctions;

        if (permittedTools.equals("()") || permittedTools.isBlank()) {
            // Generate init body using self.callTool as function reference
            initBody = "        do {" + NEW_LINE +
                    "            self.mcpClient = check new mcp:StreamableHttpClient(serverUrl, config);" + NEW_LINE +
                    "            self.tools = check ai:getPermittedMcpToolConfigs(self.mcpClient, info," +
                    " self.callTool).cloneReadOnly();" + NEW_LINE +
                    "        } on fail error e {" + NEW_LINE +
                    "            return error ai:Error(\"Failed to initialize MCP toolkit\", e);" + NEW_LINE +
                    "        }";

            // Generate callTool method
            toolFunctions = getToolMethodSignature("callTool");
        } else {
            // Generate init body with permitted tools mapping
            Map<String, String> toolMapping = generatePermittedToolsMapping(permittedTools);
            String permittedToolsMappingConstructorExp = toolMapping.entrySet().stream()
                    .map(e -> "                " + e.getKey() + " : self." + e.getValue())
                    .collect(Collectors.joining("," + System.lineSeparator()));

            initBody = "        final map<ai:FunctionTool> permittedTools = {" + NEW_LINE +
                    permittedToolsMappingConstructorExp + NEW_LINE +
                    "        };" + NEW_LINE + NEW_LINE +
                    "        do {" + NEW_LINE +
                    "            self.mcpClient = check new mcp:StreamableHttpClient(serverUrl, config);" + NEW_LINE +
                    "            self.tools = check ai:getPermittedMcpToolConfigs(self.mcpClient, info," +
                    " permittedTools).cloneReadOnly();" + NEW_LINE +
                    "        } on fail error e {" + NEW_LINE +
                    "            return error ai:Error(\"Failed to initialize MCP toolkit\", e);" + NEW_LINE +
                    "        }";

            // Generate individual tool methods
            toolFunctions = toolMapping.values().stream().map(this::getToolMethodSignature)
                    .collect(Collectors.joining(System.lineSeparator()));
        }

        return "isolated class " + className + " {" + NEW_LINE +
                "    *ai:McpBaseToolKit;" + NEW_LINE +
                "    private final mcp:StreamableHttpClient mcpClient;" + NEW_LINE +
                "    private final readonly & ai:ToolConfig[] tools;" + NEW_LINE + NEW_LINE +
                "    public isolated function init(string serverUrl," +
                " mcp:Implementation info = {name: \"MCP\", version: \"1.0.0\"}," + NEW_LINE +
                "            *mcp:StreamableHttpClientTransportConfig config) returns ai:Error? {" + NEW_LINE +
                initBody +
                NEW_LINE + "    }" + NEW_LINE + NEW_LINE +
                "    public isolated function getTools() returns ai:ToolConfig[] => self.tools;" + NEW_LINE +
                NEW_LINE +
                toolFunctions +
                "}" + NEW_LINE;
    }

    private String getToolMethodSignature(String toolName) {
        return "    @ai:AgentTool" + NEW_LINE +
                "    public isolated function " + toolName + "(mcp:CallToolParams params)" +
                " returns mcp:CallToolResult|error {" + NEW_LINE +
                "        return self.mcpClient->callTool(params);" + NEW_LINE +
                "    }" + NEW_LINE;
    }

    private Map<String, String> generatePermittedToolsMapping(String permittedTools) {
        if (permittedTools == null || permittedTools.isBlank() || permittedTools.equals("()")) {
            return Map.of();
        }
        String cleanedTools = permittedTools.trim()
                .replaceAll("^\\[|]$", "");
        return java.util.Arrays.stream(cleanedTools.split(","))
                .map(String::trim)
                .filter(tool -> !tool.isEmpty())
                .collect(Collectors.toMap(name -> name, this::toMethodName));
    }

    private String toMethodName(String toolName) {
        if (toolName == null || toolName.isBlank()) {
            throw new IllegalArgumentException("Input cannot be null or blank");
        }

        // If it's already a valid identifier and not a reserved word, return as-is
        Set<String> predefinedMembers = Set.of("init", "getTools", "mcpClient", "tools");
        if (SyntaxInfo.isIdentifier(toolName) &&
                !SyntaxInfo.isKeyword(toolName) && !predefinedMembers.contains(toolName)) {
            return toolName;
        }

        // Otherwise, generate a method name from the input
        String[] parts = toolName.split("\\s+");
        if (parts.length == 0) {
            throw new IllegalArgumentException("Tool name contains only whitespace");
        }
        StringBuilder sb = new StringBuilder(parts[0].toLowerCase(Locale.UK));
        for (int i = 1; i < parts.length; i++) {
            String part = parts[i];
            if (!part.isEmpty()) {
                sb.append(Character.toUpperCase(part.charAt(0)))
                        .append(part.substring(1).toLowerCase(Locale.UK));
            }
        }
        String methodName = sb.toString();

        // Replace invalid characters with underscores first
        methodName = methodName.chars()
                .mapToObj(c -> Character.isJavaIdentifierPart(c) ? String.valueOf((char) c) : "_")
                .collect(Collectors.joining());

        // Strip leading and trailing underscores that came from invalid characters
        methodName = methodName.replaceAll("^_+|_+$", "");

        // Check if the result is empty after stripping
        if (methodName.isEmpty()) {
            methodName = "_";
        }

        // Then check if we need a leading underscore
        if (!Character.isJavaIdentifierStart(methodName.charAt(0))) {
            methodName = "_" + methodName;
        }

        if (SyntaxInfo.isKeyword(methodName) || predefinedMembers.contains(methodName)) {
            methodName = "'" + methodName;
        }
        return methodName;
    }

    private String getAiModuleVersion(TemplateContext context) {
        try {
            Project project = context.workspaceManager().loadProject(context.filePath());
            return AiUtils.getBallerinaAiModuleVersion(project);
        } catch (WorkspaceDocumentException | EventSyncException e) {
            return null;
        }
    }
}
