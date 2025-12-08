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
import io.ballerina.compiler.syntax.tree.CaptureBindingPatternNode;
import io.ballerina.compiler.syntax.tree.FunctionArgumentNode;
import io.ballerina.compiler.syntax.tree.IdentifierToken;
import io.ballerina.compiler.syntax.tree.ImportDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModuleMemberDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NewExpressionNode;
import io.ballerina.compiler.syntax.tree.NodeFactory;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.ParenthesizedArgList;
import io.ballerina.compiler.syntax.tree.PositionalArgumentNode;
import io.ballerina.compiler.syntax.tree.QualifiedNameReferenceNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.compiler.syntax.tree.TypedBindingPatternNode;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.persist.BalException;
import io.ballerina.persist.introspect.Introspector;
import io.ballerina.persist.introspect.IntrospectorBuilder;
import io.ballerina.persist.models.Module;
import io.ballerina.persist.nodegenerator.syntax.sources.DbModelGenSyntaxTree;
import io.ballerina.persist.nodegenerator.syntax.sources.DbSyntaxTree;
import io.ballerina.projects.Document;
import io.ballerina.projects.Project;
import io.ballerina.toml.syntax.tree.DocumentMemberDeclarationNode;
import io.ballerina.toml.syntax.tree.DocumentNode;
import io.ballerina.toml.syntax.tree.KeyValueNode;
import io.ballerina.toml.syntax.tree.SyntaxKind;
import io.ballerina.toml.syntax.tree.TableArrayNode;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.tools.text.LineRange;
import io.ballerina.tools.text.TextDocument;
import io.ballerina.tools.text.TextDocuments;
import io.ballerina.tools.text.TextLine;
import org.ballerinalang.formatter.core.Formatter;
import org.ballerinalang.formatter.core.FormatterException;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
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
import java.util.Optional;

