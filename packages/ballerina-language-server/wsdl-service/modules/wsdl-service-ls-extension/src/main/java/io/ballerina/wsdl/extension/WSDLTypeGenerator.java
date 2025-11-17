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

package io.ballerina.wsdl.extension;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.projects.Document;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.wsdl.core.WsdlToBallerina;
import io.ballerina.wsdl.core.WsdlToBallerinaResponse;
import io.ballerina.wsdl.core.diagnostic.DiagnosticMessage;
import io.ballerina.wsdl.core.generator.GeneratedSource;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.TextEdit;
import org.xml.sax.InputSource;

import java.io.ByteArrayInputStream;
import java.nio.charset.Charset;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.wsdl.Definition;
import javax.wsdl.WSDLException;
import javax.wsdl.factory.WSDLFactory;
import javax.wsdl.xml.WSDLReader;

/**
 * Generates Ballerina types from WSDL file.
 *
 * @since 1.4.0
 */
public class WSDLTypeGenerator {
    private static final String DEFAULT_TARGET_FILE = "types.bal";
    private static final String LS = System.lineSeparator();

    private final String wsdlContent;
    private final Path projectPath;
    private final WorkspaceManager workspaceManager;
    private final String portName;
    private final Gson gson;

    public WSDLTypeGenerator(String wsdlContent, Path projectPath, WorkspaceManager workspaceManager,
                            String portName) {
        this.wsdlContent = wsdlContent;
        this.projectPath = projectPath;
        this.workspaceManager = workspaceManager;
        this.portName = portName;
        this.gson = new Gson();
    }

    /**
     * Generates Ballerina types from the WSDL content and returns text edits to be applied.
     * The types will always be appended to types.bal file.
     *
     * @return JsonElement containing the text edits to be applied
     * @throws Exception if an error occurs during type generation
     */
    public JsonElement generateTypes() throws Exception {
        WsdlToBallerinaResponse wsdlResponse;
        try {
            Definition wsdlDefinition = parseWSDLContent(wsdlContent);
            WsdlToBallerina wsdlToBallerina = new WsdlToBallerina();
            wsdlResponse = new WsdlToBallerinaResponse();
            List<DiagnosticMessage> diagnosticMessages = new ArrayList<>();

            // Generate from WSDL - we pass empty string for outputDirectory as we'll handle file operations
            wsdlToBallerina.generateFromWSDL(wsdlResponse, wsdlDefinition, "",
                                            diagnosticMessages, new String[0], portName);

            // Check for errors in diagnostics
            if (!diagnosticMessages.isEmpty()) {
                StringBuilder errorMessages = new StringBuilder();
                for (DiagnosticMessage diagnostic : diagnosticMessages) {
                    if (diagnostic.getSeverity().toString().equals("ERROR")) {
                        errorMessages.append(diagnostic.getDescription()).append(LS);
                    }
                }
                if (!errorMessages.isEmpty()) {
                    throw new WSDLGenerationException("Errors occurred while generating types from WSDL:" + LS +
                            errorMessages);
                }
            }
        } catch (WSDLException e) {
            throw new WSDLGenerationException("Failed to parse WSDL content: " + e.getMessage(), e);
        }

        // Extract types from the response (schema types + envelope types from client)
        GeneratedSource typesSource = wsdlResponse.getTypesSource();
        if (typesSource == null || typesSource.content() == null || typesSource.content().isEmpty()) {
            throw new WSDLGenerationException("No types were generated from the provided WSDL file");
        }

        StringBuilder allTypes = new StringBuilder();
        allTypes.append(typesSource.content());

        // Extract envelope types from client sources (excluding the client class)
        for (GeneratedSource clientSource : wsdlResponse.getClientSources()) {
            String envelopeTypes = extractEnvelopeTypes(clientSource.content());
            if (!envelopeTypes.isEmpty()) {
                allTypes.append(LS).append(LS).append(envelopeTypes);
            }
        }

        String generatedTypes = allTypes.toString();
        generatedTypes = handleTypeNameCollisions(generatedTypes);

        // Process text edits for the target file
        Path targetFilePath = projectPath.resolve(DEFAULT_TARGET_FILE);
        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        Optional<Document> documentOpt = this.workspaceManager.document(targetFilePath);

        SeparatedContent separatedContent = separateImportsAndTypes(generatedTypes);
        if (documentOpt.isPresent()) {
            Document document = documentOpt.get();
            ModulePartNode modulePartNode = document.syntaxTree().rootNode();
            List<TextEdit> textEdits = new java.util.ArrayList<>();

            String newImports = filterExistingImports(separatedContent.imports, modulePartNode);
            if (!newImports.isEmpty()) {
                LinePosition importPos = getImportInsertPosition(modulePartNode);
                textEdits.add(new TextEdit(CommonUtils.toRange(importPos), newImports));
            }

            LinePosition endPos = LinePosition.from(modulePartNode.lineRange().endLine().line() + 1, 0);
            String contentToAppend = LS + separatedContent.types;
            textEdits.add(new TextEdit(CommonUtils.toRange(endPos), contentToAppend));

            textEditsMap.put(targetFilePath, textEdits);
        } else {
            List<TextEdit> textEdits = new java.util.ArrayList<>();
            LinePosition startPos = LinePosition.from(0, 0);
            if (!separatedContent.imports.isEmpty()) {
                textEdits.add(new TextEdit(CommonUtils.toRange(startPos), separatedContent.imports + LS + LS));
            }
            int typesStartLine = separatedContent.imports.isEmpty() ? 0 :
                    (int) separatedContent.imports.lines().count() + 2;
            LinePosition typesPos = LinePosition.from(typesStartLine, 0);
            textEdits.add(new TextEdit(CommonUtils.toRange(typesPos), separatedContent.types));

            textEditsMap.put(targetFilePath, textEdits);
        }

        return gson.toJsonTree(textEditsMap);
    }

