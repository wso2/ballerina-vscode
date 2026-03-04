/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
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

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.syntax.tree.BasicLiteralNode;
import io.ballerina.compiler.syntax.tree.CaptureBindingPatternNode;
import io.ballerina.compiler.syntax.tree.CheckExpressionNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionArgumentNode;
import io.ballerina.compiler.syntax.tree.IdentifierToken;
import io.ballerina.compiler.syntax.tree.ImportDeclarationNode;
import io.ballerina.compiler.syntax.tree.ImplicitNewExpressionNode;
import io.ballerina.compiler.syntax.tree.ModuleMemberDeclarationNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.ParenthesizedArgList;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.ModuleVariableDeclarationNode;
import io.ballerina.compiler.syntax.tree.PositionalArgumentNode;
import io.ballerina.compiler.syntax.tree.QualifiedNameReferenceNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.SimpleNameReferenceNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.compiler.syntax.tree.TypedBindingPatternNode;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.toml.syntax.tree.DocumentMemberDeclarationNode;
import io.ballerina.toml.syntax.tree.DocumentNode;
import io.ballerina.toml.syntax.tree.KeyValueNode;
import io.ballerina.toml.syntax.tree.TableArrayNode;
import io.ballerina.tools.diagnostics.Location;
import io.ballerina.tools.text.LineRange;
import io.ballerina.tools.text.TextDocument;
import io.ballerina.tools.text.TextDocuments;
import io.ballerina.tools.text.TextRange;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import static io.ballerina.projects.util.ProjectConstants.BALLERINA_TOML;

/**
 * Introspects credentials for an existing persist client connection from project source files.
 * <p>
 * The introspection flow:
 * <ol>
 *   <li>Creates an empty credential model (dbSystem, host, port, user, password, database)</li>
 *   <li>Finds the persist client connection declaration via the semantic model (module symbols),
 *       falling back to direct syntax tree iteration over project .bal files</li>
 *   <li>Parses the constructor arguments into expression nodes (literals used directly,
 *       variable references resolved through the semantic model to their configurable defaults)</li>
 *   <li>Enriches the empty model with the resolved values and metadata from
 *       {@code Ballerina.toml}</li>
 * </ol>
 *
 * @since 1.7.0
 */
public class CredentialsIntrospector {

    private static final String PERSIST_CLIENT_TYPE = "Client";
    private static final String TOML_TOOL_PERSIST = "tool.persist";
    private static final String TOML_TARGET_MODULE = "targetModule";
    private static final String TOML_FILE_PATH = "filePath";
    private static final String TOML_DATASTORE = "options.datastore";
    private static final String REQUIRED_PLACEHOLDER = "?";

    // Argument positions in the persist Client constructor: new (host, port, user, password, database)
    protected static final String HOST_KEY = "host";
    protected static final String PORT_KEY = "port";
    protected static final String USER_KEY = "user";
    protected static final String PASSWORD_KEY = "password";
    protected static final String DATABASE_KEY = "database";
    protected static final String DATABASE_TYPE_KEY = "dbSystem";
    private static final int ARG_IDX_HOST = 0;
    private static final int ARG_IDX_PORT = 1;
    private static final int ARG_IDX_USER = 2;
    private static final int ARG_IDX_PASSWORD = 3;
    private static final int ARG_IDX_DATABASE = 4;

    private final Path projectPath;
    private final String connectionName;
    private final WorkspaceManager workspaceManager;

    /**
     * Constructs a CredentialsIntrospector.
     *
     * @param projectPath      The root path of the Ballerina project
     * @param connectionName   Optional name of the connection variable to look up; if null/empty
     *                         the empty model is returned immediately
     * @param workspaceManager The workspace manager for accessing open documents
     */
    public CredentialsIntrospector(Path projectPath, String connectionName,
                                   WorkspaceManager workspaceManager) {
        this.projectPath = projectPath;
        this.connectionName = connectionName;
        this.workspaceManager = workspaceManager;
    }

