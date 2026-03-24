/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package io.ballerina.servicemodelgenerator.extension.builder.service;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.CheckExpressionNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionArgumentNode;
import io.ballerina.compiler.syntax.tree.ListConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.ListenerDeclarationNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingFieldNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NamedArgumentNode;
import io.ballerina.compiler.syntax.tree.NewExpressionNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.projects.Document;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Project;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.util.ListenerUtil;
import io.ballerina.tools.diagnostics.Location;
import io.ballerina.tools.text.TextRange;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Logger;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.POSTGRESQL;
import static io.ballerina.servicemodelgenerator.extension.util.ListenerUtil.getArgList;

/**
 * Builder class for PostgreSQL CDC service.
 *
 * @since 1.6.0
 */
public final class PostgresqlCdcServiceBuilder extends AbstractCdcServiceBuilder {

    private static final Logger LOGGER = Logger.getLogger(PostgresqlCdcServiceBuilder.class.getName());
    private static final String CDC_POSTGRESQL_SERVICE_MODEL_LOCATION = "services/cdc_postgresql.json";
    private static final String POSTGRESQL_CDC_DRIVER_MODULE_NAME = "postgresql.cdc.driver";
    private static final String DISPLAY_LABEL = "PostgreSQL CDC";

    @Override
    protected String getCdcServiceModelLocation() {
        return CDC_POSTGRESQL_SERVICE_MODEL_LOCATION;
    }

    @Override
    protected String getCdcDriverModuleName() {
        return POSTGRESQL_CDC_DRIVER_MODULE_NAME;
    }

    @Override
    protected List<String> getListenerFields() {
        return List.of(
            KEY_LISTENER_VAR_NAME,
            KEY_HOST,
            KEY_PORT,
            KEY_USERNAME,
            KEY_PASSWORD,
            KEY_DATABASE,
            KEY_SCHEMAS,
            KEY_SECURE_SOCKET,
            KEY_OPTIONS
            // Note: NO KEY_DATABASE_INSTANCE (PostgreSQL doesn't use it)
        );
    }

    @Override
    public String kind() {
        return POSTGRESQL;
    }

    @Override
    protected String getDisplayLabel() {
        return DISPLAY_LABEL;
    }

    @Override
    protected Map<String, Map<String, Value>> extractListenerConfigs(
            Set<String> listenerNames, SemanticModel semanticModel, Project project) {
        Map<String, Map<String, Value>> configs = new LinkedHashMap<>();
        for (String listenerName : listenerNames) {
            Map<String, Value> config = extractSinglePostgresqlListenerConfig(listenerName, semanticModel, project);
            if (config != null && !config.isEmpty()) {
                configs.put(listenerName, config);
            }
        }
        return configs;
    }

    @Override
    protected void applyInitModelMetadata(Map<String, Map<String, Value>> configs,
                                           Map<String, Value> templateProps) {
        Map<String, String> keyMapping = Map.of(
                KEY_HOST, KEY_HOST,
                KEY_PORT, KEY_PORT,
                KEY_USERNAME, KEY_USERNAME,
                KEY_PASSWORD, KEY_PASSWORD,
                KEY_DATABASE, KEY_DATABASE,
                KEY_SCHEMAS, KEY_SCHEMAS,
                KEY_SECURE_SOCKET, KEY_SECURE_SOCKET,
                KEY_OPTIONS, KEY_OPTIONS
        );

        for (Map<String, Value> config : configs.values()) {
            for (Map.Entry<String, String> mapping : keyMapping.entrySet()) {
                Value configValue = config.get(mapping.getKey());
                Value templateValue = templateProps.get(mapping.getValue());
                if (configValue != null && templateValue != null && templateValue.getMetadata() != null) {
                    configValue.setMetadata(templateValue.getMetadata());
                }
            }
        }
    }