    /**
     * Parses WSDL content string into a WSDL Definition object.
     *
     * @param wsdlDefinitionText WSDL content as string
     * @return Parsed WSDL Definition
     * @throws WSDLException if parsing fails
     */
    private Definition parseWSDLContent(String wsdlDefinitionText) throws WSDLException {
        WSDLReader reader = WSDLFactory.newInstance().newWSDLReader();
        reader.setFeature("javax.wsdl.verbose", false);
        reader.setFeature("javax.wsdl.importDocuments", true);
        return reader.readWSDL(null, new InputSource(
                new ByteArrayInputStream(wsdlDefinitionText.getBytes(Charset.defaultCharset()))));
    }

    /**
     * Extracts envelope type definitions from client source code, excluding the client class.
     *
     * @param clientContent The generated client source code
     * @return String containing only the envelope type definitions
     */
    private String extractEnvelopeTypes(String clientContent) {
        String[] lines = clientContent.split(LS);
        StringBuilder types = new StringBuilder();
        boolean inTypeDefinition = false;
        boolean inClientClass = false;
        int braceCount = 0;
        StringBuilder currentType = new StringBuilder();

        for (String line : lines) {
            String trimmedLine = line.trim();

            // Skip import statements
            if (trimmedLine.startsWith("import ")) {
                continue;
            }

            // Check if we're starting a client class
            if (trimmedLine.contains("public isolated client class") ||
                trimmedLine.contains("public client class")) {
                inClientClass = true;
                braceCount = 0;
                continue;
            }

            // If in client class, track braces to know when it ends
            if (inClientClass) {
                for (char c : line.toCharArray()) {
                    if (c == '{') {
                        braceCount++;
                    }
                    if (c == '}') {
                        braceCount--;
                    }
                }
                if (braceCount == 0 && line.contains("}")) {
                    inClientClass = false;
                }
                continue;
            }

            // Check if we're starting a type definition
            if (trimmedLine.startsWith("public type ") || trimmedLine.startsWith("@xmldata:")) {
                if (!inTypeDefinition && trimmedLine.startsWith("public type ")) {
                    inTypeDefinition = true;
                    braceCount = 0;
                }
                currentType.append(line).append(LS);

                // Count braces
                for (char c : line.toCharArray()) {
                    if (c == '{') {
                        braceCount++;
                    }
                    if (c == '}') {
                        braceCount--;
                    }
                }

                // Check if type definition is complete
                if (inTypeDefinition && braceCount == 0 && line.contains(";")) {
                    types.append(currentType);
                    currentType = new StringBuilder();
                    inTypeDefinition = false;
                }
            } else if (inTypeDefinition) {
                currentType.append(line).append(LS);

                // Count braces
                for (char c : line.toCharArray()) {
                    if (c == '{') {
                        braceCount++;
                    }
                    if (c == '}') {
                        braceCount--;
                    }
                }

                // Check if type definition is complete
                if (braceCount == 0 && line.contains(";")) {
                    types.append(currentType);
                    currentType = new StringBuilder();
                    inTypeDefinition = false;
                }
            }
        }

        return types.toString().trim();
    }