    /**
     * Performs the credential introspection and returns the enriched data.
     * <p>
     * When {@code connectionName} is null or empty, the empty credential model is returned
     * immediately without reading any project files.
     *
     * @return The introspected {@link IntrospectCredentialsResponse.CredentialsData}
     * @throws PersistClient.PersistClientException if the connection cannot be found or files cannot be read
     */
    public IntrospectCredentialsResponse.CredentialsData introspect()
            throws PersistClient.PersistClientException {
        // Step 1: Create the empty credential model
        Map<String, Value> properties = createEmptyModel();

        // When no connection name is specified, return the empty model immediately
        if (connectionName == null || connectionName.isEmpty()) {
            return new IntrospectCredentialsResponse.CredentialsData(
                    new MetaData("", ""), properties, null, null);
        }

        // Obtain the semantic model once; it covers the entire package regardless of which file
        // is used as the entry point. May be null when the workspace has not yet compiled the project.
        SemanticModel semanticModel = workspaceManager.semanticModel(projectPath).orElse(null);

        // Step 2: Find the connection declaration.
        // Primary: query module symbols from the semantic model for the named variable symbol,
        //          then load the syntax tree from the symbol's declared location.
        // Fallback: iterate module members across .bal files in the project directory.
        ConnectionInfo connectionInfo = findConnectionViaSemanticModel(semanticModel);
        if (connectionInfo == null) {
            connectionInfo = findConnectionViaSyntaxTree();
        }

        if (connectionInfo == null) {
            throw new PersistClient.PersistClientException("Connection not found: " + connectionName);
        }

        // Resolve the full qualified module name from the import declarations in the source file
        String targetModule = resolveTargetModule(connectionInfo.modulePartNode(),
                connectionInfo.moduleAlias());

        // Get the datastore type and model file path from Ballerina.toml
        TomlConnectionInfo tomlInfo = getTomlConnectionInfo(targetModule);

        // Step 3: Enrich the empty model with the discovered values
        enrichProperties(properties, connectionInfo, semanticModel, tomlInfo);

        String dbSystem = tomlInfo != null ? tomlInfo.datastore() : null;
        String description = dbSystem != null ? dbSystem + " connection" : "Database connection";
        MetaData metadata = new MetaData(connectionInfo.connectionName(), description);

        return new IntrospectCredentialsResponse.CredentialsData(
                metadata,
                properties,
                targetModule,
                tomlInfo != null ? tomlInfo.modelFilePath() : null);
    }

    private Map<String, Value> createEmptyModel() { // TODO: need to improve the models we are sending
        Map<String, Value> properties = new LinkedHashMap<>();
        properties.put(DATABASE_TYPE_KEY, buildEmptyValue("Database System",
                "The database system type (e.g., mysql, postgresql, mssql)"));
        properties.put(HOST_KEY, buildEmptyValue("Host", "Database server host address"));
        properties.put(PORT_KEY, buildEmptyValue("Port", "Database server port number"));
        properties.put(DATABASE_KEY, buildEmptyValue("Database", "Name of the database to connect"));
        properties.put(USER_KEY, buildEmptyValue("User", "Database username"));
        properties.put(PASSWORD_KEY, buildEmptyValue("Password", "Database user password"));
        return properties;
    }

    private Value buildEmptyValue(String label, String description) {
        return new Value.ValueBuilder()
                .metadata(label, description)
                .enabled(true)
                .editable(true)
                .build();
    }

    /**
     * Locates the connection variable by querying the semantic model's module symbols for a
     * variable whose name matches {@code connectionName}.  The matching symbol's source location
     * is used to load the declaring file's syntax tree and navigate to the exact
     * {@link ModuleVariableDeclarationNode}.
     *
     * @param semanticModel The package semantic model; may be {@code null} when unavailable
     * @return {@link ConnectionInfo} on success, or {@code null} when the semantic model is
     *         unavailable or the symbol cannot be resolved
     */
    private ConnectionInfo findConnectionViaSemanticModel(SemanticModel semanticModel) {
        if (semanticModel == null) {
            return null;
        }
        try {
            // Filter module-level variable symbols by the requested connection name
            Optional<Symbol> matchingSymbol = semanticModel.moduleSymbols().stream()
                    .filter(s -> s.kind() == SymbolKind.VARIABLE)
                    .filter(s -> connectionName.equals(s.getName().orElse(null)))
                    .findFirst();

            if (matchingSymbol.isEmpty()) {
                return null;
            }

            Optional<Location> locationOpt = matchingSymbol.get().getLocation();
            if (locationOpt.isEmpty()) {
                return null;
            }

            LineRange symbolLineRange = locationOpt.get().lineRange();

            // Load the syntax tree of the file in which the symbol is declared
            Path symbolFilePath = projectPath.resolve(symbolLineRange.fileName());
            SyntaxTree syntaxTree = parseBalFile(symbolFilePath);

            // Convert the symbol's line range to a text range and locate the enclosing node
            TextDocument textDocument = syntaxTree.textDocument();
            int start = textDocument.textPositionFrom(symbolLineRange.startLine());
            int end = textDocument.textPositionFrom(symbolLineRange.endLine());
            ModulePartNode rootNode = (ModulePartNode) syntaxTree.rootNode();
            NonTerminalNode nodeAtLocation = rootNode
                    .findNode(TextRange.from(start, end - start), true);

            if (nodeAtLocation == null) {
                return null;
            }

            // Walk up the parent chain to reach the ModuleVariableDeclarationNode
            Node current = nodeAtLocation;
            while (current != null && !(current instanceof ModuleVariableDeclarationNode)) {
                current = current.parent();
            }

            if (current instanceof ModuleVariableDeclarationNode varDecl) {
                return extractConnectionInfo(varDecl, rootNode);
            }

            return null;
        } catch (Exception e) {
            // Any failure falls through to the syntax tree fallback
            return null;
        }
    }


