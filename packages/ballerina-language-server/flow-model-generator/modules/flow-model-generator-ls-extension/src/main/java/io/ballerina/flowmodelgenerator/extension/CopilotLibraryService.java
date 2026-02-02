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

package io.ballerina.flowmodelgenerator.extension;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.stream.JsonReader;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ArrayTypeSymbol;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.ConstantSymbol;
import io.ballerina.compiler.api.symbols.Documentation;
import io.ballerina.compiler.api.symbols.EnumSymbol;
import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.MapTypeSymbol;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.StreamTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TableTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.UnionTypeSymbol;
import io.ballerina.compiler.api.values.ConstantValue;
import io.ballerina.flowmodelgenerator.extension.request.GetAllLibrariesRequest;
import io.ballerina.flowmodelgenerator.extension.request.GetSelectedLibrariesRequest;
import io.ballerina.flowmodelgenerator.extension.response.GetAllLibrariesResponse;
import io.ballerina.modelgenerator.commons.FieldData;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.FunctionDataBuilder;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.modelgenerator.commons.ParameterData;
import io.ballerina.modelgenerator.commons.ReturnTypeData;
import io.ballerina.modelgenerator.commons.TypeDefData;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment;
import org.eclipse.lsp4j.services.LanguageServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

import static io.ballerina.modelgenerator.commons.CommonUtils.getRawType;
import static io.ballerina.modelgenerator.commons.FunctionDataBuilder.REST_RESOURCE_PATH;

/**
 * Service for managing Copilot library operations.
 * Provides streaming JSON processing for efficient memory usage.
 *
 * @since 1.0.1
 */
@JavaSPIService("org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService")
@JsonSegment("copilotLibraryManager")
public class CopilotLibraryService implements ExtendedLanguageServerService {

    private static final String CORE_CONTEXT_JSON_PATH = "/copilot/context.json";
    private static final String HEALTHCARE_CONTEXT_JSON_PATH = "/copilot/healthcare-context.json";
    private static final String GENERIC_SERVICES_JSON_PATH = "/copilot/generic-services.json";
    private static final String MODE_CORE = "CORE";
    private static final String MODE_HEALTHCARE = "HEALTHCARE";

    // JSON field names
    private static final String FIELD_NAME = "name";
    private static final String FIELD_DESCRIPTION = "description";

    @Override
    public void init(LanguageServer langServer, WorkspaceManager workspaceManager) {
        // Initialization logic if needed
    }

    @Override
    public Class<?> getRemoteInterface() {

        return null;
    }

    @JsonRequest
    public CompletableFuture<GetAllLibrariesResponse> getLibrariesList(GetAllLibrariesRequest request) {

        return CompletableFuture.supplyAsync(() -> {
            try {
                String mode = request.mode() != null ? request.mode() : MODE_CORE;
                JsonArray libraries = loadLibrariesFromContext(null, true, mode);
                return createResponse(libraries);
            } catch (Exception e) {
                throw new RuntimeException("Failed to load libraries: " + e.getMessage(), e);
            }
        });
    }

    @JsonRequest
    public CompletableFuture<GetAllLibrariesResponse> getFilteredLibraries(GetSelectedLibrariesRequest request) {

        return CompletableFuture.supplyAsync(() -> {
            try {
                String[] libraryNames = request.libNames();
                if (libraryNames == null || libraryNames.length == 0) {
                    // Return empty response if no library names provided
                    return createResponse(new JsonArray());
                }

                String mode = request.mode() != null ? request.mode() : MODE_CORE;
                // Convert to Set for efficient lookup during streaming
                Set<String> requestedLibraries = new HashSet<>(Arrays.asList(libraryNames));
                JsonArray filteredLibraries = loadLibrariesFromContext(requestedLibraries, false, mode);
                return createResponse(filteredLibraries);
            } catch (Exception e) {
                throw new RuntimeException("Failed to load filtered libraries: " + e.getMessage(), e);
            }
        });
    }

    @JsonRequest
    public CompletableFuture<GetAllLibrariesResponse> getLibrariesListFromSearchIndex() {

        return CompletableFuture.supplyAsync(() -> {
            try {
                JsonArray libraries = loadLibrariesFromDatabase();
                return createResponse(libraries);
            } catch (Exception e) {
                throw new RuntimeException("Failed to load libraries from database: " + e.getMessage(), e);
            }
        });
    }

    @JsonRequest
    public CompletableFuture<GetAllLibrariesResponse> getFilteredLibrariesFromSemanticModel
            (GetSelectedLibrariesRequest request) {

        return CompletableFuture.supplyAsync(() -> {
            try {
                String[] libraryNames = request.libNames();
                if (libraryNames == null || libraryNames.length == 0) {
                    // Return empty response if no library names provided
                    return createResponse(new JsonArray());
                }

                JsonArray filteredLibraries = loadFilteredLibrariesFromSemanticModel(libraryNames);
                return createResponse(filteredLibraries);
            } catch (Exception e) {
                throw new RuntimeException("Failed to load filtered libraries: " + e.getMessage(), e);
            }
        });
    }

    /**
     * Loads libraries from the context.json file using streaming JSON parsing with optional filtering.
     *
     * @param requestedLibraries Set of library names to filter by, or null to load all libraries
     * @param limitedFields      whether to return only name and description fields (true) or full objects (false)
     * @param mode               The mode to determine which context file to read ("CORE" or "HEALTHCARE")
     * @return JsonArray containing library information
     * @throws IOException if file reading fails
     */
    private JsonArray loadLibrariesFromContext(Set<String> requestedLibraries, boolean limitedFields, String mode)
            throws IOException {

        JsonArray libraries = new JsonArray();

        try (InputStream inputStream = getContextInputStream(mode);
             InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8);
             JsonReader jsonReader = new JsonReader(reader)) {

            processLibraryArray(jsonReader, libraries, requestedLibraries, limitedFields);
        }

