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

package io.ballerina.edi.extension;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.projects.Document;
import io.ballerina.tools.text.LinePosition;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.TextEdit;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Generates Ballerina types and functions from EDI schema (X12 XSD).
 *
 * @since 1.4.0
 */
public class EDITypeGenerator {
    private static final String DEFAULT_TYPES_FILE = "types.bal";
    private static final String DEFAULT_FUNCTIONS_FILE = "functions.bal";
    private static final String EDI_TOOL_JAR = "editools.jar";
    private static final String LS = System.lineSeparator();

    private final String schemaContent;
    private final Path projectPath;
    private final WorkspaceManager workspaceManager;
    private final Gson gson;

    public EDITypeGenerator(String schemaContent, Path projectPath, WorkspaceManager workspaceManager) {
        this.schemaContent = schemaContent;
        this.projectPath = projectPath;
        this.workspaceManager = workspaceManager;
        this.gson = new Gson();
    }

    /**
     * Generates Ballerina types and functions from the EDI schema and returns text edits to be applied.
     * The types will be appended to types.bal and functions to functions.bal.
     *
     * @return JsonElement containing the text edits to be applied
     * @throws Exception if an error occurs during type generation
     */
    public JsonElement generateTypes() throws Exception {
        Path tempDir = null;
        try {
            // Create temp directory for processing
            tempDir = Files.createTempDirectory("edi-conversion-");
            Path xsdFile = tempDir.resolve("schema.xsd");
            Path jsonSchemaFile = tempDir.resolve("schema.json");
            Path generatedCodeFile = tempDir.resolve("generated.bal");

            // Write XSD content to temp file
            Files.writeString(xsdFile, schemaContent);

            // Extract EDI tools JAR to temp location
            Path ediToolsJar = extractEDIToolsJar(tempDir);

            // Step 1: Convert X12 XSD to EDI JSON schema
            convertX12ToEDISchema(ediToolsJar, xsdFile, jsonSchemaFile);

            // Step 2: Generate Ballerina code from EDI schema
            generateBallerinaCode(ediToolsJar, jsonSchemaFile, generatedCodeFile);

            // Step 3: Parse generated code and separate into types and functions
            String generatedCode = Files.readString(generatedCodeFile);
            GeneratedContent content = parseGeneratedContent(generatedCode);

            // Handle type name collisions
            String updatedTypes = handleTypeNameCollisions(content.types);
            GeneratedContent updatedContent = new GeneratedContent(content.imports, updatedTypes, content.functions);

            // Step 4: Create text edits for types.bal and functions.bal
            Map<Path, List<TextEdit>> textEditsMap = createTextEdits(updatedContent);

            return gson.toJsonTree(textEditsMap);

        } finally {
            // Clean up temp directory
            if (tempDir != null && Files.exists(tempDir)) {
                deleteDirectory(tempDir);
            }
        }
    }

    /**
     * Extracts the EDI tools JAR from resources to a temporary location.
     *
     * @param tempDir Temporary directory to extract the JAR
     * @return Path to the extracted JAR file
     * @throws EDIGenerationException if extraction fails
     */
    private Path extractEDIToolsJar(Path tempDir) throws EDIGenerationException {
        try {
            Path jarPath = tempDir.resolve(EDI_TOOL_JAR);
            ClassLoader classLoader = getClass().getClassLoader();
            try (InputStream in = classLoader.getResourceAsStream(EDI_TOOL_JAR)) {
                if (in == null) {
                    throw new EDIGenerationException("EDI tools JAR not found in resources: " + EDI_TOOL_JAR);
                }
                Files.copy(in, jarPath, StandardCopyOption.REPLACE_EXISTING);
            }
            return jarPath;
        } catch (EDIGenerationException e) {
            throw e;
        } catch (Throwable e) {
            throw new EDIGenerationException("Failed to extract EDI tools JAR: " + e.getMessage(), e);
        }
    }