    /**
     * Scans every {@code .bal} file in the project root directory and searches its module
     * members for a {@code final <module>:Client} variable declaration matching the requested
     * connection name.
     *
     * @return {@link ConnectionInfo} if found, or {@code null} when no match exists
     */
    private ConnectionInfo findConnectionViaSyntaxTree() throws PersistClient.PersistClientException {
        try (Stream<Path> stream = Files.list(projectPath)) {
            List<Path> balFiles = stream.filter(p -> p.toString().endsWith(".bal")).toList();
            for (Path balFile : balFiles) {
                SyntaxTree syntaxTree = parseBalFile(balFile);
                ConnectionInfo info = findConnection(syntaxTree.rootNode());
                if (info != null) {
                    return info;
                }
            }
        } catch (IOException e) {
            // Fall through — return null below
        }
        return null;
    }

    /**
     * Searches the module members of a single parsed file for a {@code final <module>:Client}
     * variable declaration matching the requested connection name.
     */
    private ConnectionInfo findConnection(ModulePartNode modulePartNode) {
        for (ModuleMemberDeclarationNode member : modulePartNode.members()) {
            if (!(member instanceof ModuleVariableDeclarationNode varDecl)) {
                continue;
            }

            // Quick name pre-filter: skip declarations that don't match the requested name
            TypedBindingPatternNode bp = varDecl.typedBindingPattern();
            if (!(bp.bindingPattern() instanceof CaptureBindingPatternNode capture)
                    || !connectionName.equals(capture.variableName().text())) {
                continue;
            }

            ConnectionInfo info = extractConnectionInfo(varDecl, modulePartNode);
            if (info != null) {
                return info;
            }
        }
        return null;
    }

    /**
     * Extracts {@link ConnectionInfo} from a {@link ModuleVariableDeclarationNode}, validating
     * that it is a {@code final <module>:Client} variable initialised with
     * {@code check new (...)}.  Returns {@code null} when the node does not match the expected
     * pattern.
     *
     * @param varDecl        The variable declaration node to analyse
     * @param modulePartNode The root of the file containing {@code varDecl}, stored in the result
     *                       so that import declarations can be resolved from the correct file later
     */
    private ConnectionInfo extractConnectionInfo(ModuleVariableDeclarationNode varDecl,
                                                 ModulePartNode modulePartNode) {
        // Must be a final variable
        boolean isFinal = varDecl.qualifiers().stream()
                .anyMatch(q -> q.kind() == SyntaxKind.FINAL_KEYWORD);
        if (!isFinal) {
            return null;
        }

        TypedBindingPatternNode bindingPattern = varDecl.typedBindingPattern();

        // Type must be a qualified reference like <module>:Client
        if (!(bindingPattern.typeDescriptor() instanceof QualifiedNameReferenceNode qualRef)) {
            return null;
        }
        if (!PERSIST_CLIENT_TYPE.equals(qualRef.identifier().text())) {
            return null;
        }

        String moduleAlias = qualRef.modulePrefix().text();

        // Binding pattern must be a simple capture (variable name)
        if (!(bindingPattern.bindingPattern() instanceof CaptureBindingPatternNode capture)) {
            return null;
        }
        String bindingName = capture.variableName().text();

        // Parse the constructor argument expressions (literals + variable references)
        List<ExpressionNode> ctorArgs = extractCtorArgs(varDecl);
        if (ctorArgs.isEmpty()) {
            return null;
        }

        return new ConnectionInfo(bindingName, moduleAlias, ctorArgs, modulePartNode);
    }