        return libraries;
    }

    /**
     * Gets the input stream for the context file based on the mode.
     *
     * @param mode The mode to determine which context file to read
     * @return InputStream for the context file
     * @throws IOException if file not found
     */
    private InputStream getContextInputStream(String mode) throws IOException {

        String contextPath;
        if (MODE_HEALTHCARE.equals(mode)) {
            contextPath = HEALTHCARE_CONTEXT_JSON_PATH;
        } else {
            contextPath = CORE_CONTEXT_JSON_PATH; // Default to CORE
        }

        InputStream inputStream = CopilotLibraryService.class.getResourceAsStream(contextPath);
        if (inputStream == null) {
            throw new IOException("Context file not found: " + contextPath);
        }
        return inputStream;
    }

    /**
     * Processes the JSON array containing library information with optional filtering.
     *
     * @param jsonReader         the JSON reader
     * @param libraries          the array to populate with library data
     * @param requestedLibraries Set of library names to filter by, or null to include all libraries
     * @param limitedFields      whether to return only name and description fields (true) or full objects (false)
     * @throws IOException if JSON parsing fails
     */
    private void processLibraryArray(JsonReader jsonReader, JsonArray libraries, Set<String> requestedLibraries,
                                     boolean limitedFields) throws IOException {

        jsonReader.beginArray();

        while (jsonReader.hasNext()) {
            JsonObject libraryInfo = parseLibraryObject(jsonReader, limitedFields);
            if (isValidLibrary(libraryInfo) && shouldIncludeLibrary(libraryInfo, requestedLibraries)) {
                libraries.add(libraryInfo);
            }
        }

        jsonReader.endArray();
    }

    /**
     * Parses a single library object from the JSON stream.
     *
     * @param jsonReader    the JSON reader
     * @param limitedFields whether to return only name and description fields (true) or full objects (false)
     * @return JsonObject representing the library
     * @throws IOException if JSON parsing fails
     */
    private JsonObject parseLibraryObject(JsonReader jsonReader, boolean limitedFields) throws IOException {

        JsonObject libraryInfo = new JsonObject();
        jsonReader.beginObject();
        while (jsonReader.hasNext()) {
            String fieldName = jsonReader.nextName();
            processLibraryField(jsonReader, libraryInfo, fieldName, limitedFields);
        }

        jsonReader.endObject();

        return libraryInfo;
    }

    /**
     * Processes a single field in the library object.
     *
     * @param jsonReader  the JSON reader
     * @param libraryInfo the library object to populate
     * @param fieldName   the current field name
     * @throws IOException if JSON parsing fails
     */
    private void processLibraryField(JsonReader jsonReader, JsonObject libraryInfo, String fieldName,
                                     boolean limitedFields) throws IOException {

        if (limitedFields) {
            // For limited fields, only process name and description
            switch (fieldName) {
                case FIELD_NAME:
                    String name = jsonReader.nextString();
                    libraryInfo.addProperty(FIELD_NAME, name);
                    break;
                case FIELD_DESCRIPTION:
                    String description = jsonReader.nextString();
                    libraryInfo.addProperty(FIELD_DESCRIPTION, description);
                    break;
                default:
                    jsonReader.skipValue(); // Skip other fields
                    break;
            }
        } else {
            // Add all fields to the libraryInfo object as a exact copy.
            JsonElement element = JsonParser.parseReader(jsonReader);
            libraryInfo.add(fieldName, element);
        }

    }

    /**
     * Validates if a library object contains required information.
     *
     * @param libraryInfo the library object to validate
     * @return true if valid, false otherwise
     */
    private boolean isValidLibrary(JsonObject libraryInfo) {

        return libraryInfo.has(FIELD_NAME) &&
                libraryInfo.get(FIELD_NAME).getAsString() != null &&
                !libraryInfo.get(FIELD_NAME).getAsString().trim().isEmpty();
    }

    /**
     * Determines if a library should be included based on the filter criteria.
     *
     * @param libraryInfo        the library object to check
     * @param requestedLibraries Set of library names to filter by, or null to include all libraries
     * @return true if the library should be included, false otherwise
     */
    private boolean shouldIncludeLibrary(JsonObject libraryInfo, Set<String> requestedLibraries) {

        if (requestedLibraries == null || requestedLibraries.isEmpty()) {
            return true; // Include all libraries if no filter specified
        }

        if (!libraryInfo.has(FIELD_NAME)) {
            return false; // Skip libraries without names
        }

        String libraryName = libraryInfo.get(FIELD_NAME).getAsString();
        return requestedLibraries.contains(libraryName);
    }

    /**
     * Creates the response object with the loaded libraries.
     *
     * @param libraries the loaded libraries
     * @return the response object
     */
    private GetAllLibrariesResponse createResponse(JsonArray libraries) {

        GetAllLibrariesResponse response = new GetAllLibrariesResponse();
        response.setLibraries(libraries);
        return response;
    }

    /**
     * Loads libraries from the search-index database.
     * Returns a JSON array with format: [{ "name": "org/package_name", "description": "..." }]
     * Note: The same package may occur multiple times in the Package table with different versions.
     * This method returns distinct org/package_name and description combinations.
     *
     * @return JsonArray containing libraries with name (org/package_name) and description
     * @throws IOException  if database file access fails
     * @throws SQLException if database query fails
     */
    private JsonArray loadLibrariesFromDatabase() throws IOException, SQLException {

        JsonArray result = new JsonArray();
        // Use LinkedHashMap to maintain insertion order and track unique packages
        Map<String, String> packageToDescriptionMap = new LinkedHashMap<>();

        String dbPath = getDatabasePath();
        String sql = """
                SELECT DISTINCT org, package_name, description
                FROM Package
                WHERE org IS NOT NULL AND package_name IS NOT NULL
                ORDER BY org, package_name;
                """;

        try (Connection conn = DriverManager.getConnection(dbPath);
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                String org = rs.getString("org");
                String packageName = rs.getString("package_name");
                String description = rs.getString("description");

                // Create the full name as "org/package_name"
                String fullName = org + "/" + packageName;

                // Store only if not already present (handles duplicates)
                if (!packageToDescriptionMap.containsKey(fullName)) {
                    packageToDescriptionMap.put(fullName, description != null ? description : "");
                }
            }
        }

        // Convert the map to JSON array format
        for (Map.Entry<String, String> entry : packageToDescriptionMap.entrySet()) {
            JsonObject packageObj = new JsonObject();
            packageObj.addProperty(FIELD_NAME, entry.getKey());
            packageObj.addProperty(FIELD_DESCRIPTION, entry.getValue());
            result.add(packageObj);
        }

        return result;
    }

    /**
     * Loads filtered libraries using the semantic model.
     * Returns a JSON array with package information including:
     * - clients (client classes) with methods
     * - Functions (module-level)
     *
     * @param libraryNames Array of library names in "org/package_name" format to filter
     * @return JsonArray containing library details with clients and functions
     */
    private JsonArray loadFilteredLibrariesFromSemanticModel(String[] libraryNames) {

        JsonArray result = new JsonArray();

        for (String libraryName : libraryNames) {
            // Parse library name "org/package_name"
            String[] parts = libraryName.split("/");
            if (parts.length != 2) {
                continue; // Skip invalid format
            }
            String org = parts[0];
            String packageName = parts[1];

            // Create module info (use latest version by passing null)
            ModuleInfo moduleInfo = new ModuleInfo(org, packageName, org + "/" +
                    packageName, null);

            // Get semantic model for the module
            Optional<SemanticModel> optSemanticModel = PackageUtil.getSemanticModel(org, packageName);
            if (optSemanticModel.isEmpty()) {
                continue; // Skip if semantic model not found
            }

            SemanticModel semanticModel = optSemanticModel.get();

            // Try to get the package description from database
            String description = getPackageDescriptionFromDatabase(org, packageName);

            // Create package object
            JsonObject packageObj = new JsonObject();
            packageObj.addProperty(FIELD_NAME, libraryName);
            packageObj.addProperty(FIELD_DESCRIPTION, description);

            // Arrays to hold clients, functions, typedefs, and services
            JsonArray clients = new JsonArray();
            JsonArray functions = new JsonArray();
            JsonArray typedefs = new JsonArray();
            JsonArray services = new JsonArray();

            // Load services from inbuilt triggers
            JsonArray triggerServices = loadServicesFromInbuiltTriggers(libraryName);
            triggerServices.forEach(services::add);

            // Load generic services
            JsonArray genericServices = loadGenericServicesForLibrary(libraryName);
            genericServices.forEach(services::add);

            for (Symbol symbol : semanticModel.moduleSymbols()) {
                switch (symbol.kind()) {
                    case CLASS:
                        ClassSymbol classSymbol = (ClassSymbol) symbol;

                        // Process only PUBLIC classes: CLIENT classes (connectors) and normal classes
                        if (classSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
                            boolean isClient = classSymbol.qualifiers().contains(Qualifier.CLIENT);
                            String className = classSymbol.getName().orElse(isClient ? "Client" : "Class");

                            FunctionData.Kind classKind;
                            if (isClient) {
                                classKind = FunctionData.Kind.CONNECTOR;
                            } else {
                                classKind = FunctionData.Kind.CLASS_INIT;
                            }

                            FunctionData classData = new FunctionDataBuilder()
                                    .semanticModel(semanticModel)
                                    .moduleInfo(moduleInfo)
                                    .name(className)
                                    .parentSymbol(classSymbol)
                                    .functionResultKind(classKind)
                                    .build();

                            JsonObject classObj = new JsonObject();
                            classObj.addProperty("name", className);
                            classObj.addProperty("description", classData.description());

                            JsonArray methods = new JsonArray();

                            // Add the constructor/init function first
                            JsonObject constructorObj = functionDataToJson(classData, org, packageName);
                            constructorObj.addProperty("name", "init");  // Override name to "init" for constructor
                            methods.add(constructorObj);

                            // Then add all other methods (remote functions, resource functions, etc.)
                            List<FunctionData> classMethods = new FunctionDataBuilder()
                                    .semanticModel(semanticModel)
                                    .moduleInfo(moduleInfo)
                                    .parentSymbolType(className)
                                    .parentSymbol(classSymbol)
                                    .buildChildNodes();

                            for (FunctionData method : classMethods) {
                                JsonObject methodObj = functionDataToJson(method, org, packageName);
                                methods.add(methodObj);
                            }
                            classObj.add("functions", methods);

                            if (isClient) {
                                clients.add(classObj);
                            } else {
                                typedefs.add(classObj);
                            }
                        }
                        break;

                    case FUNCTION:
                        FunctionSymbol functionSymbol =
                                (FunctionSymbol) symbol;

                        if (functionSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
                            FunctionData functionData = new FunctionDataBuilder()
                                    .semanticModel(semanticModel)
                                    .moduleInfo(moduleInfo)
                                    .functionSymbol(functionSymbol)
                                    .build();

                            JsonObject functionObj = functionDataToJson(functionData, org, packageName);
                            functions.add(functionObj);
                        }
                        break;

                    case TYPE_DEFINITION:
                        TypeDefinitionSymbol typeDefSymbol = (TypeDefinitionSymbol) symbol;

                        if (typeDefSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
                            TypeDefData typeDefData = buildTypeDefDataFromSymbol(typeDefSymbol);
                            JsonObject typeDefObj = typeDefDataToJson(typeDefData, org, packageName);
                            typedefs.add(typeDefObj);
                        }
                        break;

                    case ENUM:
                        EnumSymbol enumSymbol = (EnumSymbol) symbol;

                        if (enumSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
                            TypeDefData enumData = buildEnumTypeDefData(enumSymbol);
                            JsonObject enumObj = typeDefDataToJson(enumData, org, packageName);
                            typedefs.add(enumObj);
                        }
                        break;

                    case CONSTANT:
                        ConstantSymbol constantSymbol = (ConstantSymbol) symbol;

                        if (constantSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
                            TypeDefData constantData = buildConstantTypeDefData(constantSymbol);
                            JsonObject constantObj = typeDefDataToJson(constantData, org, packageName);

                            // Add varType using ConstantValue
                            JsonObject varTypeObj = new JsonObject();
                            String varTypeName = "";
                            Object constValue = constantSymbol.constValue();
                            if (constValue instanceof ConstantValue constantValue) {
                                varTypeName = constantValue.valueType().typeKind().getName();
                            }

                            // Fallback to type descriptor if constValue is null or not ConstantValue
                            if (varTypeName.isEmpty()) {
                                TypeSymbol typeSymbol = constantSymbol.typeDescriptor();
                                if (typeSymbol != null && !typeSymbol.signature().isEmpty()) {
                                    varTypeName = typeSymbol.signature();
                                }
                            }

                            varTypeObj.addProperty("name", varTypeName);
                            constantObj.add("varType", varTypeObj);

                            typedefs.add(constantObj);
                        }
                        break;

                    default:
                        // Skip other symbol types
                        break;
                }
            }

            // Add collected data to package object
            packageObj.add("clients", clients);
            packageObj.add("functions", functions);
            packageObj.add("typeDefs", typedefs);
            packageObj.add("services", services);

            result.add(packageObj);
        }

        return result;
    }

    /**
     * Gets the JDBC database path for the search-index.sqlite file.
     *
     * @return the JDBC database path
     * @throws IOException if database file cannot be accessed
     */
    private String getDatabasePath() throws IOException {

        String indexFileName = "search-index.sqlite";
        java.net.URL dbUrl = getClass().getClassLoader().getResource(indexFileName);

        if (dbUrl == null) {
            throw new IOException("Database resource not found: " + indexFileName);
        }

        // Copy database to temp directory
        java.nio.file.Path tempDir = java.nio.file.Files.createTempDirectory("search-index");
        java.nio.file.Path tempFile = tempDir.resolve(indexFileName);

        try (InputStream inputStream = dbUrl.openStream()) {
            java.nio.file.Files.copy(inputStream, tempFile);
        }

        return "jdbc:sqlite:" + tempFile;
    }

    /**
     * Retrieves the package description from the database for a given org and package name.
     *
     * @param org         the organization name
     * @param packageName the package name
     * @return the package description, or empty string if not found
     */
    private String getPackageDescriptionFromDatabase(String org, String packageName) {
        String description = "";

        try {
            String dbPath = getDatabasePath();
            String sql = """
                    SELECT description
                    FROM Package
                    WHERE org = ? AND package_name = ?
                    ORDER BY id DESC
                    LIMIT 1;
                    """;

            try (Connection conn = DriverManager.getConnection(dbPath);
                 PreparedStatement stmt = conn.prepareStatement(sql)) {

                stmt.setString(1, org);
                stmt.setString(2, packageName);

                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        String desc = rs.getString("description");
                        description = desc != null ? desc : "";
                    }
                }
            }
        } catch (IOException | SQLException e) {
            throw new RuntimeException("Error retrieving package description for " + org + "/" + packageName + ": " +
                    e.getMessage());
        }

        return description;
    }

    /**
     * Converts FunctionData to JsonObject manually to avoid Gson reflection issues.
     *
     * @param functionData the function data to convert
     * @param currentOrg the current package organization
     * @param currentPackage the current package name
     * @return JsonObject representation
     */
    private JsonObject functionDataToJson(FunctionData functionData, String currentOrg, String currentPackage) {
        JsonObject obj = new JsonObject();

        // For resource functions, don't add "name" field, add "accessor" and "paths" instead
        boolean isResourceFunction = functionData.kind() == FunctionData.Kind.RESOURCE;

        if (!isResourceFunction) {
            obj.addProperty("name", functionData.name());
        }

        // Map function kind to human-readable type
        String functionType = getFunctionTypeString(functionData.kind());
        obj.addProperty("type", functionType);
        obj.addProperty("description", functionData.description());

        // Add resource-specific fields for resource functions
        if (isResourceFunction) {
            // Extract accessor and paths from resourcePath
            String resourcePath = functionData.resourcePath();
            if (resourcePath != null && !resourcePath.isEmpty()) {
                JsonArray pathsArray = new JsonArray();

                if (REST_RESOURCE_PATH.equals(resourcePath)) {
                    // For rest resource path, add a special path parameter
                    obj.addProperty("accessor", functionData.name());
                    JsonObject pathParam = new JsonObject();
                    pathParam.addProperty("name", "path");
                    pathParam.addProperty("type", "...");
                    pathsArray.add(pathParam);
                } else {
                    // Parse normal resource paths
                    String[] pathParts = parseResourcePath(resourcePath);
                    obj.addProperty("accessor", pathParts[0]);

                    // Parse paths array
                    String[] paths = pathParts[1].split("/");
                    for (String path : paths) {
                        if (path.isEmpty()) {
                            continue;
                        }
                        // Check if it's a path parameter (starts with [])
                        if (path.startsWith("[") && path.endsWith("]")) {
                            // Path parameter: extract name and type
                            String paramContent = path.substring(1, path.length() - 1);
                            String[] paramParts = paramContent.split(":");
                            JsonObject pathParam = new JsonObject();
                            pathParam.addProperty("name", paramParts[0].trim());
                            if (paramParts.length > 1) {
                                pathParam.addProperty("type", paramParts[1].trim());
                            } else {
                                pathParam.addProperty("type", "string");
                            }
                            pathsArray.add(pathParam);
                        } else {
                            // Regular path segment
                            pathsArray.add(path);
                        }
                    }
                }
                obj.add("paths", pathsArray);
            }
        }

        // Add parameters array if present
        if (functionData.parameters() != null) {
            JsonArray parametersArray = new JsonArray();
            for (Map.Entry<String, ParameterData> entry :
                    functionData.parameters().entrySet()) {
                JsonObject paramObj = parameterDataToJsonForArray(entry.getValue(), currentOrg, currentPackage);
                parametersArray.add(paramObj);
            }
            obj.add("parameters", parametersArray);
        }

        // Add return object with type
        JsonObject returnObj = new JsonObject();

        // Use ReturnTypeData if available, otherwise fall back to returnType string
        if (functionData.returnTypeData() != null) {
            ReturnTypeData returnTypeData = functionData.returnTypeData();

            JsonObject returnTypeObj = new JsonObject();
            returnTypeObj.addProperty("name", returnTypeData.name());

            returnObj.add("type", returnTypeObj);
        } else if (functionData.returnType() != null) {
            // Fallback to old format
            JsonObject returnTypeObj = new JsonObject();
            returnTypeObj.addProperty("name", functionData.returnType());
            returnObj.add("type", returnTypeObj);
        }

        obj.add("return", returnObj);

        return obj;
    }

    /**
     * Parses a resource path string to extract accessor and path.
     *
     * @param resourcePath the resource path string
     * @return array with [accessor, path]
     */
    private String[] parseResourcePath(String resourcePath) {
        String trimmed = resourcePath.trim();
        int firstSlash = trimmed.indexOf('/');

        if (firstSlash > 0) {
            // Format: "accessor /path"
            return new String[]{
                trimmed.substring(0, firstSlash).trim(),
                trimmed.substring(firstSlash)
            };
        } else if (firstSlash == 0) {
            // Format: "/path" (default to "get")
            return new String[]{"get", trimmed};
        } else {
            // No path, just accessor
            return new String[]{trimmed, ""};
        }
    }

    /**
     * Converts FunctionData.Kind to human-readable function type string.
     *
     * @param kind the function kind
     * @return string representation for JSON
     */
    private String getFunctionTypeString(FunctionData.Kind kind) {
        if (kind == null) {
            return "Normal Function";
        }
        return switch (kind) {
            case CLASS_INIT, CONNECTOR, LISTENER_INIT -> "Constructor";
            case REMOTE -> "Remote Function";
            case RESOURCE -> "Resource Function";
            default -> "Normal Function";
        };
    }

    /**
     * Converts ParameterData to JsonObject for use in array format (with type links).
     *
     * @param paramData the parameter data to convert
     * @param currentOrg the current package organization
     * @param currentPackage the current package name
     * @return JsonObject representation
     */
    private JsonObject parameterDataToJsonForArray(ParameterData paramData,
                                                   String currentOrg, String currentPackage) {
        JsonObject obj = new JsonObject();
        obj.addProperty("name", paramData.name());
        obj.addProperty("description", paramData.description());
        obj.addProperty("optional", paramData.optional());
        obj.addProperty("default", paramData.defaultValue());

        // Add type object
        if (paramData.type() != null) {
            JsonObject typeObj = new JsonObject();
            String typeName = paramData.type();

            if (!typeName.isEmpty()) {
                typeObj.addProperty("name", typeName);

                // Add type links from import statements if available
                if (paramData.importStatements() != null && !paramData.importStatements().isEmpty()) {
                    String recordName = extractRecordNameFromTypeSymbol(paramData.typeSymbol());
                    JsonArray links = extractTypeLinks(
                            paramData.importStatements(), recordName, currentOrg, currentPackage);

                    if (!links.isEmpty()) {
                        typeObj.add("links", links);
                    }
                }
            }
            obj.add("type", typeObj);
        }
        return obj;
    }

    /**
     * Converts TypeDefData to JsonObject manually with org and package info for link generation.
     */
    private JsonObject typeDefDataToJson(TypeDefData typeDefData, String currentOrg, String currentPackage) {
        JsonObject obj = new JsonObject();
        obj.addProperty("name", typeDefData.name());
        obj.addProperty("description", typeDefData.description());
        obj.addProperty("type", typeDefData.type() != null ? typeDefData.type().getValue() : null);

        TypeDefData.TypeCategory category = typeDefData.type();

        // Only add value for CONSTANT category
        if (category == TypeDefData.TypeCategory.CONSTANT) {
            obj.addProperty("value", typeDefData.baseType());
        }

        // Only add fields/members for specific categories (not for CONSTANT, ERROR, or OTHER)
        if (typeDefData.fields() != null &&
            category != TypeDefData.TypeCategory.CONSTANT &&
            category != TypeDefData.TypeCategory.ERROR &&
            category != TypeDefData.TypeCategory.OTHER) {

            JsonArray fieldsArray = new JsonArray();

            for (FieldData field : typeDefData.fields()) {
                if (category == TypeDefData.TypeCategory.UNION) {
                    fieldsArray.add(field.name());
                } else {
                    JsonObject fieldObj;

                    if (category == TypeDefData.TypeCategory.ENUM) {
                        // Enum members: only name and description
                        fieldObj = new JsonObject();
                        fieldObj.addProperty("name", field.name());
                        fieldObj.addProperty("description", field.description());
                    } else {
                        fieldObj = fieldDataToJson(field, currentOrg, currentPackage);
                    }

                    fieldsArray.add(fieldObj);
                }
            }

            // Use "members" for ENUM and UNION, "fields" for others
            String arrayName = (category == TypeDefData.TypeCategory.ENUM ||
                               category == TypeDefData.TypeCategory.UNION) ? "members" : "fields";
            obj.add(arrayName, fieldsArray);
        }

        return obj;
    }

    /**
     * Converts FieldData to JsonObject manually with org and package info for link generation.
     * Used for RECORD fields and other non-enum, non-constant field types.
     */
    private JsonObject fieldDataToJson(FieldData fieldData, String currentOrg, String currentPackage) {
        JsonObject obj = new JsonObject();
        obj.addProperty("name", fieldData.name());
        obj.addProperty("description", fieldData.description());
        obj.addProperty("optional", fieldData.optional());

        // Add type object
        if (fieldData.type() != null) {
            JsonObject typeObj = new JsonObject();
            String typeName = fieldData.type().name();

            // Get the formatted record name from TypeSymbol
            String recordName = extractRecordNameFromTypeSymbol(fieldData.type().typeSymbol());

            typeObj.addProperty("name", typeName);

            // Extract type links if we have the TypeSymbol and org/package info
            if (currentOrg != null && currentPackage != null && fieldData.type().typeSymbol() != null) {
                TypeSymbol typeSymbol = fieldData.type().typeSymbol();
                String importStatements = extractImportStatementsFromTypeSymbol(typeSymbol);

                if (importStatements != null && !importStatements.isEmpty()) {
                    JsonArray links = extractTypeLinks(importStatements, recordName, currentOrg, currentPackage);
                    if (!links.isEmpty()) {
                        typeObj.add("links", links);
                    }
                }
            }

            obj.add("type", typeObj);
        }

        return obj;
    }

    /**
     * Extracts the record name from TypeSymbol handling Union, TypeReference, Array, and basic types.
     */
    private String extractRecordNameFromTypeSymbol(TypeSymbol typeSymbol) {
        if (typeSymbol == null) {
            return "";
        }

        switch (typeSymbol.typeKind()) {
            case UNION:
                // Handle union types
                UnionTypeSymbol unionType = (UnionTypeSymbol) typeSymbol;
                List<String> memberTypes = new java.util.ArrayList<>();
                for (TypeSymbol member : unionType.memberTypeDescriptors()) {
                    memberTypes.add(extractRecordNameFromTypeSymbol(member));
                }
                return String.join("|", memberTypes);

            case TYPE_REFERENCE:
                // Handle type references - get the definition name from the referenced type
                TypeReferenceTypeSymbol typeRef = (TypeReferenceTypeSymbol) typeSymbol;
                return typeRef.definition().getName()
                        .or(() -> typeRef.typeDescriptor().getName())
                        .orElse(typeSymbol.typeKind().getName());

            case ARRAY:
                // Handle array types - recursively get the member type name
                ArrayTypeSymbol arrayType = (ArrayTypeSymbol) typeSymbol;
                return extractRecordNameFromTypeSymbol(arrayType.memberTypeDescriptor()) + "[]";

            default:
                // For other types, use getName() directly
                return typeSymbol.getName().orElse(typeSymbol.signature());
        }
    }

    /**
     * Builds TypeDefData from a TypeDefinitionSymbol using FunctionDataBuilder's allMembers function.
     */
    private TypeDefData buildTypeDefDataFromSymbol(TypeDefinitionSymbol typeDefSymbol) {
        String typeName = typeDefSymbol.getName().orElse("");
        String typeDescription = typeDefSymbol.documentation()
                .flatMap(Documentation::description)
                .orElse("");

        TypeSymbol typeDescriptor = typeDefSymbol.typeDescriptor();
        TypeSymbol rawType = getRawType(typeDescriptor);
        TypeDescKind typeKind = rawType.typeKind();

        // Use FunctionDataBuilder.allMembers to extract all type information
        Map<String, TypeSymbol> typeMap = new java.util.LinkedHashMap<>();
        FunctionDataBuilder.allMembers(typeMap, typeDescriptor);

        // Determine type category
        TypeDefData.TypeCategory typeCategory = switch (typeKind) {
            case RECORD -> TypeDefData.TypeCategory.RECORD;
            case UNION -> TypeDefData.TypeCategory.UNION;
            case OBJECT -> TypeDefData.TypeCategory.CLASS;
            case ERROR -> TypeDefData.TypeCategory.ERROR;
            default -> TypeDefData.TypeCategory.OTHER;
        };

        // Extract fields based on type
        List<FieldData> fields = new java.util.ArrayList<>();
        String baseType = null;

        baseType = switch (typeKind) {
            case RECORD -> {
                extractRecordFields((RecordTypeSymbol) rawType, fields);
                yield typeDescriptor.signature();
            }
            case UNION -> {
                extractUnionMembers((UnionTypeSymbol) rawType, fields);
                yield typeDescriptor.signature();
            }
            case MAP -> extractMapFields((MapTypeSymbol) rawType, fields);
            case TABLE -> {
                extractTableFields((TableTypeSymbol) rawType, fields);
                yield typeDescriptor.signature();
            }
            case STREAM -> {
                extractStreamFields((StreamTypeSymbol) rawType, fields);
                yield typeDescriptor.signature();
            }
            default -> typeDescriptor.signature();
        };

        return new TypeDefData(typeName, typeDescription, typeCategory, fields, baseType);
    }

    private void extractRecordFields(RecordTypeSymbol recordType, List<FieldData> fields) {
        recordType.fieldDescriptors().forEach((key, fieldSymbol) -> {
            String fieldName = fieldSymbol.getName().orElse(key);
            String fieldDescription = fieldSymbol.documentation()
                    .flatMap(Documentation::description)
                    .orElse("");
            TypeSymbol fieldTypeSymbol = fieldSymbol.typeDescriptor();
            boolean optional = fieldSymbol.isOptional() || fieldSymbol.hasDefaultValue();

            FieldData.FieldType fieldType = new FieldData.FieldType(fieldTypeSymbol.signature(), fieldTypeSymbol);
            fields.add(new FieldData(fieldName, fieldDescription, fieldType, optional));
        });

        // Handle rest field if present
        recordType.restTypeDescriptor().ifPresent(restType -> {
            FieldData.FieldType fieldType = new FieldData.FieldType(restType.signature(), restType);
            fields.add(new FieldData("", "Rest field", fieldType, false));
        });
    }

    private void extractUnionMembers(UnionTypeSymbol unionType, List<FieldData> fields) {
        unionType.memberTypeDescriptors().forEach(memberType -> {
            String memberTypeName = memberType.signature();
            FieldData.FieldType fieldType = new FieldData.FieldType(memberTypeName, memberType);
            fields.add(new FieldData(memberTypeName, "Union member", fieldType, false));
        });
    }

    private String extractMapFields(MapTypeSymbol mapType, List<FieldData> fields) {
        TypeSymbol constraintType = mapType.typeParam();
        String constraintTypeName = constraintType.signature();
        FieldData.FieldType fieldType = new FieldData.FieldType(constraintTypeName, constraintType);
        fields.add(new FieldData("constraint", "Map constraint type", fieldType, false));
        return "map<" + constraintTypeName + ">";
    }

    private void extractTableFields(TableTypeSymbol tableType, List<FieldData> fields) {
        TypeSymbol rowType = tableType.rowTypeParameter();
        FieldData.FieldType rowFieldType = new FieldData.FieldType(rowType.signature(), rowType);
        fields.add(new FieldData("rowType", "Table row type", rowFieldType, false));

        // Extract key constraint if present
        tableType.keyConstraintTypeParameter().ifPresent(keyType -> {
            FieldData.FieldType keyFieldType = new FieldData.FieldType(keyType.signature(), keyType);
            fields.add(new FieldData("keyConstraint", "Table key constraint", keyFieldType, false));
        });
    }

    private void extractStreamFields(StreamTypeSymbol streamType, List<FieldData> fields) {
        TypeSymbol streamTypeParam = streamType.typeParameter();
        FieldData.FieldType streamFieldType = new FieldData.FieldType(streamTypeParam.signature(), streamTypeParam);
        fields.add(new FieldData("valueType", "Stream value type", streamFieldType, false));

        TypeSymbol completionType = streamType.completionValueTypeParameter();
        FieldData.FieldType completionFieldType = new FieldData.FieldType(completionType.signature(), completionType);
        fields.add(new FieldData("completionType", "Stream completion type", completionFieldType, false));
    }

    /**
     * Builds TypeDefData for an Enum symbol.
     */
    private TypeDefData buildEnumTypeDefData(EnumSymbol enumSymbol) {
        String typeName = enumSymbol.getName().orElse("");
        String typeDescription = enumSymbol.documentation()
                .flatMap(Documentation::description)
                .orElse("");

        List<FieldData> enumMembers = new java.util.ArrayList<>();

        // Extract enum members
        for (ConstantSymbol member : enumSymbol.members()) {
            String memberName = member.getName().orElse("");
            String memberDescription = member.documentation()
                    .flatMap(Documentation::description)
                    .orElse("");

            // Get the constant value if available
            String memberValue = memberName;
            Object constValueObj = member.constValue();
            if (constValueObj instanceof ConstantValue constantValue) {
                Object value = constantValue.value();
                if (value != null) {
                    memberValue = value.toString();
                }
            }

            FieldData.FieldType fieldType = new FieldData.FieldType(memberValue);
            enumMembers.add(new FieldData(memberName, memberDescription, fieldType, false));
        }

        return new TypeDefData(typeName, typeDescription, TypeDefData.TypeCategory.ENUM, enumMembers, null);
    }

    /**
     * Builds TypeDefData for a Constant symbol.
     */
    private TypeDefData buildConstantTypeDefData(ConstantSymbol constantSymbol) {
        String typeName = constantSymbol.getName().orElse("");
        String typeDescription = constantSymbol.documentation()
                .flatMap(Documentation::description)
                .orElse("");

        // Get the constant's type and value
        TypeSymbol typeSymbol = constantSymbol.typeDescriptor();

        // Get the constant value if available
        String constantValue = typeSymbol.signature();
        Object constValueObj = constantSymbol.constValue();
        if (constValueObj instanceof ConstantValue constantVal) {
            Object value = constantVal.value();
            if (value != null) {
                constantValue = value.toString();
            }
        }

        return new TypeDefData(typeName, typeDescription, TypeDefData.TypeCategory.CONSTANT,
                new java.util.ArrayList<>(), constantValue);
    }

    /**
     * Extracts import statements from a TypeSymbol by analyzing its module information.
     * Returns a comma-separated string of package paths (e.g., "org/package, org2/package2").
     */
    private String extractImportStatementsFromTypeSymbol(TypeSymbol typeSymbol) {
        if (typeSymbol == null) {
            return null;
        }

        // Get the module information from the type symbol
        Optional<ModuleSymbol> moduleOpt = typeSymbol.getModule();
        if (moduleOpt.isEmpty()) {
            return null;
        }

        ModuleSymbol moduleSymbol = moduleOpt.get();

        // Get org and module name
        String org = moduleSymbol.id().orgName();
        String moduleName = moduleSymbol.id().moduleName();

        // Return the package path
        return org + "/" + moduleName;
    }

    /**
     * Extracts type links from import statements string combined with type symbol.
     */
    private JsonArray extractTypeLinks(String importStatements,
                                       String recordName,
                                       String currentOrg,
                                       String currentPackage) {
        JsonArray links = new JsonArray();

        if (importStatements == null || importStatements.trim().isEmpty()) {
            return links;
        }

        // Split by semicolon to get individual import statements
        String[] imports = importStatements.split(",");
        for (String importStmt : imports) {
            String packagePath = importStmt.trim();

            if (packagePath.isEmpty()) {
                continue;
            }

            // Handle "as alias" part if present
            int asIndex = packagePath.indexOf(" as ");
            if (asIndex > 0) {
                packagePath = packagePath.substring(0, asIndex).trim();
            }

            String[] parts = packagePath.split("/");
            if (parts.length >= 2) {
                String org = parts[0];
                String pkgName = parts[1];

                // Skip predefined lang libs
                if (isPredefinedLangLib(org, pkgName)) {
                    continue;
                }

                // Determine if it's internal or external
                boolean isInternal = org.equals(currentOrg) && pkgName.equals(currentPackage);

                // Create the link object
                JsonObject link = new JsonObject();
                link.addProperty("category", isInternal ? "internal" : "external");
                link.addProperty("recordName", recordName);

                if (!isInternal) {
                    // Add library name for external types
                    link.addProperty("libraryName", org + "/" + pkgName);
                }

                links.add(link);
            }
        }

        return links;
    }

    /**
     * Checks if a module is a predefined language library.
     */
    private boolean isPredefinedLangLib(String orgName, String packageName) {
        return "ballerina".equals(orgName) &&
               packageName.startsWith("lang.") &&
               !packageName.equals("lang.annotations");
    }

    /**
     * Loads services from inbuilt-triggers JSON files.
     * These JSON files contain service definitions with listener and function information.
     *
     * @param libraryName the library name (e.g., "ballerinax/kafka")
     * @return JsonArray containing services, or empty array if not found
     */
    private JsonArray loadServicesFromInbuiltTriggers(String libraryName) {
        JsonArray services = new JsonArray();

        // Map library names to inbuilt-triggers file names
        // This is specifically for known trigger libraries like kafka, asb, GitHub, etc.
        String triggerFileName = getInbuiltTriggerFileName(libraryName);
        if (triggerFileName == null) {
            return services; // No inbuilt trigger for this library
        }

        try (InputStream inputStream = CopilotLibraryService.class.getResourceAsStream("/inbuilt-triggers/" +
                triggerFileName)) {
            if (inputStream == null) {
                return services; // File not found
            }

            try (InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8)) {

                JsonObject triggerData = JsonParser.parseReader(reader).getAsJsonObject();

                // Extract listener information
                JsonObject listener = triggerData.getAsJsonObject("listener");
                if (listener == null) {
                    return services;
                }

                // Extract service types
                JsonArray serviceTypes = triggerData.getAsJsonArray("serviceTypes");
                if (serviceTypes == null || serviceTypes.isEmpty()) {
                    return services;
                }

                // For each service type, create a service object
                for (JsonElement serviceTypeElement : serviceTypes) {
                    JsonObject serviceType = serviceTypeElement.getAsJsonObject();

                    JsonObject serviceObj = new JsonObject();

                    // Service type: "fixed" for specific listeners
                    serviceObj.addProperty("type", "fixed");

                    // Build listener object
                    JsonObject listenerObj = buildListenerFromTriggerData(listener);
                    serviceObj.add("listener", listenerObj);

                    // Extract functions from service type
                    JsonArray functionsFromService = serviceType.getAsJsonArray("functions");
                    if (functionsFromService != null && !functionsFromService.isEmpty()) {
                        JsonArray transformedFunctions = new JsonArray();
                        for (JsonElement funcElement : functionsFromService) {
                            JsonObject func = funcElement.getAsJsonObject();
                            JsonObject transformedFunc = transformServiceFunction(func);
                            transformedFunctions.add(transformedFunc);
                        }
                        serviceObj.add("functions", transformedFunctions);
                    }

                    services.add(serviceObj);
                }

            }
        } catch (IOException e) {
            // If file doesn't exist or cannot be read, return empty array
            return services;
        }

        return services;
    }

    /**
     * Loads generic services for a specific library from the generic-services.json file.
     * Returns services defined for libraries like ballerina/http, ballerina/graphql, etc.
     *
     * @param libraryName the library name (e.g., "ballerina/http")
     * @return JsonArray containing services for this library, or empty array if not found
     */
    private JsonArray loadGenericServicesForLibrary(String libraryName) {
        JsonArray matchingServices = new JsonArray();

        try (InputStream inputStream = CopilotLibraryService.class.getResourceAsStream(GENERIC_SERVICES_JSON_PATH)) {
            if (inputStream == null) {
                return matchingServices; // File not found, return empty array
            }

            try (InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8)) {
                JsonObject genericServicesData = JsonParser.parseReader(reader).getAsJsonObject();

                // Get the services array
                JsonArray allServices = genericServicesData.getAsJsonArray("services");
                if (allServices == null || allServices.isEmpty()) {
                    return matchingServices;
                }

                // Filter services by library name
                for (JsonElement serviceElement : allServices) {
                    JsonObject service = serviceElement.getAsJsonObject();

                    // Check if this service belongs to the requested library
                    if (service.has("libraryName") &&
                        service.get("libraryName").getAsString().equals(libraryName)) {

                        // Create a copy of the service without the libraryName field
                        JsonObject serviceObj = new JsonObject();
                        serviceObj.addProperty("type", service.get("type").getAsString());
                        serviceObj.addProperty("instructions", service.get("instructions").getAsString());

                        // Copy listener object
                        if (service.has("listener")) {
                            serviceObj.add("listener", service.get("listener"));
                        }

                        // Copy functions array if present
                        if (service.has("functions")) {
                            serviceObj.add("functions", service.get("functions"));
                        }

                        matchingServices.add(serviceObj);
                    }
                }
            }
        } catch (IOException e) {
            // If file doesn't exist or cannot be read, return empty array
            return matchingServices;
        }

        return matchingServices;
    }

    /**
     * Maps library names to inbuilt-trigger file names.
     *
     * @param libraryName the library name (e.g., "ballerinax/kafka")
     * @return the trigger file name (e.g., "kafka.json") or null if not a trigger library
     */
    private String getInbuiltTriggerFileName(String libraryName) {
        // Remove org prefix if present
        String packageName = libraryName.contains("/") ?
                libraryName.substring(libraryName.indexOf("/") + 1) : libraryName;

        // Map known trigger libraries to their JSON file names
        return switch (packageName) {
            case "kafka" -> "kafka.json";
            case "asb" -> "asb.json";
            case "jms" -> "jms.json";
            case "rabbitmq" -> "rabbitmq.json";
            case "nats" -> "nats.json";
            case "ftp" -> "ftp.json";
            case "mqtt" -> "mqtt.json";
            case "salesforce" -> "salesforce.json";
            case "trigger.github", "github" -> "github.json";
            default -> null;
        };
    }

    /**
     * Builds a listener object from inbuilt-triggers listener data.
     *
     * @param listenerData the listener JSON object from triggers file
     * @return JsonObject representing the listener
     */
    private JsonObject buildListenerFromTriggerData(JsonObject listenerData) {
        JsonObject listenerObj = new JsonObject();

        // Get listener name from valueTypeConstraint
        String listenerName = listenerData.has("valueTypeConstraint") ?
                listenerData.get("valueTypeConstraint").getAsString() : "Listener";
        listenerObj.addProperty("name", listenerName);

        // Extract parameters from listener properties
        JsonArray parametersArray = new JsonArray();
        if (listenerData.has("properties")) {
            JsonObject properties = listenerData.getAsJsonObject("properties");
            for (String propKey : properties.keySet()) {
                JsonObject prop = properties.getAsJsonObject(propKey);
                JsonObject paramObj = buildParameterFromProperty(propKey, prop);
                parametersArray.add(paramObj);
            }
        }

        listenerObj.add("parameters", parametersArray);
        return listenerObj;
    }

    /**
     * Builds a parameter object from a listener property.
     *
     * @param propertyName the property name
     * @param property the property JSON object
     * @return JsonObject representing the parameter, or null if invalid
     */
    private JsonObject buildParameterFromProperty(String propertyName, JsonObject property) {
        JsonObject paramObj = new JsonObject();

        // Parameter name
        paramObj.addProperty("name", propertyName);

        // Parameter description from metadata
        String description = "";
        if (property.has("metadata")) {
            JsonObject metadata = property.getAsJsonObject("metadata");
            if (metadata.has("description")) {
                description = metadata.get("description").getAsString();
            }
        }
        paramObj.addProperty("description", description);

        // Parameter type
        JsonObject typeObj = new JsonObject();
        String typeName = property.has("valueTypeConstraint") ?
                property.get("valueTypeConstraint").getAsString() : "string";
        typeObj.addProperty("name", typeName);
        paramObj.add("type", typeObj);

        // Default value if present
        if (property.has("placeholder") && !property.get("placeholder").isJsonNull()) {
            paramObj.addProperty("default", property.get("placeholder").getAsString());
        }

        return paramObj;
    }

    /**
     * Transforms a service function from trigger data to the required format.
     *
     * @param functionData the function JSON object from triggers file
     * @return JsonObject representing the transformed function
     */
    private JsonObject transformServiceFunction(JsonObject functionData) {
        JsonObject func = new JsonObject();

        // Function name
        if (functionData.has("name")) {
            func.addProperty("name", functionData.get("name").getAsString());
        }

        String functionType = "Remote Function";
        if (functionData.has("qualifiers")) {
            JsonArray qualifiers = functionData.getAsJsonArray("qualifiers");
            if (qualifiers != null && !qualifiers.isEmpty()) {
                String qualifier = qualifiers.get(0).getAsString();
                functionType = qualifier.equals("remote") ? "Remote Function" : "Normal Function";
            }
        }
        func.addProperty("type", functionType);

        // Function documentation
        if (functionData.has("documentation")) {
            func.addProperty("description", functionData.get("documentation").getAsString());
        }

        // Parameters
        if (functionData.has("parameters")) {
            JsonArray parameters = functionData.getAsJsonArray("parameters");
            JsonArray transformedParams = new JsonArray();
            for (JsonElement paramElement : parameters) {
                JsonObject param = paramElement.getAsJsonObject();
                JsonObject transformedParam = new JsonObject();

                // Parameter name
                if (param.has("name")) {
                    transformedParam.addProperty("name", param.get("name").getAsString());
                }

                // Parameter description
                if (param.has("documentation")) {
                    transformedParam.addProperty("description", param.get("documentation").getAsString());
                }

                // Parameter type
                JsonObject typeObj = new JsonObject();
                if (param.has("type")) {
                    JsonElement typeElement = param.get("type");
                    if (typeElement.isJsonArray()) {
                        // If type is an array, get the first element (or default type)
                        JsonArray typeArray = typeElement.getAsJsonArray();
                        if (!typeArray.isEmpty()) {
                            typeObj.addProperty("name", typeArray.get(0).getAsString());
                        }
                    } else {
                        typeObj.addProperty("name", typeElement.getAsString());
                    }
                } else if (param.has("typeName")) {
                    typeObj.addProperty("name", param.get("typeName").getAsString());
                }
                transformedParam.add("type", typeObj);

                // Optional flag
                if (param.has("optional")) {
                    transformedParam.addProperty("optional", param.get("optional").getAsBoolean());
                }

                transformedParams.add(transformedParam);
            }
            func.add("parameters", transformedParams);
        }

        // Return type
        if (functionData.has("returnType")) {
            JsonObject returnTypeData = functionData.getAsJsonObject("returnType");
            JsonObject returnObj = new JsonObject();
            JsonObject returnTypeObj = new JsonObject();

            if (returnTypeData.has("typeName")) {
                returnTypeObj.addProperty("name", returnTypeData.get("typeName").getAsString());
            } else if (returnTypeData.has("type")) {
                JsonElement typeElement = returnTypeData.get("type");
                if (typeElement.isJsonArray()) {
                    JsonArray typeArray = typeElement.getAsJsonArray();
                    if (!typeArray.isEmpty()) {
                        returnTypeObj.addProperty("name", typeArray.get(0).getAsString());
                    }
                } else {
                    returnTypeObj.addProperty("name", typeElement.getAsString());
                }
            }
            returnObj.add("type", returnTypeObj);
            func.add("return", returnObj);
        }

        return func;
    }
}