    /**
     * Handles type name collisions by renaming conflicting types and updating all references.
     *
     * @param generatedTypes The generated Ballerina types
     * @return The generated types with resolved name collisions
     */
    private String handleTypeNameCollisions(String generatedTypes) {

        List<String> existingTypeNames = getExistingTypeNames();
        Map<String, String> typeRenames = new HashMap<>();
        Pattern typeDefPattern = Pattern.compile("^\\s*(?:public\\s+)?type\\s+(\\w+)\\s+", Pattern.MULTILINE);
        Matcher matcher = typeDefPattern.matcher(generatedTypes);

        while (matcher.find()) {
            String typeName = matcher.group(1);
            String updatedTypeName = getUpdatedTypeName(typeName, existingTypeNames, typeRenames);
            if (!typeName.equals(updatedTypeName)) {
                typeRenames.put(typeName, updatedTypeName);
                existingTypeNames.add(updatedTypeName);
            }
        }

        return applyTypeRenames(generatedTypes, typeRenames);
    }

    /**
     * Gets existing type names from the target file.
     *
     * @return List of existing type names
     */
    private List<String> getExistingTypeNames() {
        List<String> existingTypeNames = new ArrayList<>();
        Path targetFilePath = projectPath.resolve(DEFAULT_TARGET_FILE);
        Optional<Document> documentOpt = this.workspaceManager.document(targetFilePath);

        if (documentOpt.isPresent()) {
            Document document = documentOpt.get();
            List<Symbol> typeDefSymbols = document.module().getCompilation()
                    .getSemanticModel().moduleSymbols()
                    .stream().filter(symbol -> symbol.kind() == SymbolKind.TYPE_DEFINITION).toList();

            for (Symbol symbol : typeDefSymbols) {
                symbol.getName().ifPresent(existingTypeNames::add);
            }
        }

        return existingTypeNames;
    }

    /**
     * Gets an updated type name if the given name already exists.
     *
     * @param typeName          Type name to check
     * @param existingTypeNames List of existing type names
     * @param typeRenames       Map of type renames already performed
     * @return Updated type name
     */
    private String getUpdatedTypeName(String typeName, List<String> existingTypeNames,
                                      Map<String, String> typeRenames) {
        if (typeRenames.containsKey(typeName)) {
            return typeRenames.get(typeName);
        }

        if (!existingTypeNames.contains(typeName) && !typeRenames.containsValue(typeName)) {
            return typeName;
        }

        // Type name exists, generate a new one with numeric suffix
        String[] parts = typeName.split("_");
        String lastPart = parts[parts.length - 1];

        if (isNumeric(lastPart)) {
            // Already has a numeric suffix, increment it
            String baseName = String.join("_", Arrays.copyOfRange(parts, 0, parts.length - 1));
            int nextNumber = Integer.parseInt(lastPart) + 1;
            String newName = baseName + "_" + String.format("%02d", nextNumber);
            return getUpdatedTypeName(newName, existingTypeNames, typeRenames);
        } else {
            // No numeric suffix, add _01
            return getUpdatedTypeName(typeName + "_01", existingTypeNames, typeRenames);
        }
    }