    /**
     * Extracts the positional argument expression nodes from a {@code check new (...)} initializer.
     * <p>
     * Unlike the previous name-only approach, every {@link ExpressionNode} is captured — whether
     * it is a literal (string, numeric) or a variable reference — so that the caller can resolve
     * the actual value through {@link #resolveArgValue}.
     *
     * @return ordered list of argument expressions, or an empty list when the structure does not
     *         match the expected pattern
     */
    private List<ExpressionNode> extractCtorArgs(ModuleVariableDeclarationNode varDecl) {
        List<ExpressionNode> args = new ArrayList<>();

        Optional<ExpressionNode> initializerOpt = varDecl.initializer();
        if (initializerOpt.isEmpty()) {
            return args;
        }

        ExpressionNode initializer = initializerOpt.get();
        if (!(initializer instanceof CheckExpressionNode check)) {
            return args;
        }

        ExpressionNode expr = check.expression();
        if (!(expr instanceof ImplicitNewExpressionNode implicitNew)) {
            return args;
        }

        Optional<ParenthesizedArgList> argListOpt = implicitNew.parenthesizedArgList();
        if (argListOpt.isEmpty()) {
            return args;
        }

        SeparatedNodeList<FunctionArgumentNode> argList = argListOpt.get().arguments();
        for (int i = 0; i < argList.size(); i++) {
            if (argList.get(i) instanceof PositionalArgumentNode posArg) {
                args.add(posArg.expression());
            }
        }
        return args;
    }

    // -------------------------------------------------------------------------
    // Resolve target module from imports
    // -------------------------------------------------------------------------