    private Map<String, Value> extractSinglePostgresqlListenerConfig(
            String listenerName, SemanticModel semanticModel, Project project) {
        Optional<VariableSymbol> listenerSymbol = Optional.empty();
        for (Symbol moduleSymbol : semanticModel.moduleSymbols()) {
            if (!(moduleSymbol instanceof VariableSymbol variableSymbol)
                    || !variableSymbol.qualifiers().contains(Qualifier.LISTENER)) {
                continue;
            }
            if (variableSymbol.getName().isPresent() && variableSymbol.getName().get().equals(listenerName)) {
                listenerSymbol = Optional.of(variableSymbol);
                break;
            }
        }
        if (listenerSymbol.isEmpty() || listenerSymbol.get().getLocation().isEmpty()) {
            return null;
        }

        Location location = listenerSymbol.get().getLocation().get();
        try {
            Path path = project.sourceRoot().resolve(location.lineRange().fileName());
            DocumentId documentId = project.documentId(path);
            Document document = project.currentPackage().getDefaultModule().document(documentId);
            if (document == null) {
                return null;
            }

            ModulePartNode modulePartNode = document.syntaxTree().rootNode();
            TextRange range = TextRange.from(location.textRange().startOffset(), location.textRange().length());
            NonTerminalNode foundNode = modulePartNode.findNode(range);
            while (foundNode != null && !(foundNode instanceof ListenerDeclarationNode)) {
                foundNode = foundNode.parent();
            }
            if (foundNode == null) {
                return null;
            }

            ListenerDeclarationNode listenerNode = (ListenerDeclarationNode) foundNode;
            return extractConfigFromPostgresqlListenerDeclaration(listenerNode);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private Map<String, Value> extractConfigFromPostgresqlListenerDeclaration(ListenerDeclarationNode listenerNode) {
        Map<String, Value> config = new LinkedHashMap<>();

        Node initializer = listenerNode.initializer();
        NewExpressionNode newExpressionNode;
        if (initializer instanceof CheckExpressionNode checkExpressionNode) {
            if (!(checkExpressionNode.expression() instanceof NewExpressionNode newExpr)) {
                LOGGER.severe("Unexpected expression type inside CheckExpressionNode: "
                        + checkExpressionNode.expression().getClass().getName());
                return config;
            }
            newExpressionNode = newExpr;
        } else if (initializer instanceof NewExpressionNode newExpr) {
            newExpressionNode = newExpr;
        } else {
            LOGGER.severe("Unexpected initializer type in PostgreSQL listener declaration: "
                    + initializer.getClass().getName());
            return config;
        }

        SeparatedNodeList<FunctionArgumentNode> arguments = getArgList(newExpressionNode);
        if (arguments == null) {
            return config;
        }

        for (FunctionArgumentNode argument : arguments) {
            if (!(argument instanceof NamedArgumentNode namedArg)) {
                continue;
            }
            String argName = namedArg.argumentName().name().text().trim();

            switch (argName) {
                case "database" -> extractDatabaseConfigFields(namedArg, config);
                case "options" -> config.put(KEY_OPTIONS,
                        ListenerUtil.buildReadOnlyTextValue("Options",
                                "Additional options for the CDC engine",
                                namedArg.expression().toSourceCode().trim()));
                default -> {
                }
            }
        }

        return config;
    }

    private void extractDatabaseConfigFields(NamedArgumentNode databaseArg, Map<String, Value> config) {
        if (!(databaseArg.expression() instanceof MappingConstructorExpressionNode mapping)) {
            return;
        }

        for (MappingFieldNode fieldNode : mapping.fields()) {
            if (!(fieldNode instanceof SpecificFieldNode field)) {
                continue;
            }
            String fieldName = field.fieldName().toSourceCode().trim();
            String fieldValue = field.valueExpr()
                    .map(expr -> expr.toSourceCode().trim()).orElse("");

            switch (fieldName) {
                case "hostname" -> config.put(KEY_HOST,
                        ListenerUtil.buildReadOnlyTextValue("Host",
                                "The hostname of the PostgreSQL Server", fieldValue));
                case "port" -> config.put(KEY_PORT,
                        ListenerUtil.buildReadOnlyNumberValue("Port",
                                "The port number of the PostgreSQL Server", fieldValue));
                case "username" -> config.put(KEY_USERNAME,
                        ListenerUtil.buildReadOnlyTextValue("Username",
                                "The username for the PostgreSQL Server connection", fieldValue));
                case "password" -> config.put(KEY_PASSWORD,
                        ListenerUtil.buildReadOnlyTextValue("Password",
                                "The password for the PostgreSQL Server connection", fieldValue));
                case "databaseName" -> config.put(KEY_DATABASE,
                        ListenerUtil.buildReadOnlyTextValue("Database",
                                "The PostgreSQL database name to capture changes from", fieldValue));
                case "includedSchemas" -> {
                    List<String> items = extractListValues(field);
                    config.put(KEY_SCHEMAS,
                            ListenerUtil.buildReadOnlyTextSetValue("Schemas",
                                    "A list of regular expressions that match names of schemas to capture changes from",
                                    items));
                }
                case "secure" -> config.put(KEY_SECURE_SOCKET,
                        ListenerUtil.buildReadOnlyTextValue("Secure Socket",
                                "SSL/TLS configuration for secure connection",
                                field.valueExpr().map(expr -> expr.toSourceCode().trim()).orElse("")));
                default -> {
                }
            }
        }
    }

    private List<String> extractListValues(SpecificFieldNode field) {
        List<String> values = new ArrayList<>();
        Optional<ExpressionNode> valueExpr = field.valueExpr();
        if (valueExpr.isPresent() && valueExpr.get() instanceof ListConstructorExpressionNode listNode) {
            for (Node node : listNode.expressions()) {
                if (node instanceof ExpressionNode expr) {
                    String val = expr.toSourceCode().trim();
                    if (val.startsWith("\"") && val.endsWith("\"")) {
                        val = val.substring(1, val.length() - 1);
                    }
                    if (!val.isEmpty()) {
                        values.add(val);
                    }
                }
            }
        }
        return values;
    }
}