    /**
     * Checks if a string represents a valid integer.
     *
     * @param str String to check
     * @return true if the string is a valid integer
     */
    private boolean isNumeric(String str) {
        if (str == null || str.isEmpty()) {
            return false;
        }
        try {
            Integer.parseInt(str);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /**
     * Applies type renames to the generated types content.
     *
     * @param generatedTypes The generated types
     * @param typeRenames    Map of old type names to new type names
     * @return The generated types with renames applied
     */
    private String applyTypeRenames(String generatedTypes, Map<String, String> typeRenames) {
        if (typeRenames.isEmpty()) {
            return generatedTypes;
        }

        String result = generatedTypes;

        for (Map.Entry<String, String> entry : typeRenames.entrySet()) {
            String oldName = entry.getKey();
            String newName = entry.getValue();

            // Replace type definitions
            result = result.replaceAll(
                    "\\b(type\\s+)" + Pattern.quote(oldName) + "\\b",
                    "$1" + newName
            );

            // Replace type references
            result = result.replaceAll(
                    "(?<![\\w])(" + Pattern.quote(oldName) + ")(?![\\w])",
                    newName
            );
        }

        return result;
    }

    /**
     * Separates imports from type definitions in the generated content.
     *
     * @param generatedTypes The generated Ballerina types including imports
     * @return SeparatedContent containing imports and types separately
     */
    private SeparatedContent separateImportsAndTypes(String generatedTypes) {
        String[] lines = generatedTypes.split(LS);
        StringBuilder imports = new StringBuilder();
        StringBuilder types = new StringBuilder();

        for (String line : lines) {
            String trimmedLine = line.trim();
            if (trimmedLine.startsWith("import ") && trimmedLine.endsWith(";")) {
                imports.append(line).append(LS);
            } else if (!trimmedLine.isEmpty() || !types.isEmpty()) {
                types.append(line).append(LS);
            }
        }

        return new SeparatedContent(imports.toString().trim(), types.toString().trim());
    }

    /**
     * Filters out imports that already exist in the target file.
     *
     * @param imports         The import statements to filter
     * @param modulePartNode  The syntax tree of the existing file
     * @return Import statements that don't already exist in the file
     */
    private String filterExistingImports(String imports, ModulePartNode modulePartNode) {
        if (imports.isEmpty()) {
            return "";
        }

        String[] lines = imports.split(LS);
        StringBuilder result = new StringBuilder();

        for (String line : lines) {
            String trimmedLine = line.trim();
            if (trimmedLine.startsWith("import ") && trimmedLine.endsWith(";")) {
                String importPart = trimmedLine.substring(7, trimmedLine.length() - 1).trim();
                String[] parts = importPart.split("/");
                if (parts.length == 2) {
                    String org = parts[0];
                    String module = parts[1];
                    if (CommonUtils.importExists(modulePartNode, org, module)) {
                        continue;
                    }
                }
            }
            result.append(line).append(LS);
        }

        return result.toString().trim();
    }

    /**
     * Determines the position where new imports should be inserted.
     * Returns position after the last existing import or at the beginning if no imports exist.
     *
     * @param modulePartNode The syntax tree of the existing file
     * @return LinePosition where imports should be inserted
     */
    private LinePosition getImportInsertPosition(ModulePartNode modulePartNode) {
        if (!modulePartNode.imports().isEmpty()) {
            int lastImportLine = modulePartNode.imports().get(modulePartNode.imports().size() - 1)
                    .lineRange().endLine().line();
            return LinePosition.from(lastImportLine + 1, 0);
        }

        return LinePosition.from(0, 0);
    }

    /**
     * Record class to hold separated imports and type definitions.
     *
     * @param imports The import statements
     * @param types The type definitions
     */
    private record SeparatedContent(String imports, String types) {
    }

    /**
     * Custom exception for WSDL generation errors.
     */
    public static class WSDLGenerationException extends Exception {
        public WSDLGenerationException(String message) {
            super(message);
        }

        public WSDLGenerationException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
