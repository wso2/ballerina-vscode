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

package io.ballerina.servicemodelgenerator.extension.builder.function;

import com.google.gson.Gson;
import com.google.gson.stream.JsonReader;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.MetadataNode;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.PropertyType;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import io.ballerina.servicemodelgenerator.extension.util.Utils;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.MCP;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.NEW_LINE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.REMOTE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SPACE;
import static java.util.regex.Matcher.quoteReplacement;
import static java.util.regex.Pattern.quote;

public class McpFunctionBuilder extends AbstractFunctionBuilder {

    private static final String MCP_FUNCTION_MODEL_LOCATION = "functions/mcp_tool.json";
    private static final String TOOL_DESCRIPTION_PROPERTY = "toolDescription";

    // Documentation format constants
    private static final String DOC_COMMENT_PREFIX = "# ";
    private static final String DOC_COMMENT_SEPARATOR = "    #";
    private static final String DOC_RETURN_PREFIX = "    # + return - ";
    private static final String PARAM_DOC_PATTERN_STR = "# + ";

    // Regex pattern for parameter documentation
    private static final Pattern PARAM_PATTERN = Pattern.compile("^\\s*#\\s*\\+\\s+(\\w+)\\s*-\\s*(.*)$");

    /**
     * Updates a TextEdit containing existing documentation.
     *
     * @param edit            The TextEdit to update
     * @param originalText    The original text content
     * @param toolDescription The tool description to add
     * @param returnType      The return type description
     */
    private static void updateDocumentationEdit(TextEdit edit, String originalText,
                                                String toolDescription, String returnType) {
        int firstHashIndex = originalText.indexOf('#');
        String leading = originalText.substring(0, firstHashIndex);
        String docContent = originalText.substring(firstHashIndex);

        StringBuilder newDoc = new StringBuilder(leading);
        String toolDescSection = buildToolDescriptionSection(toolDescription);
        if (!toolDescSection.isEmpty()) {
            newDoc.append(toolDescSection);
            newDoc.append("    ");
        }
        newDoc.append(docContent);

        // Add return type if not present
        if (!newDoc.toString().contains(DOC_RETURN_PREFIX)) {
            newDoc.append(NEW_LINE).append("    ").append(buildReturnTypeSection(returnType));
        }

        edit.setNewText(newDoc.toString());
    }