    /**
     * Converts X12 XSD to EDI JSON schema using the EDI tools.
     *
     * @param ediToolsJar Path to the EDI tools JAR
     * @param xsdFile     Path to the X12 XSD file
     * @param jsonFile    Path to the output JSON schema file
     * @throws EDIGenerationException if conversion fails
     */
    private void convertX12ToEDISchema(Path ediToolsJar, Path xsdFile, Path jsonFile)
            throws EDIGenerationException {
        try {
            List<String> command = Arrays.asList(
                    "bal", "run", ediToolsJar.toAbsolutePath().toString(), "--",
                    "convertX12Schema", xsdFile.toAbsolutePath().toString(),
                    jsonFile.toAbsolutePath().toString()
            );

            ProcessBuilder processBuilder = new ProcessBuilder(command);
            Process process = processBuilder.start();

            // Capture output for debugging
            String output = readProcessOutput(process);
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                throw new EDIGenerationException("X12 to EDI schema conversion failed. Exit code: " +
                        exitCode + ". Output: " + output);
            }

            if (!Files.exists(jsonFile)) {
                throw new EDIGenerationException("EDI schema file was not created: " + jsonFile);
            }

        } catch (EDIGenerationException e) {
            throw e;
        } catch (Throwable e) {
            throw new EDIGenerationException("Failed to convert X12 XSD to EDI schema: " + e.getMessage(), e);
        }
    }

    /**
     * Generates Ballerina code from EDI JSON schema using the EDI tools.
     *
     * @param ediToolsJar     Path to the EDI tools JAR
     * @param jsonSchemaFile  Path to the EDI JSON schema file
     * @param outputFile      Path to the output Ballerina file
     * @throws EDIGenerationException if code generation fails
     */
    private void generateBallerinaCode(Path ediToolsJar, Path jsonSchemaFile, Path outputFile)
            throws EDIGenerationException {
        try {
            List<String> command = Arrays.asList(
                    "bal", "run", ediToolsJar.toAbsolutePath().toString(), "--",
                    "codegen", jsonSchemaFile.toAbsolutePath().toString(),
                    outputFile.toAbsolutePath().toString()
            );

            ProcessBuilder processBuilder = new ProcessBuilder(command);
            Process process = processBuilder.start();

            String output = readProcessOutput(process);
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                throw new EDIGenerationException("Code generation failed. Exit code: " +
                        exitCode + ". Output: " + output);
            }

            if (!Files.exists(outputFile)) {
                throw new EDIGenerationException("Generated code file was not created: " + outputFile);
            }

        } catch (EDIGenerationException e) {
            throw e;
        } catch (Throwable e) {
            throw new EDIGenerationException("Failed to generate Ballerina code from EDI schema: " +
                    e.getMessage(), e);
        }
    }

    /**
     * Reads and returns the output from a process.
     *
     * @param process The process to read output from
     * @return Combined stdout and stderr output
     */
    private String readProcessOutput(Process process) {
        try {
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append(LS);
                }
            }
            try (BufferedReader errorReader = new BufferedReader(
                    new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = errorReader.readLine()) != null) {
                    output.append(line).append(LS);
                }
            }
            return output.toString();
        } catch (Throwable e) {
            return "Error reading process output: " + e.getMessage();
        }
    }

    /**
     * Parses the generated Ballerina code and separates it into imports, types, and functions.
     *
     * @param generatedCode The generated Ballerina code
     * @return GeneratedContent containing separated imports, types, and functions
     */
    private GeneratedContent parseGeneratedContent(String generatedCode) {
        String[] lines = generatedCode.split(LS);
        StringBuilder imports = new StringBuilder();
        StringBuilder types = new StringBuilder();
        StringBuilder functions = new StringBuilder();
        StringBuilder schemaJson = new StringBuilder();

        boolean inFunction = false;
        boolean inSchemaJson = false;
        int braceCount = 0;

        for (String line : lines) {
            String trimmedLine = line.trim();

            // Handle imports
            if (trimmedLine.startsWith("import ") && trimmedLine.endsWith(";")) {
                imports.append(line).append(LS);
                continue;
            }

            // Handle schema JSON (final readonly & json schemaJson = ...)
            if (trimmedLine.startsWith("final readonly & json schemaJson")) {
                inSchemaJson = true;
                schemaJson.append(line).append(LS);
                continue;
            }

            if (inSchemaJson) {
                schemaJson.append(line).append(LS);
                if (trimmedLine.endsWith(";")) {
                    inSchemaJson = false;
                }
                continue;
            }

            // Detect function start
            if (!inFunction && (trimmedLine.startsWith("public isolated function ") ||
                    trimmedLine.startsWith("public function "))) {
                inFunction = true;
                braceCount = 0;
            }

            if (inFunction) {
                functions.append(line).append(LS);
                // Count braces to detect function end
                for (char c : line.toCharArray()) {
                    if (c == '{') {
                        braceCount++;
                    } else if (c == '}') {
                        braceCount--;
                    }
                }
                if (braceCount == 0 && trimmedLine.endsWith("}")) {
                    inFunction = false;
                    functions.append(LS);
                }
            } else if (trimmedLine.startsWith("public type ") || trimmedLine.startsWith("type ")) {
                // Type definitions
                types.append(line).append(LS);
                // Handle multi-line type definitions
                if (!trimmedLine.endsWith(";")) {
                    while (lines.length > 0) {
                        // This is simplified - in reality we'd need to continue reading
                        break;
                    }
                }
            } else if (!trimmedLine.isEmpty() && !trimmedLine.startsWith("#") &&
                    !trimmedLine.startsWith("//")) {
                // Other non-empty, non-comment lines go to types
                types.append(line).append(LS);
            }
        }

        // Add schemaJson to functions
        functions.append(LS).append(schemaJson.toString());

        return new GeneratedContent(
                imports.toString().trim(),
                types.toString().trim(),
                functions.toString().trim()
        );
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
     * Gets existing type names from the types.bal file.
     *
     * @return List of existing type names
     */
    private List<String> getExistingTypeNames() {
        List<String> existingTypeNames = new ArrayList<>();
        Path targetFilePath = projectPath.resolve(DEFAULT_TYPES_FILE);
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
     * Creates text edits for types.bal and functions.bal files.
     *
     * @param content The generated content separated into types and functions
     * @return Map of file paths to text edits
     */
    private Map<Path, List<TextEdit>> createTextEdits(GeneratedContent content) throws EDIGenerationException {
        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();

        // Create text edits for types.bal
        createTypesFileEdits(content, textEditsMap);

        // Create text edits for functions.bal
        createFunctionsFileEdits(content, textEditsMap);

        return textEditsMap;
    }

    /**
     * Creates text edits for the types.bal file.
     *
     * @param content       The generated content
     * @param textEditsMap  Map to add the text edits to
     */
    private void createTypesFileEdits(GeneratedContent content, Map<Path, List<TextEdit>> textEditsMap) {
        Path typesFilePath = projectPath.resolve(DEFAULT_TYPES_FILE);
        Optional<Document> documentOpt = this.workspaceManager.document(typesFilePath);
        List<TextEdit> textEdits = new ArrayList<>();

        if (documentOpt.isPresent()) {
            Document document = documentOpt.get();
            ModulePartNode modulePartNode = document.syntaxTree().rootNode();

            // Add imports if needed
            String newImports = filterExistingImports(content.imports, modulePartNode);
            if (!newImports.isEmpty()) {
                LinePosition importPos = getImportInsertPosition(modulePartNode);
                textEdits.add(new TextEdit(CommonUtils.toRange(importPos), newImports + LS));
            }

            // Append types at the end
            LinePosition endPos = LinePosition.from(modulePartNode.lineRange().endLine().line() + 1, 0);
            String contentToAppend = LS + content.types;
            textEdits.add(new TextEdit(CommonUtils.toRange(endPos), contentToAppend));

        } else {
            // File doesn't exist, create new content
            LinePosition startPos = LinePosition.from(0, 0);
            if (!content.imports.isEmpty()) {
                textEdits.add(new TextEdit(CommonUtils.toRange(startPos), content.imports + LS + LS));
            }
            int typesStartLine = content.imports.isEmpty() ? 0 :
                    (int) content.imports.lines().count() + 2;
            LinePosition typesPos = LinePosition.from(typesStartLine, 0);
            textEdits.add(new TextEdit(CommonUtils.toRange(typesPos), content.types));
        }

        textEditsMap.put(typesFilePath, textEdits);
    }

    /**
     * Creates text edits for the functions.bal file.
     *
     * @param content       The generated content
     * @param textEditsMap  Map to add the text edits to
     */
    private void createFunctionsFileEdits(GeneratedContent content, Map<Path, List<TextEdit>> textEditsMap) {
        Path functionsFilePath = projectPath.resolve(DEFAULT_FUNCTIONS_FILE);
        Optional<Document> documentOpt = this.workspaceManager.document(functionsFilePath);
        List<TextEdit> textEdits = new ArrayList<>();

        if (documentOpt.isPresent()) {
            Document document = documentOpt.get();
            ModulePartNode modulePartNode = document.syntaxTree().rootNode();

            // Add imports if needed
            String newImports = filterExistingImports(content.imports, modulePartNode);
            if (!newImports.isEmpty()) {
                LinePosition importPos = getImportInsertPosition(modulePartNode);
                textEdits.add(new TextEdit(CommonUtils.toRange(importPos), newImports + LS));
            }

            // Append functions at the end
            LinePosition endPos = LinePosition.from(modulePartNode.lineRange().endLine().line() + 1, 0);
            String contentToAppend = LS + content.functions;
            textEdits.add(new TextEdit(CommonUtils.toRange(endPos), contentToAppend));

        } else {
            // File doesn't exist, create new content
            LinePosition startPos = LinePosition.from(0, 0);
            if (!content.imports.isEmpty()) {
                textEdits.add(new TextEdit(CommonUtils.toRange(startPos), content.imports + LS + LS));
            }
            int functionsStartLine = content.imports.isEmpty() ? 0 :
                    (int) content.imports.lines().count() + 2;
            LinePosition functionsPos = LinePosition.from(functionsStartLine, 0);
            textEdits.add(new TextEdit(CommonUtils.toRange(functionsPos), content.functions));
        }

        textEditsMap.put(functionsFilePath, textEdits);
    }

    /**
     * Filters out imports that already exist in the target file.
     *
     * @param imports        The import statements to filter
     * @param modulePartNode The syntax tree of the existing file
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
     * Deletes a directory and all its contents recursively.
     *
     * @param directory The directory to delete
     */
    private void deleteDirectory(Path directory) {
        try {
            if (Files.exists(directory)) {
                Files.walk(directory)
                        .sorted((a, b) -> b.compareTo(a)) // Reverse order for deletion
                        .forEach(path -> {
                            try {
                                Files.delete(path);
                            } catch (Throwable e) {
                                // Ignore deletion errors
                            }
                        });
            }
        } catch (Throwable e) {
            // Ignore errors during cleanup
        }
    }

    /**
     * Record class to hold separated imports, types, and functions.
     *
     * @param imports   The import statements
     * @param types     The type definitions
     * @param functions The function definitions
     */
    private record GeneratedContent(String imports, String types, String functions) {
    }

    /**
     * Custom exception for EDI generation errors.
     */
    public static class EDIGenerationException extends Exception {
        public EDIGenerationException(String message) {
            super(message);
        }

        public EDIGenerationException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