import static io.ballerina.compiler.syntax.tree.AbstractNodeFactory.createIdentifierToken;
import static io.ballerina.compiler.syntax.tree.AbstractNodeFactory.createNodeList;
import static io.ballerina.compiler.syntax.tree.AbstractNodeFactory.createSeparatedNodeList;
import static io.ballerina.compiler.syntax.tree.AbstractNodeFactory.createToken;
import static io.ballerina.compiler.syntax.tree.NodeFactory.createCaptureBindingPatternNode;
import static io.ballerina.compiler.syntax.tree.NodeFactory.createImplicitNewExpressionNode;
import static io.ballerina.compiler.syntax.tree.NodeFactory.createModuleVariableDeclarationNode;
import static io.ballerina.compiler.syntax.tree.NodeFactory.createParenthesizedArgList;
import static io.ballerina.compiler.syntax.tree.NodeFactory.createPositionalArgumentNode;
import static io.ballerina.compiler.syntax.tree.NodeFactory.createQualifiedNameReferenceNode;
import static io.ballerina.compiler.syntax.tree.NodeFactory.createSimpleNameReferenceNode;
import static io.ballerina.compiler.syntax.tree.NodeFactory.createTypedBindingPatternNode;
import static io.ballerina.compiler.syntax.tree.SyntaxKind.CLOSE_PAREN_TOKEN;
import static io.ballerina.compiler.syntax.tree.SyntaxKind.COLON_TOKEN;
import static io.ballerina.compiler.syntax.tree.SyntaxKind.DOT_TOKEN;
import static io.ballerina.compiler.syntax.tree.SyntaxKind.FINAL_KEYWORD;
import static io.ballerina.compiler.syntax.tree.SyntaxKind.IMPORT_KEYWORD;
import static io.ballerina.compiler.syntax.tree.SyntaxKind.NEW_KEYWORD;
import static io.ballerina.compiler.syntax.tree.SyntaxKind.OPEN_PAREN_TOKEN;
import static io.ballerina.compiler.syntax.tree.SyntaxKind.SEMICOLON_TOKEN;
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
    public static final Range START_RANGE = CommonUtils.toRange(LinePosition.from(0, 0));

    private final Path projectPath;
    private final String name;
    private final String datastore;
    private final String host;
    private final Integer port;
    private final String user;
    private final String database;
    private final Gson gson;
    private final IntrospectorBuilder introspectorBuilder;
    private final WorkspaceManager workspaceManager;

    /**
     * Constructor for PersistClient.
     *
     * @param projectPath      The project directory path
     * @param name             Name of the database connector
     * @param datastore        Database system type (mysql, postgresql, mssql)
     * @param host             Database host address
     * @param port             Database port number
     * @param user             Database username
     * @param password         Database user password
     * @param database         Name of the database to connect
     * @param workspaceManager The workspace manager
     */
    public PersistClient(String projectPath, String name, String datastore, String host,
                         Integer port, String user, String password, String database,
                         WorkspaceManager workspaceManager) {
        this.projectPath = Path.of(projectPath);
        this.name = name;
        this.datastore = datastore != null ? datastore.toLowerCase(Locale.getDefault()) : "";
        this.host = host;
        this.port = port;
        this.user = user;
        this.database = database;
        this.gson = new Gson();
        this.workspaceManager = workspaceManager;
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
     * Generates Ballerina persist client with model file and generated source
     * files.
     *
     * @param selectedTables The tables to generate entities for
     * @param module         The target module name for the generated files
     * @return JsonElement containing the PersistClientResponse with text edits map
     * @throws PersistClientException if an error occurs during generation
     */
    public JsonElement generateClient(String[] selectedTables, String module) throws PersistClientException {
        validateConnectionDetails();

        if (module == null || module.isEmpty()) {
            module = generateModuleNameFromDatabase(this.database, this.datastore);
        }

        if (selectedTables == null || selectedTables.length == 0) {
            throw new PersistClientException("Selected tables cannot be null or empty");
        }

        // If the directory exists with at least one bal file, then throw error for now
        // Once persist supports multiple model files, this can be removed
        Path persistPath = this.projectPath.resolve(PERSIST_DIR);
        if (Files.exists(persistPath)) {
            try (var files = Files.list(persistPath)) {
                if (files.anyMatch(path -> path.toString().endsWith(".bal"))) {
                    throw new PersistClientException("Currently only one database connection is supported per " +
                            "project. A database connection is already present in the project at: " + persistPath);
                }
            } catch (IOException e) {
                throw new PersistClientException("Error checking existing database connections: " + e.getMessage(), e);
            }
        }

        Path persistModelPath = persistPath.resolve(MODEL_FILE_NAME);

        try {
            Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
            boolean isModuleExists = addTextEditForPersistBuildOption(module, textEditsMap);
            Module entityModule = getInitialEntityModule(selectedTables);
            SyntaxTree dataModels = new DbModelGenSyntaxTree().getDataModels(entityModule);
            addTextEditForPersistModelFile(dataModels, textEditsMap, persistModelPath);
            // Need to reload since the current initial entity module does not have enums
            // and other details
            entityModule = reloadEntityFromSyntaxTree(module, dataModels);
            addTextEditsForClientModuleSources(module, textEditsMap, entityModule);
            addTextEditForConfigurations(textEditsMap);
            addTextEditForConnectionClient(module, textEditsMap);
            return gson.toJsonTree(new PersistClientResponse(isModuleExists, textEditsMap));
        } catch (BalException | IOException | FormatterException e) {
            throw new PersistClientException("Error introspecting database: " + e.getMessage(), e);
        }
    }

    private void addTextEditForConfigurations(Map<Path, List<TextEdit>> textEditsMap) {
        Path configFilePath = projectPath.resolve("config.bal");
        boolean isConfigFileExist = Files.exists(configFilePath);
        Optional<Document> document = isConfigFileExist ? workspaceManager.document(configFilePath)
                : Optional.empty();
        String config = LS + "configurable string " + this.name + "Host = \"" + this.host + "\";" + LS;
        config += "configurable int " + this.name + "Port = " + this.port + ";" + LS;
        config += "configurable string " + this.name + "User = \"" + this.user + "\";" + LS;
        config += "configurable string " + this.name + "Password = ?;" + LS;
        config += "configurable string " + this.name + "Database = \"" + this.database + "\";" + LS;

        // If the config file is not present or empty, get the start range to add the content
        // Else append at the end of the file
        if (document.isEmpty() || document.get().textDocument().textLines().isEmpty()) {
            List<TextEdit> textEdits = new ArrayList<>();
            textEdits.add(new TextEdit(START_RANGE, config));
            textEditsMap.put(configFilePath, textEdits);
        } else {
            List<TextEdit> textEdits = new ArrayList<>();
            TextDocument doc = document.get().textDocument();
            TextLine lastLine = doc.line(doc.textLines().size() - 1);
            Range endRange = CommonUtils.toRange(LinePosition.from(lastLine.lineNo(), lastLine.length()));
            textEdits.add(new TextEdit(endRange, config));
            textEditsMap.put(configFilePath, textEdits);
        }
    }

    private void addTextEditForConnectionClient(String module, Map<Path, List<TextEdit>> textEditsMap)
            throws PersistClientException {
        try {
            Path connectionsFilePath = projectPath.resolve("connections.bal");
            Project project = this.workspaceManager.loadProject(projectPath);
            String packageName = project.currentPackage().packageName().value();
            boolean isConnectionsFileExists = Files.exists(connectionsFilePath);
            Optional<Document> document = isConnectionsFileExists ? workspaceManager.document(connectionsFilePath)
                    : Optional.empty();

            // If the connections file is not present or empty, add the full content at the
            // start
            if (document.isEmpty() || document.get().textDocument().textLines().isEmpty()) {
                List<TextEdit> textEdits = new ArrayList<>();
                String importStmt = "import " + packageName + "." + module + ";" + LS;
                String clientDeclaration = "final " + module + ":Client " + this.name + " = check new (" +
                        this.name + "Host, " + this.name + "Port, " + this.name + "User, " +
                        this.name + "Password, " + this.name + "Database" + ");" + LS;
                textEdits.add(new TextEdit(START_RANGE, importStmt + LS + clientDeclaration + LS));
                textEditsMap.put(connectionsFilePath, textEdits);
            } else {
                addTextEditWithExistingConnections(module, textEditsMap, document.get(), connectionsFilePath);
            }
        } catch (WorkspaceDocumentException | EventSyncException | FormatterException e) {
            throw new PersistClientException("Error accessing existing connections: " + e.getMessage(), e);
        }
    }

    private void addTextEditWithExistingConnections(String module, Map<Path, List<TextEdit>> textEditsMap,
            Document document, Path connectionsFilePath)
            throws FormatterException, PersistClientException {
        try {
            Project project = this.workspaceManager.loadProject(projectPath);
            String packageName = project.currentPackage().packageName().value();
            SyntaxTree syntaxTree = document.syntaxTree();
            ModulePartNode modulePartNode = syntaxTree.rootNode();
            modulePartNode = modifyWithImportStatement(packageName, module, modulePartNode);
            modulePartNode = modifyWithClientDeclaration(module, modulePartNode);
            SyntaxTree newSyntaxTree = syntaxTree.modifyWith(modulePartNode);
            SyntaxTree formattedSyntaxTree = Formatter.format(newSyntaxTree);
            List<TextEdit> textEdits = new ArrayList<>();
            textEdits.add(new TextEdit(START_RANGE, formattedSyntaxTree.toSourceCode()));
            textEditsMap.put(connectionsFilePath, textEdits);
        } catch (WorkspaceDocumentException | EventSyncException e) {
            throw new PersistClientException("Error loading project for connections: " + e.getMessage(), e);
        }
    }

    private ModulePartNode modifyWithClientDeclaration(String module, ModulePartNode modulePartNode) {
        QualifiedNameReferenceNode moduleRefNode = createQualifiedNameReferenceNode(
                createIdentifierToken(module),
                createToken(COLON_TOKEN),
                createIdentifierToken("Client"));
        CaptureBindingPatternNode bindingPattern = createCaptureBindingPatternNode(
                createIdentifierToken(this.name));
        TypedBindingPatternNode clientTypeBindingNode = createTypedBindingPatternNode(
                moduleRefNode,
                bindingPattern);
        PositionalArgumentNode hostRefNode = createPositionalArgumentNode(createSimpleNameReferenceNode(
                createIdentifierToken(this.name + "Host")));
        PositionalArgumentNode portRefNode = createPositionalArgumentNode(createSimpleNameReferenceNode(
                createIdentifierToken(this.name + "Port")));
        PositionalArgumentNode userRefNode = createPositionalArgumentNode(createSimpleNameReferenceNode(
                createIdentifierToken(this.name + "User")));
        PositionalArgumentNode passwordRefNode = createPositionalArgumentNode(createSimpleNameReferenceNode(
                createIdentifierToken(this.name + "Password")));
        PositionalArgumentNode databaseRefNode = createPositionalArgumentNode(createSimpleNameReferenceNode(
                createIdentifierToken(this.name + "Database")));
        SeparatedNodeList<FunctionArgumentNode> nodeList = createSeparatedNodeList(
                hostRefNode,
                portRefNode,
                userRefNode,
                passwordRefNode,
                databaseRefNode
        );
        ParenthesizedArgList parenthesizedArgList = createParenthesizedArgList(createToken(OPEN_PAREN_TOKEN),
                nodeList,
                createToken(CLOSE_PAREN_TOKEN));
        NewExpressionNode clientInitNode = createImplicitNewExpressionNode(
                createToken(NEW_KEYWORD),
                parenthesizedArgList);
        ModuleMemberDeclarationNode clientDeclarationNode = createModuleVariableDeclarationNode(
                null,
                null,
                createNodeList(NodeFactory.createToken(FINAL_KEYWORD)),
                clientTypeBindingNode,
                NodeFactory.createToken(io.ballerina.compiler.syntax.tree.SyntaxKind.EQUAL_TOKEN),
                clientInitNode,
                NodeFactory.createToken(SEMICOLON_TOKEN));
        modulePartNode = modulePartNode.modify()
                .withMembers(modulePartNode.members().add(clientDeclarationNode)).apply();
        return modulePartNode;
    }

    private static ModulePartNode modifyWithImportStatement(String packageName, String module,
                                                            ModulePartNode modulePartNode) {
        SeparatedNodeList<IdentifierToken> moduleName = createSeparatedNodeList(
                createIdentifierToken(packageName),
                createToken(DOT_TOKEN),
                createIdentifierToken(module));
        ImportDeclarationNode importDeclarationNode = NodeFactory.createImportDeclarationNode(
                createToken(IMPORT_KEYWORD),
                null,
                moduleName,
                null,
                NodeFactory.createToken(SEMICOLON_TOKEN));
        NodeList<ImportDeclarationNode> importDeclarations = modulePartNode.imports();
        // Check if the import already exists
        boolean importExists = false;
        for (ImportDeclarationNode importDeclaration : importDeclarations) {
            if (importDeclaration.moduleName().equals(moduleName)) {
                importExists = true;
                break;
            }
        }
        if (!importExists) {
            ArrayList<ImportDeclarationNode> imports = new ArrayList<>(importDeclarations.stream().toList());
            imports.add(importDeclarationNode);
            NodeList<ImportDeclarationNode> newImports = createNodeList(imports);
            modulePartNode = modulePartNode.modify().withImports(newImports).apply();
        }
        return modulePartNode;
    }

    private void addTextEditsForClientModuleSources(String module, Map<Path, List<TextEdit>> textEditsMap,
                                                    Module entityModule)
            throws PersistClientException, FormatterException, BalException {
        DbSyntaxTree dbSyntaxTree = new DbSyntaxTree();
        Path outputPath = projectPath.resolve("generated").resolve(module);

        // If the module directory already exists, throw an error
        if (Files.exists(outputPath)) {
            throw new PersistClientException("A database connector with the same name already exists: " + outputPath);
        }

        SyntaxTree dataTypesFile = dbSyntaxTree.getDataTypesSyntax(entityModule);
        List<TextEdit> dataTypesTextEdits = new ArrayList<>();
        dataTypesTextEdits.add(new TextEdit(START_RANGE, Formatter.format(dataTypesFile.toSourceCode())));
        textEditsMap.put(outputPath.resolve("persist_types.bal"), dataTypesTextEdits);

        SyntaxTree clientFile = dbSyntaxTree.getClientSyntax(entityModule, datastore, true, true);
        List<TextEdit> clientTextEdits = new ArrayList<>();
        clientTextEdits.add(new TextEdit(START_RANGE, Formatter.format(clientFile.toSourceCode())));
        textEditsMap.put(outputPath.resolve("persist_client.bal"), clientTextEdits);
    }

    private static Module reloadEntityFromSyntaxTree(String module, SyntaxTree dataModels)
            throws IOException, BalException {
        Module entityModule;
        Module.Builder moduleBuilder = Module.newBuilder(module);
        populateEnums(moduleBuilder, dataModels);
        populateEntities(moduleBuilder, dataModels);
        entityModule = moduleBuilder.build();
        return entityModule;
    }

    private static void addTextEditForPersistModelFile(SyntaxTree dataModels, Map<Path, List<TextEdit>> textEditsMap,
            Path persistModelPath)
            throws FormatterException {
        List<TextEdit> persistModelTextEdits = new ArrayList<>();
        persistModelTextEdits.add(new TextEdit(START_RANGE, Formatter.format(dataModels.toSourceCode())));
        textEditsMap.put(persistModelPath, persistModelTextEdits);
    }

    private Module getInitialEntityModule(String[] selectedTables) throws BalException, PersistClientException {
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
        return entityModule;
    }

    private static String generateModuleNameFromDatabase(String database, String datastore) {
        // Generate a module name combining the database name and datastore name
        // Module names can only contain alphanumerics, underscores, and periods
        String sanitizedDbName = database.replaceAll("[^a-zA-Z0-9]", "_").toLowerCase(Locale.getDefault());
        String sanitizedDatastore = datastore.replaceAll("[^a-zA-Z0-9]", "_").toLowerCase(Locale.getDefault());
        return sanitizedDbName + "_" + sanitizedDatastore;
    }

    private boolean addTextEditForPersistBuildOption(String module, Map<Path, List<TextEdit>> textEditsMap)
            throws IOException {
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
                "options.eagerLoading" + " = true" + LS +
                "options.initParams" + " = true" + LS;
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
     * @param isModuleExists Indicates if the module already exists in the
     *                       Ballerina.toml
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