    /**
     * Loads the MCP function model template from resources.
     *
     * @return Optional containing the function model template, or empty if loading fails
     */
    private static Optional<Function> getMcpFunctionModel() {
        InputStream resourceStream = Utils.class.getClassLoader()
                .getResourceAsStream(MCP_FUNCTION_MODEL_LOCATION);
        if (resourceStream == null) {
            // Resource file not found - this indicates a packaging issue
            return Optional.empty();
        }

        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            Function function = new Gson().fromJson(reader, Function.class);
            if (function == null) {
                // JSON parsing resulted in null - invalid template format
                return Optional.empty();
            }
            return Optional.of(function);
        } catch (IOException e) {
            // Failed to read or parse the template file
            return Optional.empty();
        }
    }

    private static Map<String, List<TextEdit>> addFunctionDocumentation(Map<String, List<TextEdit>> textEdits,
                                                                        AddModelContext context,
                                                                        String toolDescription) {
        String returnType = getReturnTypeDescription(context.function());
        String functionName = context.function().getName().getValue();
        String remoteFunctionPattern = REMOTE + SPACE + "function" + SPACE + functionName;

        Optional<TextEdit> remoteFunctionEdit = findRemoteFunctionEdit(textEdits, functionName);
        if (remoteFunctionEdit.isEmpty()) {
            return textEdits;
        }

        TextEdit edit = remoteFunctionEdit.get();
        String originalText = edit.getNewText();

        // Check if there are parameter docs
        if (originalText.contains(PARAM_DOC_PATTERN_STR)) {
            // Has parameters - insert tool description before first parameter
            String result = insertToolDescriptionBeforeParams(originalText, toolDescription, returnType,
                    remoteFunctionPattern);
            edit.setNewText(result);
        } else {
            // No parameters - create complete documentation
            String docString = buildCompleteDocumentation(toolDescription, "", returnType);
            String result = originalText.replaceFirst(quote(remoteFunctionPattern),
                    quoteReplacement(docString + "    " + remoteFunctionPattern));
            edit.setNewText(result);
        }

        return textEdits;
    }

    /**
     * Inserts tool description before parameter documentation.
     *
     * @param originalText          The original text content
     * @param toolDescription       The tool description to add
     * @param returnType            The return type description
     * @param remoteFunctionPattern The pattern to find the function signature
     * @return Updated text with documentation
     */
    private static String insertToolDescriptionBeforeParams(String originalText, String toolDescription,
                                                            String returnType, String remoteFunctionPattern) {
        String result = originalText;

        // Add tool description before first parameter if present
        if (toolDescription != null && !toolDescription.trim().isEmpty()) {
            String toolDescSection = buildToolDescriptionSection(toolDescription);
            // Need to escape special regex characters in PARAM_DOC_PATTERN_STR for replaceFirst
            String escapedPattern = quote(PARAM_DOC_PATTERN_STR);
            result = result.replaceFirst(escapedPattern,
                    quoteReplacement(toolDescSection + "    " + PARAM_DOC_PATTERN_STR));
        }

        // Add return documentation before function signature if not present
        if (!result.contains(DOC_RETURN_PREFIX)) {
            String returnDoc = "    " + buildReturnTypeSection(returnType) + "    ";
            result = result.replaceFirst(quote(remoteFunctionPattern),
                    quoteReplacement(returnDoc + remoteFunctionPattern));
        }

        return result;
    }

    /**
     * Extracts the tool description from the function properties.
     *
     * @param function The function model
     * @return The tool description or null if not present
     */
    private static String extractToolDescription(Function function) {
        return function.getProperties().containsKey(TOOL_DESCRIPTION_PROPERTY)
                ? function.getProperties().get(TOOL_DESCRIPTION_PROPERTY).getValue()
                : null;
    }

    /**
     * Gets the return type description from the function.
     *
     * @param function The function model
     * @return The return type or empty string if not present
     */
    private static String getReturnTypeDescription(Function function) {
        return function.getReturnType() != null
                ? function.getReturnType().getValue()
                : "";
    }

    /**
     * Builds the tool description section of the documentation.
     *
     * @param toolDescription The tool description text
     * @return The formatted tool description section
     */
    private static String buildToolDescriptionSection(String toolDescription) {
        if (toolDescription == null || toolDescription.trim().isEmpty()) {
            return "";
        }
        return DOC_COMMENT_PREFIX + toolDescription + NEW_LINE +
                DOC_COMMENT_SEPARATOR + NEW_LINE;
    }

    /**
     * Builds the return type documentation line.
     *
     * @param returnType The return type description
     * @return The formatted return type documentation
     */
    private static String buildReturnTypeSection(String returnType) {
        return DOC_RETURN_PREFIX + returnType + NEW_LINE;
    }

    /**
     * Builds complete documentation with tool description, parameters, and return type.
     *
     * @param toolDescription The tool description (can be null)
     * @param parameterDocs   Existing parameter documentation (can be empty)
     * @param returnType      The return type description
     * @return Complete formatted documentation
     */
    private static String buildCompleteDocumentation(String toolDescription, String parameterDocs, String returnType) {
        StringBuilder doc = new StringBuilder();

        String toolDescSection = buildToolDescriptionSection(toolDescription);
        if (!toolDescSection.isEmpty()) {
            doc.append(toolDescSection);
        }

        if (parameterDocs != null && !parameterDocs.isEmpty()) {
            doc.append("    ").append(parameterDocs);
            if (!doc.toString().contains(DOC_RETURN_PREFIX)) {
                doc.append(NEW_LINE);
            }
        }

        if (!doc.toString().contains(DOC_RETURN_PREFIX)) {
            doc.append("    ").append(buildReturnTypeSection(returnType));
        }

        return doc.toString();
    }

    /**
     * Finds the TextEdit containing the remote function pattern.
     *
     * @param textEdits    Map of text edits
     * @param functionName The function name to search for
     * @return Optional containing the matching TextEdit
     */
    private static Optional<TextEdit> findRemoteFunctionEdit(Map<String, List<TextEdit>> textEdits,
                                                             String functionName) {
        String remoteFunctionPattern = REMOTE + SPACE + "function" + SPACE + functionName;
        return textEdits.values().stream()
                .flatMap(List::stream)
                .filter(edit -> edit.getNewText() != null && edit.getNewText().contains(remoteFunctionPattern))
                .findFirst();
    }

    /**
     * Finds the first TextEdit in the result map.
     *
     * @param textEdits Map of text edits
     * @return Optional containing the first TextEdit
     */
    private static Optional<TextEdit> findFirstEdit(Map<String, List<TextEdit>> textEdits) {
        return textEdits.values().stream()
                .flatMap(List::stream)
                .findFirst();
    }

    /**
     * Parses the markdown documentation string and populates the function model.
     *
     * @param function      The function model to populate
     * @param documentation The markdown documentation string
     */
    public static void parseDocumentation(Function function, String documentation) {
        if (documentation == null || documentation.trim().isEmpty()) {
            return;
        }

        String[] lines = documentation.split("\\r?\\n");
        String toolDescription = null;
        Map<String, String> paramDocs = new HashMap<>();

        for (String line : lines) {
            String trimmedLine = line.trim();

            // Extract tool description (first line starting with # but not # + pattern)
            if (toolDescription == null && trimmedLine.startsWith("#") && !trimmedLine.matches("^#\\s*\\+.*")) {
                toolDescription = trimmedLine.replaceFirst("^#\\s*", "").trim();
                continue;
            }

            // Extract parameter documentation using the static pattern
            Matcher paramMatcher = PARAM_PATTERN.matcher(trimmedLine);
            if (paramMatcher.matches()) {
                String paramName = paramMatcher.group(1);
                String paramDoc = paramMatcher.group(2);
                if (!paramName.equals("return")) {
                    paramDocs.put(paramName, paramDoc);
                }
            }
        }

        // Set tool description in function properties
        if (toolDescription != null && !toolDescription.isEmpty()) {
            Value toolDescValue =
                    new Value.ValueBuilder()
                            .metadata("Tool Description", "Description of what this MCP tool does")
                            .setPlaceholder("Describe what this tool does...")
                            .types(List.of(PropertyType.types(Value.FieldType.TEXT, "string")))
                            .value(toolDescription)
                            .enabled(true)
                            .editable(true)
                            .optional(true)
                            .setAdvanced(false)
                            .build();
            function.getProperties().put(TOOL_DESCRIPTION_PROPERTY, toolDescValue);
        }

        // Set parameter documentation
        if (function.getParameters() != null) {
            for (Parameter param : function.getParameters()) {
                String paramName = param.getName().getValue();
                if (paramDocs.containsKey(paramName)) {
                    if (param.getDocumentation() == null) {
                        Value paramDocValue =
                                new Value.ValueBuilder()
                                        .value(paramDocs.get(paramName))
                                        .build();
                        param.setDocumentation(paramDocValue);
                    } else {
                        param.getDocumentation().setValue(paramDocs.get(paramName));
                    }
                }
            }
        }
    }

    @Override
    public Optional<Function> getModelTemplate(GetModelContext context) {
        return getMcpFunctionModel();
    }

    @Override
    public Map<String, List<TextEdit>> addModel(AddModelContext context) throws Exception {
        Map<String, List<TextEdit>> textEdits = super.addModel(context);
        String toolDescription = extractToolDescription(context.function());
        return addFunctionDocumentation(textEdits, context, toolDescription);
    }

    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        Map<String, List<TextEdit>> result = super.updateModel(context);

        String toolDescription = extractToolDescription(context.function());
        String returnType = getReturnTypeDescription(context.function());

        Optional<TextEdit> firstEdit = findFirstEdit(result);
        if (firstEdit.isEmpty()) {
            return result;
        }

        TextEdit edit = firstEdit.get();
        String originalText = edit.getNewText();

        if (originalText == null) {
            return result;
        }

        String stripped = originalText.stripLeading();

        if (stripped.startsWith("#")) {
            // Has documentation - keep it and add tool desc + return type
            updateDocumentationEdit(edit, originalText, toolDescription, returnType);
        } else if (stripped.isEmpty()) {
            // Empty string - add only tool desc and return type
            String newDoc = buildCompleteDocumentation(toolDescription, "", returnType);
            edit.setNewText(newDoc);
        } else {
            // Non-documentation content - skip update
            // This could be other code content that shouldn't have documentation prepended
        }

        return result;
    }

    @Override
    public Function getModelFromSource(ModelFromSourceContext context) {
        Function function = super.getModelFromSource(context);

        // Extract and parse documentation from the function node
        FunctionDefinitionNode functionNode = (FunctionDefinitionNode) context.node();
        if (functionNode.metadata().isPresent()) {
            MetadataNode metadata = functionNode.metadata().get();
            if (metadata.documentationString().isPresent()) {
                String documentation = metadata.documentationString().get().toString();
                parseDocumentation(function, documentation);
            }
        }

        return function;
    }

    @Override
    public String kind() {
        return MCP;
    }
}
