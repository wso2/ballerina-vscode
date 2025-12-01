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

package io.ballerina.persist.extension;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.persist.BalException;
import io.ballerina.persist.introspect.Introspector;
import io.ballerina.persist.introspect.IntrospectorBuilder;
import io.ballerina.persist.models.Module;
import io.ballerina.persist.nodegenerator.syntax.sources.DbModelGenSyntaxTree;
import io.ballerina.persist.nodegenerator.syntax.sources.DbSyntaxTree;
import io.ballerina.toml.syntax.tree.DocumentMemberDeclarationNode;
import io.ballerina.toml.syntax.tree.DocumentNode;
import io.ballerina.toml.syntax.tree.KeyValueNode;
import io.ballerina.toml.syntax.tree.SyntaxKind;
import io.ballerina.toml.syntax.tree.TableArrayNode;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.tools.text.LineRange;
import io.ballerina.tools.text.TextDocument;
import io.ballerina.tools.text.TextDocuments;
import org.ballerinalang.formatter.core.Formatter;
import org.ballerinalang.formatter.core.FormatterException;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static io.ballerina.persist.utils.BalProjectUtils.populateEntities;
import static io.ballerina.persist.utils.BalProjectUtils.populateEnums;
import static io.ballerina.projects.util.ProjectConstants.BALLERINA_TOML;

/**
 * Generates Ballerina persist client from database introspection.
 *
 * @since 1.5.0
 */
public class PersistClient {
    private static final String MODEL_FILE_NAME = "model.bal";
    private static final String PERSIST_DIR = "persist";
    private static final String LS = System.lineSeparator();
    public static final String MYSQL = "mysql";
    public static final String POSTGRESQL = "postgresql";
    public static final String MSSQL = "mssql";

    private final Path projectPath;
    private final String name;
    private final String datastore;
    private final String host;
    private final Integer port;
    private final String user;
    private final String database;
    private final Gson gson;
    private final IntrospectorBuilder introspectorBuilder;

    /**
     * Constructor for PersistClient.
     *
     * @param projectPath The project directory path
     * @param name        Name of the database connector
     * @param datastore    Database system type (mysql, postgresql, mssql)
     * @param host        Database host address
     * @param port        Database port number
     * @param user        Database username
     * @param password    Database user password
     * @param database    Name of the database to connect
     */
    public PersistClient(String projectPath, String name, String datastore, String host,
                         Integer port, String user, String password, String database) {
        this.projectPath = Path.of(projectPath);
        this.name = name;
        this.datastore = datastore != null ? datastore.toLowerCase(Locale.getDefault()) : "";
        this.host = host;
        this.port = port;
        this.user = user;
        this.database = database;
        this.gson = new Gson();
        this.introspectorBuilder = IntrospectorBuilder.newBuilder()
                .withDatastore(this.datastore)
                .withHost(this.host)
                .withPort(String.valueOf(this.port))
                .withUser(this.user)
                .withPassword(password)
                .withDatabase(this.database)
                .withSourcePath(projectPath);
    }

    /**
     * Introspects the database and returns table metadata.
     *
     * @return Array of table names in the database
     * @throws PersistClientException if an error occurs during introspection
     */
    public String[] introspectDatabaseTables() throws PersistClientException {
        validateConnectionDetails();
        try {
            String[] availableTables = introspectorBuilder
                    .build()
                    .getAvailableTables();
            if (availableTables.length == 0) {
                throw new PersistClientException("No tables found in the database.");
            }
            return availableTables;
        } catch (BalException e) {
            throw new PersistClientException("Error introspecting database tables: " + e.getMessage(), e);
        }
    }

    /**
     * Generates Ballerina persist client with model file and generated source files.
     *
     * @param selectedTables The tables to generate entities for
     * @param module         The target module name for the generated files
     * @return JsonElement containing the PersistClientResponse with text edits map
     * @throws PersistClientException if an error occurs during generation
     */
    public JsonElement generateClient(String[] selectedTables, String module) throws PersistClientException {
        validateConnectionDetails();

        if (module == null || module.isEmpty()) {
            module = name;
        }

        if (selectedTables == null || selectedTables.length == 0) {
            throw new PersistClientException("Selected tables cannot be null or empty");
        }

        try {
            Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
            boolean isModuleExists = genBalTomlTableEntry(module, textEditsMap);

            // Create the model file
            Introspector introspector;
            if (selectedTables.length == 1 && selectedTables[0].equals("*")) {
                introspector = introspectorBuilder.build();
            } else {
                introspector = introspectorBuilder
                        .withTables(String.join(",", selectedTables))
                        .build();
            }
            Module entityModule = introspector.introspectDatabase();
            if (entityModule.getEntityMap().isEmpty()) {
                throw new PersistClientException("No entities found in the database for the selected tables.");
            }
            DbModelGenSyntaxTree dbModelGenSyntaxTree = new DbModelGenSyntaxTree();
            SyntaxTree dataModels = dbModelGenSyntaxTree.getDataModels(entityModule);
            List<TextEdit> persistModelTextEdits = new ArrayList<>();
            Range startRange = CommonUtils.toRange(LinePosition.from(0, 0));
            persistModelTextEdits.add(new TextEdit(startRange, Formatter.format(dataModels.toSourceCode())));
            Path persistModelPath = this.projectPath.resolve(PERSIST_DIR).resolve(MODEL_FILE_NAME);
            textEditsMap.put(persistModelPath, persistModelTextEdits);

            Module.Builder moduleBuilder = Module.newBuilder(module);
            populateEnums(moduleBuilder, dataModels);
            populateEntities(moduleBuilder, dataModels);
            entityModule = moduleBuilder.build();

            // Generate client source files
            DbSyntaxTree dbSyntaxTree = new DbSyntaxTree();
            Path outputPath = projectPath.resolve("generated").resolve(module);

            SyntaxTree configFile = dbSyntaxTree.getDataStoreConfigSyntax(datastore);
            List<TextEdit> configTextEdits = new ArrayList<>();
            configTextEdits.add(new TextEdit(startRange, Formatter.format(configFile.toSourceCode())));
            textEditsMap.put(outputPath.resolve("persist_db_config.bal"), configTextEdits);


            SyntaxTree dataTypesFile = dbSyntaxTree.getDataTypesSyntax(entityModule);
            List<TextEdit> dataTypesTextEdits = new ArrayList<>();
            dataTypesTextEdits.add(new TextEdit(startRange, Formatter.format(dataTypesFile.toSourceCode())));
            textEditsMap.put(outputPath.resolve("persist_types.bal"), dataTypesTextEdits);


            SyntaxTree clientFile = dbSyntaxTree.getClientSyntax(entityModule, datastore, true);
            List<TextEdit> clientTextEdits = new ArrayList<>();
            clientTextEdits.add(new TextEdit(startRange, Formatter.format(clientFile.toSourceCode())));
            textEditsMap.put(outputPath.resolve("persist_client.bal"), clientTextEdits);

            return gson.toJsonTree(new PersistClientResponse(isModuleExists, textEditsMap));
        } catch (BalException | IOException | FormatterException e) {
            throw new PersistClientException("Error introspecting database: " + e.getMessage(), e);
        }
    }