    /**
     * Resolves the fully-qualified module name (e.g., {@code myapp.testdb}) from the import
     * declarations in the source file where the connection was found, by matching the module
     * alias used in the connection type reference.
     */
    private String resolveTargetModule(ModulePartNode modulePartNode, String moduleAlias) {
        for (ImportDeclarationNode importDecl : modulePartNode.imports()) {
            SeparatedNodeList<IdentifierToken> moduleNameParts = importDecl.moduleName();

            List<String> parts = new ArrayList<>();
            for (IdentifierToken part : moduleNameParts) {
                parts.add(part.text());
            }
            if (parts.isEmpty()) {
                continue;
            }

            String fullModuleName = String.join(".", parts);

            // Determine the effective alias: explicit prefix overrides the default (last segment)
            String effectiveAlias = importDecl.prefix()
                    .map(p -> p.prefix().text())
                    .orElse(parts.getLast());

            if (effectiveAlias.equals(moduleAlias)) {
                return fullModuleName;
            }
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // Ballerina.toml parsing
    // -------------------------------------------------------------------------

    /**
     * Reads {@code Ballerina.toml} and returns the datastore type and model file path for the
     * {@code [[tool.persist]]} entry whose {@code targetModule} matches the given module name.
     */
    private TomlConnectionInfo getTomlConnectionInfo(String targetModule) {
        if (targetModule == null) {
            return null;
        }

        Path tomlPath = projectPath.resolve(BALLERINA_TOML);
        if (!Files.exists(tomlPath)) {
            return null;
        }

        try {
            TextDocument configDocument = TextDocuments.from(Files.readString(tomlPath));
            io.ballerina.toml.syntax.tree.SyntaxTree syntaxTree =
                    io.ballerina.toml.syntax.tree.SyntaxTree.from(configDocument);
            DocumentNode rootNode = syntaxTree.rootNode();

            for (DocumentMemberDeclarationNode node : rootNode.members()) {
                if (node.kind() != io.ballerina.toml.syntax.tree.SyntaxKind.TABLE_ARRAY) {
                    continue;
                }

                TableArrayNode tableArrayNode = (TableArrayNode) node;
                if (!TOML_TOOL_PERSIST.equals(tableArrayNode.identifier().toSourceCode())) {
                    continue;
                }

                String foundTargetModule = null;
                String foundDatastore = null;
                String foundFilePath = null;

                for (KeyValueNode field : tableArrayNode.fields()) {
                    String fieldId = field.identifier().toSourceCode().trim();
                    String fieldValue = stripQuotes(field.value().toSourceCode().trim());

                    switch (fieldId) {
                        case TOML_TARGET_MODULE -> foundTargetModule = fieldValue;
                        case TOML_DATASTORE -> foundDatastore = fieldValue;
                        case TOML_FILE_PATH -> foundFilePath = fieldValue;
                        default -> { /* ignore */ }
                    }
                }

                if (targetModule.equals(foundTargetModule)) {
                    return new TomlConnectionInfo(foundDatastore, foundFilePath);
                }
            }
        } catch (IOException e) {
            // Return null — callers handle missing toml info gracefully
        }
        return null;
    }

    /**
     * Populates the credential property values in the model using the constructor argument
     * expressions, the semantic model (for resolving variable references), and
     * Ballerina.toml metadata.
     */
    private void enrichProperties(Map<String, Value> properties, ConnectionInfo connectionInfo,
                                  SemanticModel semanticModel, TomlConnectionInfo tomlInfo) {
        List<ExpressionNode> ctorArgs = connectionInfo.ctorArgs();

        // dbSystem comes from Ballerina.toml, not from the constructor arguments
        if (tomlInfo != null && tomlInfo.datastore() != null) {
            setPropertyValue(properties, DATABASE_TYPE_KEY, tomlInfo.datastore());
        }

        // Remaining properties map positionally to constructor arguments:
        // arg[0]=host, arg[1]=port, arg[2]=user, arg[3]=password, arg[4]=database
        setPropertyFromArg(properties, ctorArgs, ARG_IDX_HOST, HOST_KEY, semanticModel);
        setPropertyFromArg(properties, ctorArgs, ARG_IDX_PORT, PORT_KEY, semanticModel);
        setPropertyFromArg(properties, ctorArgs, ARG_IDX_USER, USER_KEY, semanticModel);
        setPropertyFromArg(properties, ctorArgs, ARG_IDX_PASSWORD, PASSWORD_KEY, semanticModel);
        setPropertyFromArg(properties, ctorArgs, ARG_IDX_DATABASE, DATABASE_KEY, semanticModel);
    }

    private void setPropertyFromArg(Map<String, Value> properties, List<ExpressionNode> ctorArgs,
                                    int argIdx, String propertyKey, SemanticModel semanticModel) {
        String value = resolveArgValue(ctorArgs.get(argIdx), semanticModel);
        setPropertyValue(properties, propertyKey, value);
    }

    /**
     * Resolves the string value for a single constructor argument expression.
     * <ul>
     *   <li>{@link BasicLiteralNode} (string/numeric literal) — token text used directly</li>
     *   <li>{@link SimpleNameReferenceNode} (variable reference) — the semantic model is queried
     *       for the corresponding module-level symbol; if the symbol is a {@code configurable}
     *       variable with a default value, that default is returned</li>
     * </ul>
     *
     * @param expr          The constructor argument expression
     * @param semanticModel The package semantic model; may be {@code null}
     * @return The resolved string value, or {@code null} when it cannot be determined
     */
    private String resolveArgValue(ExpressionNode expr, SemanticModel semanticModel) {
        // Literal value (string, numeric, boolean) — use the token text directly
        if (expr instanceof BasicLiteralNode literal) {
            return stripQuotes(literal.literalToken().text());
        }

        // Variable reference — resolve through the semantic model to find the configurable default
        if (expr instanceof SimpleNameReferenceNode nameRef && semanticModel != null) {
            String varName = nameRef.name().text();
            Optional<Symbol> symbolOpt = semanticModel.moduleSymbols().stream()
                    .filter(s -> s.kind() == SymbolKind.VARIABLE)
                    .filter(s -> varName.equals(s.getName().orElse(null)))
                    .findFirst();
            if (symbolOpt.isPresent()) {
                return resolveConfigurableDefault(symbolOpt.get());
            }
        }

        return null;
    }

    /**
     * Finds the configurable default value for a module-level variable symbol by loading the
     * syntax tree from the symbol's declared location and reading the initializer expression.
     * <p>
     * Returns {@code null} for non-configurable variables or required configurables ({@code = ?}).
     *
     * @param symbol A module-level variable symbol obtained from the semantic model
     * @return The default value as a string, or {@code null} when unavailable
     */
    private String resolveConfigurableDefault(Symbol symbol) {
        try {
            Optional<Location> locationOpt = symbol.getLocation();
            if (locationOpt.isEmpty()) {
                return null;
            }

            LineRange lineRange = locationOpt.get().lineRange();
            Path filePath = projectPath.resolve(lineRange.fileName());
            SyntaxTree syntaxTree = parseBalFile(filePath);

            // Navigate to the exact node using the symbol's text range
            TextDocument textDocument = syntaxTree.textDocument();
            int start = textDocument.textPositionFrom(lineRange.startLine());
            int end = textDocument.textPositionFrom(lineRange.endLine());
            ModulePartNode rootNode = (ModulePartNode) syntaxTree.rootNode();
            NonTerminalNode nodeAtLocation = rootNode
                    .findNode(TextRange.from(start, end - start), true);

            if (nodeAtLocation == null) {
                return null;
            }

            // Walk up to the containing ModuleVariableDeclarationNode
            Node current = nodeAtLocation;
            while (current != null && !(current instanceof ModuleVariableDeclarationNode)) {
                current = current.parent();
            }

            if (!(current instanceof ModuleVariableDeclarationNode varDecl)) {
                return null;
            }

            // Must be a configurable variable
            boolean isConfigurable = varDecl.qualifiers().stream()
                    .anyMatch(q -> q.kind() == SyntaxKind.CONFIGURABLE_KEYWORD);
            if (!isConfigurable) {
                return null;
            }

            Optional<ExpressionNode> initializerOpt = varDecl.initializer();
            if (initializerOpt.isEmpty()) {
                return null;
            }

            String rawValue = initializerOpt.get().toSourceCode().trim();
            // Required configurables declare their value as "?" — skip them
            if (REQUIRED_PLACEHOLDER.equals(rawValue)) {
                return null;
            }

            return stripQuotes(rawValue);
        } catch (Exception e) {
            return null;
        }
    }

    private void setPropertyValue(Map<String, Value> properties, String propertyKey, String value) {
        Value existing = properties.get(propertyKey);
        if (existing != null) {
            existing.setValue(value);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Parses a Ballerina source file into a {@link SyntaxTree}, preferring the workspace-cached
     * version when available, falling back to direct file reading.
     */
    private SyntaxTree parseBalFile(Path filePath) throws PersistClient.PersistClientException {
        try {
            Optional<io.ballerina.projects.Document> document = workspaceManager.document(filePath);
            if (document.isPresent()) {
                return document.get().syntaxTree();
            }
            // Fallback: parse directly from disk
            TextDocument textDocument = TextDocuments.from(Files.readString(filePath));
            return SyntaxTree.from(textDocument);
        } catch (IOException e) {
            throw new PersistClient.PersistClientException(
                    "Failed to read file: " + filePath + ": " + e.getMessage(), e);
        }
    }

    /**
     * Strips surrounding double-quotes from a TOML string value or Ballerina string literal,
     * e.g. {@code "\"mysql\""} → {@code "mysql"}.
     */
    private String stripQuotes(String value) {
        if (value != null && value.length() >= 2
                && value.charAt(0) == '"' && value.charAt(value.length() - 1) == '"') {
            return value.substring(1, value.length() - 1);
        }
        return value;
    }

    /**
     * Holds information extracted from the persist client connection declaration.
     *
     * @param connectionName The binding variable name (e.g., {@code testdb})
     * @param moduleAlias    The module prefix used in the type reference (e.g., {@code testdb} in
     *                       {@code testdb:Client})
     * @param ctorArgs       The positional constructor argument expressions in order:
     *                       host, port, user, password, database
     * @param modulePartNode The root node of the file where the connection was declared; used to
     *                       resolve import declarations from the correct file
     */
    private record ConnectionInfo(String connectionName, String moduleAlias,
                                  List<ExpressionNode> ctorArgs, ModulePartNode modulePartNode) {
    }

    /**
     * Holds persist-specific metadata extracted from {@code Ballerina.toml}.
     *
     * @param datastore     The database system type (e.g., {@code mysql})
     * @param modelFilePath The relative path to the persist model file (e.g.,
     *                      {@code persist/testdb/model.bal})
     */
    private record TomlConnectionInfo(String datastore, String modelFilePath) {
    }
}
