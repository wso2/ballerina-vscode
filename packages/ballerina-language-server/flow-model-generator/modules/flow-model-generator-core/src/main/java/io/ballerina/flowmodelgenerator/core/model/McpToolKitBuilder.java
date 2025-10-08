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
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static io.ballerina.flowmodelgenerator.core.Constants.Ai;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.MCP_TOOL_KIT;
import static io.ballerina.flowmodelgenerator.core.model.Property.CHECK_ERROR_KEY;
import static io.ballerina.flowmodelgenerator.core.model.Property.GLOBAL_SCOPE;
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

        // Update permittedTools type to MULTIPLE_SELECT
        ParameterData permittedTools = functionData.parameters().remove(PERMITTED_TOOLS_PROPERTY);
        properties().custom().codedata().kind("REQUIRED").stepOut()
                .metadata().label(permittedTools.label()).description(permittedTools.description()).stepOut()
                .typeConstraint(GLOBAL_SCOPE).value(new ArrayList<String>()).type(ValueType.MULTIPLE_SELECT)
                .editable().stepOut().addProperty(permittedTools.name());

        metadata().label(functionData.packageName()).description(functionData.description())
                .icon(generateIcon(functionData.org(), functionData.packageName(), functionData.version()));
        codedata().org(functionData.org()).module(functionData.moduleName()).packageName(functionData.packageName())
                .object(functionData.name()).version(functionData.version());

        setParameterProperties(functionData);

        if (hasCompatibleAiVersion(aiModuleVersion)) {
            properties().custom()
                    .metadata().label(TOOL_KIT_NAME_PROPERTY_LABEL).description(TOOL_KIT_NAME_DESCRIPTION).stepOut()
                    .typeConstraint(GLOBAL_SCOPE).value(TOOL_KIT_DEFAULT_CLASS_NAME).type(ValueType.IDENTIFIER)
                    .editable().stepOut().addProperty(TOOL_KIT_NAME_PROPERTY);
            setReturnType(AI_MCP_BASE_TOOL_KIT_TYPE_WITH_PREFIX, context);
        } else {
            setReturnType(functionData.returnType(), context);
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
                    .codedata().kind(param.kind().name()).originalName(param.name()).stepOut()
                    .placeholder(param.placeholder()).defaultValue(param.defaultValue())
                    .typeConstraint(param.type()).typeMembers(param.typeMembers()).imports(param.importStatements())
                    .editable().defaultable(param.optional());

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
                default -> builder.type(param.type() instanceof List<?> ? ValueType.SINGLE_SELECT
                        : ValueType.EXPRESSION);
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
                .data(returnType, context.getAllVisibleSymbolNames(), null, null);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        // TODO: if it's an update find find the already generated MCP toolkit class and update that

        Property toolKitNameProperty = getToolKitNameProperty(sourceBuilder.flowNode);
        Path connectionsFilePath = sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath)
                .resolve(CONNECTIONS_BAL);
        Range defaultRange = getDefaultLineRange(sourceBuilder, connectionsFilePath);
        Set<String> ignoredProperties = Set.of(VARIABLE_KEY, TYPE_KEY, SCOPE_KEY, CHECK_ERROR_KEY);
        if (toolKitNameProperty == null) {
            // Generate the following code
            // ```final ai:McpToolKit aiMcpToolkit = new ("http://...")```
            sourceBuilder.token().keyword(SyntaxKind.FINAL_KEYWORD).stepOut().newVariable()
                    .token().keyword(SyntaxKind.CHECK_KEYWORD).keyword(SyntaxKind.NEW_KEYWORD).stepOut()
                    .functionParameters(sourceBuilder.flowNode, ignoredProperties)
                    .acceptImport().textEdit();

        } else {
            // 1. Generate the MCP toolkit class in user code
            Property permittedToolsProperty = sourceBuilder.flowNode.properties().get(PERMITTED_TOOLS_PROPERTY);
            List<String> permittedTools = ((List<?>) permittedToolsProperty.value()).stream()
                    .filter(String.class::isInstance).map(String.class::cast).toList();
            String toolKitName = String.valueOf(toolKitNameProperty.value());

            sourceBuilder.acceptImport(Ai.BALLERINA_ORG, Ai.MCP_PACKAGE);
            sourceBuilder.acceptImport(Ai.BALLERINA_ORG, Ai.AI_PACKAGE);
            String sourceCode = generateMcpToolKitClassSource(toolKitName, permittedTools);
            sourceBuilder.token().source(sourceCode).skipFormatting().stepOut().textEdit();

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

    private String generateMcpToolKitClassSource(String className, List<String> permittedTools) {
        Map<String, String> toolMapping = generatePermittedToolsMapping(permittedTools);
        String permittedToolsMappingConstructorExp = toolMapping.entrySet().stream()
                .map(e -> "                \"" + e.getKey() + "\" : self." + e.getValue())
                .collect(Collectors.joining(",\n"));

        String toolFunctions = toolMapping.values().stream().map(this::getToolMethodSignature)
                .collect(Collectors.joining("\n"));

        return String.format(
                "isolated class %s {%n" +
                        "    *ai:McpBaseToolKit;%n" +
                        "    private final mcp:StreamableHttpClient mcpClient;%n" +
                        "    private final readonly & ai:ToolConfig[] tools;%n" +
                        "%n" +
                        "    public isolated function init(string serverUrl," +
                        " mcp:Implementation info = {name: \"MCP\", version: \"1.0.0\"},%n" +
                        "        *mcp:StreamableHttpClientTransportConfig config) returns ai:Error? {%n" +
                        "        final map<ai:FunctionTool> permittedTools = {%n" +
                        "%s%n" +
                        "        };" +
                        "%n" +
                        "        do {%n" +
                        "            self.mcpClient = check new mcp:StreamableHttpClient(serverUrl, config);%n" +
                        "            self.tools = check ai:getPermittedMcpToolConfigs(self.mcpClient, info," +
                        " permittedTools).cloneReadOnly();%n" +
                        "        } on fail error e {%n" +
                        "            return error ai:Error(\"Failed to initialize MCP toolkit\", e);%n" +
                        "        }%n" +
                        "    }%n" +
                        "%n" +
                        "    public isolated function getTools() returns ai:ToolConfig[] => self.tools;%n" +
                        "%n" +
                        "%s" +
                        "}%n",
                className, permittedToolsMappingConstructorExp, toolFunctions
        );
    }

    private String getToolMethodSignature(String toolName) {
        return String.format("    @ai:AgentTool%n"
                + "    public isolated function %s(mcp:CallToolParams params) returns mcp:CallToolResult|error {%n"
                + "        return self.mcpClient->callTool(params);%n"
                + "    }%n", toolName);
    }


    private Map<String, String> generatePermittedToolsMapping(List<String> permittedTools) {
        return permittedTools.stream().filter(tool -> tool != null && !tool.isBlank())
                .collect(Collectors.toMap(name -> name, this::toMethodName));
    }

    private String toMethodName(String toolName) {
        if (toolName == null || toolName.isBlank()) {
            throw new IllegalArgumentException("Input cannot be null or blank");
        }

        // If it's already a valid identifier and not a reserved word, return as-is
        Set<String> predefinedMembers = Set.of("init", "getTools", "mcpClient", "tools");
        if (Character.isJavaIdentifierStart(toolName.charAt(0))
                && toolName.chars().allMatch(Character::isJavaIdentifierPart) &&
                !SyntaxInfo.isKeyword(toolName) && !predefinedMembers.contains(toolName)) {
            return toolName;
        }

        // Otherwise, generate a method name from the input
        String[] parts = toolName.split("\\s+");
        StringBuilder sb = new StringBuilder(parts[0].toLowerCase(Locale.UK));
        for (int i = 1; i < parts.length; i++) {
            String part = parts[i];
            if (!part.isEmpty()) {
                sb.append(Character.toUpperCase(part.charAt(0)))
                        .append(part.substring(1).toLowerCase(Locale.UK));
            }
        }
        String methodName = sb.toString();

        if (!Character.isJavaIdentifierStart(methodName.charAt(0))) {
            methodName = "_" + methodName;
        }
        methodName = methodName.chars()
                .mapToObj(c -> Character.isJavaIdentifierPart(c) ? String.valueOf((char) c) : "_")
                .collect(Collectors.joining());

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