    private boolean genBalTomlTableEntry(String module, Map<Path, List<TextEdit>> textEditsMap) throws IOException {
        Path tomlPath = this.projectPath.resolve(BALLERINA_TOML);
        TextDocument configDocument = TextDocuments.from(Files.readString(tomlPath));
        io.ballerina.toml.syntax.tree.SyntaxTree syntaxTree = io.ballerina.toml.syntax.tree.SyntaxTree
                .from(configDocument);
        DocumentNode rootNode = syntaxTree.rootNode();

        LineRange lineRange = null;
        for (DocumentMemberDeclarationNode node : rootNode.members()) {
            if (node.kind() != SyntaxKind.TABLE_ARRAY) {
                continue;
            }
            TableArrayNode tableArrayNode = (TableArrayNode) node;
            if (!tableArrayNode.identifier().toSourceCode().equals("tool.persist")) {
                continue;
            }

            for (KeyValueNode field : tableArrayNode.fields()) {
                String identifier = field.identifier().toSourceCode();
                if (identifier.trim().equals("targetModule")) {
                    if (field.value().toSourceCode().contains("\"" + module + "\"")) {
                        lineRange = tableArrayNode.lineRange();
                        break;
                    }
                }
            }
        }

        String tomlEntry = getTomlEntry(module);
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(tomlPath, textEdits);
        if (lineRange != null) {
            textEdits.add(new TextEdit(CommonUtils.toRange(lineRange), tomlEntry));
        } else {
            LinePosition startPos = LinePosition.from(rootNode.lineRange().endLine().line() + 1, 0);
            textEdits.add(new TextEdit(CommonUtils.toRange(startPos), tomlEntry));
        }
        return lineRange != null;
    }

    private String getTomlEntry(String module) {
        String moduleWithQuotes = "\"" + module + "\"";
        return LS + "[[tool.persist]]" + LS +
                "id" + " = " + moduleWithQuotes + LS +
                "targetModule" + " = " + moduleWithQuotes + LS +
                "filePath" + " = \"" + PERSIST_DIR + "/" + MODEL_FILE_NAME + "\"" + LS +
                "options.datastore" + " = \"" + datastore + "\"" + LS +
                "options.eagerLoading" + " = true" + LS;
    }

    /**
     * Validates the database connection details.
     *
     * @throws PersistClientException if validation fails
     */
    private void validateConnectionDetails() throws PersistClientException {
        if (datastore == null || datastore.isEmpty()) {
            throw new PersistClientException("Database system cannot be null or empty");
        }

        if (!isValidDbSystem(datastore)) {
            throw new PersistClientException("Invalid database system: " + datastore +
                    ". Supported systems are: mysql, postgresql, mssql");
        }

        if (host == null || host.isEmpty()) {
            throw new PersistClientException("Database host cannot be null or empty");
        }

        if (port == null || port <= 0) {
            throw new PersistClientException("Database port must be a positive number");
        }

        if (user == null || user.isEmpty()) {
            throw new PersistClientException("Database user cannot be null or empty");
        }

        if (database == null || database.isEmpty()) {
            throw new PersistClientException("Database name cannot be null or empty");
        }
    }

    /**
     * Checks if the database system is valid.
     *
     * @param dbSystem The database system to check
     * @return true if valid, false otherwise
     */
    private boolean isValidDbSystem(String dbSystem) {
        return MYSQL.equalsIgnoreCase(dbSystem) || POSTGRESQL.equalsIgnoreCase(dbSystem) ||
                MSSQL.equalsIgnoreCase(dbSystem);
    }

    /**
     * Record to hold the persist client response.
     *
     * @param isModuleExists Indicates if the module already exists in the Ballerina.toml
     * @param textEditsMap   Map of file paths to their corresponding text edits
     */
    private record PersistClientResponse(boolean isModuleExists, Map<Path, List<TextEdit>> textEditsMap) {
    }

    /**
     * Custom exception for persist generation errors.
     */
    public static class PersistClientException extends Exception {
        public PersistClientException(String message) {
            super(message);
        }

        public PersistClientException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}

