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

package io.ballerina.servicemodelgenerator.extension.util;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.MethodSymbol;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.CheckExpressionNode;
import io.ballerina.compiler.syntax.tree.ExplicitNewExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionArgumentNode;
import io.ballerina.compiler.syntax.tree.ImplicitNewExpressionNode;
import io.ballerina.compiler.syntax.tree.ImportDeclarationNode;
import io.ballerina.compiler.syntax.tree.ListenerDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NewExpressionNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NodeFactory;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.ParenthesizedArgList;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.FunctionDataBuilder;
import io.ballerina.modelgenerator.commons.ParameterData;
import io.ballerina.modelgenerator.commons.ServiceDatabaseManager;
import io.ballerina.projects.Document;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Project;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Listener;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddModelContext;
import io.ballerina.servicemodelgenerator.extension.model.response.ListenerFromSourceResponse;
import io.ballerina.tools.diagnostics.Location;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.tools.text.LineRange;
import io.ballerina.tools.text.TextRange;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.ASB;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ASB_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.DEFAULT_LISTENER_ITEM_LABEL;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.DEFAULT_LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.FILE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.FILE_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.FTP;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.FTP_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GITHUB_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.HTTP;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.HTTP_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.HTTP_DEFAULT_LISTENER_ITEM_LABEL;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KAFKA;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KAFKA_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.MQTT;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.MQTT_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.NEW_LINE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.PROP_KEY_DEFAULT_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.PROP_KEY_VARIABLE_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.RABBITMQ;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.RABBITMQ_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SF;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SF_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.TCP;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.TCP_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.TRIGGER_GITHUB;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_EXPRESSION;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.removeLeadingSingleQuote;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.upperCaseFirstLetter;

/**
 * Util class for Listener related operations.
 *
 * @since 1.0.0
 */
public class ListenerUtil {

    public static Set<String> getCompatibleListeners(String moduleName, SemanticModel semanticModel, Project project) {
        Set<String> listeners = new LinkedHashSet<>();
        boolean isHttpDefaultListenerDefined = false;
        boolean isHttp = HTTP.equals(moduleName);
        boolean isKafka = KAFKA.equals(moduleName);

        for (Symbol moduleSymbol : semanticModel.moduleSymbols()) {
            if (!(moduleSymbol instanceof VariableSymbol variableSymbol)
                    || !variableSymbol.qualifiers().contains(Qualifier.LISTENER)) {
                continue;
            }
            Optional<ModuleSymbol> module = variableSymbol.typeDescriptor().getModule();
            if (module.isEmpty() || !module.get().id().moduleName().equals(moduleName) ||
                    variableSymbol.getName().isEmpty()) {
                continue;
            }
            if (isKafka && semanticModel.references(variableSymbol).size() > 1) {
                continue;
            }
            String listenerName = variableSymbol.getName().get();
            if (isHttp) {
                if (variableSymbol.getLocation().isPresent()) {
                    Location location = variableSymbol.getLocation().get();
                    Path path = project.sourceRoot().resolve(location.lineRange().fileName());
                    DocumentId documentId = project.documentId(path);
                    Document document = project.currentPackage().getDefaultModule().document(documentId);
                    if (!isHttpDefaultListenerDefined && document != null) {
                        ModulePartNode node = document.syntaxTree().rootNode();
                        TextRange range = TextRange.from(location.textRange().startOffset(),
                                location.textRange().length());
                        NonTerminalNode foundNode = node.findNode(range);
                        if (foundNode != null) {
                            while (foundNode != null && !(foundNode instanceof ListenerDeclarationNode)) {
                                foundNode = foundNode.parent();
                            }
                            if (foundNode != null) {
                                ListenerDeclarationNode listenerDeclarationNode = (ListenerDeclarationNode) foundNode;
                                isHttpDefaultListenerDefined = listenerDeclarationNode.initializer().toSourceCode()
                                        .trim().contains("http:getDefaultListener()");
                            }
                        }
                    }
                }
            }
            listeners.add(listenerName);
        }

        if (isHttp && !isHttpDefaultListenerDefined) {
            listeners.add(HTTP_DEFAULT_LISTENER_ITEM_LABEL);
        }

        if (moduleName.equals("graphql")) {
            listeners.add(DEFAULT_LISTENER_ITEM_LABEL.formatted(moduleName(moduleName)));
        }

        return listeners;
    }

    public static Optional<String> getHttpDefaultListenerNameRef(SemanticModel semanticModel, Project project) {
        for (Symbol moduleSymbol : semanticModel.moduleSymbols()) {
            if (!(moduleSymbol instanceof VariableSymbol variableSymbol)
                    || !variableSymbol.qualifiers().contains(Qualifier.LISTENER)) {
                continue;
            }
            Optional<ModuleSymbol> module = variableSymbol.typeDescriptor().getModule();
            if (module.isEmpty() || !module.get().id().moduleName().equals(HTTP) ||
                    variableSymbol.getName().isEmpty()) {
                continue;
            }
            String listenerName = variableSymbol.getName().get().trim();
            if (variableSymbol.getLocation().isPresent()) {
                Location location = variableSymbol.getLocation().get();
                Path path = project.sourceRoot().resolve(location.lineRange().fileName());
                DocumentId documentId = project.documentId(path);
                Document document = project.currentPackage().getDefaultModule().document(documentId);
                if (document != null) {
                    ModulePartNode node = document.syntaxTree().rootNode();
                    TextRange range = TextRange.from(location.textRange().startOffset(),
                            location.textRange().length());
                    NonTerminalNode foundNode = node.findNode(range);
                    if (foundNode != null) {
                        while (foundNode != null && !(foundNode instanceof ListenerDeclarationNode)) {
                            foundNode = foundNode.parent();
                        }
                        if (foundNode != null) {
                            ListenerDeclarationNode listenerDeclarationNode = (ListenerDeclarationNode) foundNode;
                            boolean found = listenerDeclarationNode.initializer().toSourceCode()
                                    .trim().contains("http:getDefaultListener()");
                            if (found) {
                                return Optional.of(listenerName);
                            }
                        }
                    }
                }
            }
        }

        return Optional.empty();
    }

    public static DefaultListener getDefaultListener(AddModelContext context) {
        Document document = context.document();
        ModulePartNode node = document.syntaxTree().rootNode();
        return getDefaultListener(context.service().getListener(), context.semanticModel(),
                document, node, context.service().getModuleName());
    }

    public static DefaultListener getDefaultListener(Value listener, SemanticModel semanticModel,
                                                     Document document, ModulePartNode node, String moduleName) {
        if (Objects.nonNull(listener) && listener.isEnabledWithValue()) {
            List<String> values = listener.getValues();
            if (Objects.nonNull(values) && !values.isEmpty()) {
                List<Object> valuesList = new ArrayList<>() {{
                    addAll(values);
                }};
                for (int i = 0; i < values.size(); i++) {
                    String selection = values.get(i);
                    if (selection.equals(HTTP_DEFAULT_LISTENER_ITEM_LABEL) ||
                            selection.equals(DEFAULT_LISTENER_ITEM_LABEL.formatted(moduleName(moduleName)))) {
                        DefaultListener defaultListener = defaultListener(semanticModel, document, node,
                                moduleName);
                        valuesList.set(i, defaultListener.variableName());
                        listener.setValues(valuesList);
                        return defaultListener;
                    }
                }
            } else {
                String selection = listener.getValue();
                if (selection.equals(HTTP_DEFAULT_LISTENER_ITEM_LABEL) ||
                        selection.equals(DEFAULT_LISTENER_ITEM_LABEL.formatted(moduleName(moduleName)))) {
                    DefaultListener defaultListener = defaultListener(semanticModel, document, node, moduleName);
                    listener.setValue(defaultListener.variableName());
                    return defaultListener;
                }
            }
        }
        return null;
    }

    public static DefaultListener defaultListener(SemanticModel semanticModel, Document document,
                                                  ModulePartNode node, String moduleName) {
        List<ImportDeclarationNode> importsList = node.imports().stream().toList();
        LinePosition linePosition = importsList.isEmpty() ? node.lineRange().endLine() :
                importsList.getLast().lineRange().endLine();
        String variableName = Utils.generateVariableIdentifier(semanticModel, document, linePosition,
                DEFAULT_LISTENER_VAR_NAME.formatted(moduleName(moduleName)));
        return new DefaultListener(moduleName, variableName, linePosition);
    }

    public static String getDefaultListenerDeclarationStmt(DefaultListener defaultListener) {
        String stmt = NEW_LINE + "listener %s:Listener %s = %s;" + NEW_LINE;
        String expression = switch (defaultListener.moduleName()) {
            case HTTP -> HTTP_DEFAULT_LISTENER_EXPR;
            case GRAPHQL -> GRAPHQL_DEFAULT_LISTENER_EXPR;
            case TCP -> TCP_DEFAULT_LISTENER_EXPR;
            case KAFKA -> KAFKA_DEFAULT_LISTENER_EXPR;
            case RABBITMQ -> RABBITMQ_DEFAULT_LISTENER_EXPR;
            case MQTT -> MQTT_DEFAULT_LISTENER_EXPR;
            case ASB -> ASB_DEFAULT_LISTENER_EXPR;
            case SF -> SF_DEFAULT_LISTENER_EXPR;
            case TRIGGER_GITHUB -> GITHUB_DEFAULT_LISTENER_EXPR;
            case FTP -> FTP_DEFAULT_LISTENER_EXPR;
            case FILE -> FILE_DEFAULT_LISTENER_EXPR;
            default -> "";
        };
        return stmt.formatted(moduleName(defaultListener.moduleName()), defaultListener.variableName(), expression);
    }

    private static String moduleName(String moduleName) {
        String[] parts = moduleName.split("\\.");
        if (parts.length > 1) {
            return parts[parts.length - 1];
        }
        return moduleName;
    }

    /**
     * Creates a base listener model from function metadata without parameter-specific properties.
     * This method constructs a listener model with core metadata (name, type, description, etc.)
     *
     * @param functionData the function metadata containing listener configuration details
     * @return a {@link Listener} instance with basic metadata and variable name property only
     */
    public static Listener createBaseListenerModel(FunctionData functionData) {
        Map<String, Value> properties = new LinkedHashMap<>();
        String formattedModuleName = upperCaseFirstLetter(functionData.packageName());
        String icon = CommonUtils.generateIcon(functionData.org(), functionData.packageName(),
                functionData.version());

        Listener.ListenerBuilder listenerBuilder = new Listener.ListenerBuilder();
        listenerBuilder
                .setId(functionData.packageId())
                .setName(formattedModuleName + " Listener")
                .setType(functionData.packageName())
                .setDisplayName(formattedModuleName)
                .setDescription(functionData.description())
                .setListenerProtocol(getListenerProtocol(functionData.packageName()))
                .setModuleName(functionData.packageName())
                .setOrgName(functionData.org())
                .setPackageName(functionData.packageName())
                .setVersion(functionData.version())
                .setIcon(icon)
                .setProperties(properties);

        properties.put(PROP_KEY_VARIABLE_NAME, nameProperty());
        return listenerBuilder.build();
    }

    private static String getListenerProtocol(String packageName) {
        String pkgName = packageName.toLowerCase(Locale.ROOT);
        String[] split = pkgName.split("\\.");
        return split[split.length - 1];
    }

    public static Optional<Listener> getListenerModelByName(String org, String moduleName) {
        ServiceDatabaseManager dbManager = ServiceDatabaseManager.getInstance();
        Optional<FunctionData> optFunctionResult = dbManager.getListener(org, moduleName);
        if (optFunctionResult.isEmpty()) {
            return Optional.empty();
        }
        FunctionData functionData = optFunctionResult.get();
        LinkedHashMap<String, ParameterData> parameters = dbManager
                .getFunctionParametersAsMap(functionData.functionId());
        functionData.setParameters(parameters);

        Listener listener = createBaseListenerModel(functionData);
        setParameterProperties(functionData, listener.getProperties());
        return Optional.of(listener);
    }

    private static Value getHttpDefaultListenerValue() {
        return new Value.ValueBuilder()
                .metadata("HTTP Default Listener", "The default HTTP listener")
                .valueType(VALUE_TYPE_EXPRESSION)
                .value(HTTP_DEFAULT_LISTENER_EXPR)
                .enabled(true)
                .setImports(new HashMap<>())
                .build();
    }

    private static void setParameterProperties(FunctionData function, Map<String, Value> properties) {
        for (ParameterData paramResult : function.parameters().values()) {
            if (paramResult.kind().equals(ParameterData.Kind.PARAM_FOR_TYPE_INFER)
                    || paramResult.kind().equals(ParameterData.Kind.INCLUDED_RECORD)) {
                continue;
            }

            String unescapedParamName = removeLeadingSingleQuote(paramResult.name());

            Codedata codedata = new Codedata("LISTENER_INIT_PARAM");
            codedata.setOriginalName(paramResult.name());

            Value.ValueBuilder valueBuilder = new Value.ValueBuilder()
                    .setMetadata(new MetaData(unescapedParamName, paramResult.description()))
                    .setCodedata(codedata)
                    .value("")
                    .valueType("EXPRESSION")
                    .setPlaceholder(paramResult.placeholder())
                    .setValueTypeConstraint(paramResult.type().toString())
                    .editable(true)
                    .enabled(true)
                    .optional(paramResult.optional())
                    .setAdvanced(paramResult.optional())
                    .setTypeMembers(paramResult.typeMembers());

            properties.put(unescapedParamName, valueBuilder.build());
        }
    }

    /**
     * Processes a syntax tree node to extract listener information and create a response.
     * This method handles both listener declarations and explicit new expressions that create listeners.
     *
     * @param node          the syntax tree node to process (should be ListenerDeclarationNode or
     *                      ExplicitNewExpressionNode)
     * @param orgName       the organization name for looking up listener metadata
     * @param semanticModel the semantic model for symbol resolution
     * @return {@link ListenerFromSourceResponse} containing the extracted listener model
     * or empty response if processing fails
     */
    public static ListenerFromSourceResponse processListenerNode(NonTerminalNode node, String orgName,
                                                                 SemanticModel semanticModel) {
        Listener listener;
        if (node instanceof ListenerDeclarationNode listenerNode) {
            listener = processListenerDeclaration(listenerNode, orgName, semanticModel);
            if (Objects.isNull(listener)) {
                return new ListenerFromSourceResponse();
            }
            processListenerName(listener, listenerNode);
        } else if (node instanceof ExplicitNewExpressionNode newExpressionNode) {
            listener = processExplicitNewExpression(newExpressionNode, semanticModel);
        } else {
            listener = new Listener.ListenerBuilder().build();
        }

        return new ListenerFromSourceResponse(listener);
    }

    /**
     * Processes a listener declaration node to extract listener configuration and properties.
     * This method handles listener variable declarations with their initialization expressions.
     *
     * @param listenerNode  the listener declaration syntax node
     * @param orgName       the organization name for looking up listener metadata
     * @param semanticModel the semantic model for symbol resolution
     * @return {@link Listener} containing the listener model with all properties set as non-advanced
     */
    private static Listener processListenerDeclaration(ListenerDeclarationNode listenerNode,
                                                       String orgName, SemanticModel semanticModel) {

        if (isHttpDefaultListener(listenerNode)) {
            return createHttpDefaultListenerModel(orgName, listenerNode).get();
        }

        Optional<Symbol> symbol = semanticModel.symbol(listenerNode.typeDescriptor().orElse(null));
        if (symbol.isEmpty() || !(symbol.get() instanceof TypeSymbol typeSymbol)
                || !(CommonUtils.getRawType(typeSymbol) instanceof ClassSymbol classSymbol)) {
            return null;
        }

        Node initializer = listenerNode.initializer();
        NewExpressionNode newExpressionNode;
        if (initializer instanceof CheckExpressionNode checkExpressionNode) {
            newExpressionNode = (NewExpressionNode) checkExpressionNode.expression();
        } else {
            newExpressionNode = (NewExpressionNode) initializer;
        }

        return createListenerModelFromNewExpressionNode(listenerNode.lineRange(), newExpressionNode, semanticModel,
                classSymbol);
    }

    private static void processListenerName(Listener listener, ListenerDeclarationNode listenerDeclarationNode) {
        Value nameProperty = listener.getVariableNameProperty();
        nameProperty.setValue(listenerDeclarationNode.variableName().text().trim());
        nameProperty.setCodedata(new Codedata(listenerDeclarationNode.variableName().lineRange()));
        nameProperty.setEditable(false);
    }

    /**
     * Creates a default HTTP listener model from a listener declaration node that uses the default HTTP listener.
     * This method builds a listener model specifically for HTTP default listeners (http:getDefaultListener())
     *
     * @param org          the organization name used to look up the HTTP listener metadata from the database
     * @param listenerNode the listener declaration node containing the default HTTP listener initialization
     */
    private static Optional<Listener> createHttpDefaultListenerModel(String org, ListenerDeclarationNode listenerNode) {
        Optional<FunctionData> optionalFunctionData = ServiceDatabaseManager.getInstance().getListener(org, HTTP);
        if (optionalFunctionData.isEmpty()) {
            return Optional.empty();
        }

        FunctionData functionData = optionalFunctionData.get();
        functionData.setParameters(new LinkedHashMap<>());

        Listener listener = createBaseListenerModel(functionData);
        listener.getProperties().put(PROP_KEY_DEFAULT_LISTENER, getHttpDefaultListenerValue());
        listener.setCodedata(new Codedata(listenerNode.lineRange()));

        return Optional.of(listener);
    }

    /**
     * Processes an explicit new expression node that creates a listener instance.
     * This method extracts listener configuration from constructor calls and removes the variable name property.
     *
     * @param newExpressionNode the explicit new expression syntax node
     * @param semanticModel     the semantic model for symbol resolution
     * @return {@link Listener}  the listener model without variable name property
     */
    private static Listener processExplicitNewExpression(ExplicitNewExpressionNode newExpressionNode
            , SemanticModel semanticModel) {
        Optional<Symbol> symbol = semanticModel.symbol(newExpressionNode.typeDescriptor());
        if (symbol.isEmpty() || !(symbol.get() instanceof TypeSymbol typeSymbol)
                || !(CommonUtils.getRawType(typeSymbol) instanceof ClassSymbol classSymbol)) {
            return null;
        }
        Listener listenerModel = createListenerModelFromNewExpressionNode(newExpressionNode.lineRange(),
                newExpressionNode, semanticModel, classSymbol);
        listenerModel.getProperties().remove(PROP_KEY_VARIABLE_NAME);
        return listenerModel;
    }

    /**
     * Creates a listener model from a syntax tree node and class symbol with complete property analysis.
     * This method constructs a comprehensive listener model by analyzing the listener's initialization
     * arguments, setting up all properties, and configuring code metadata for UI representation.
     *
     * @param lineRange         the line range in the source code where the listener is defined
     * @param newExpressionNode the new expression node containing the listener initialization
     * @param semanticModel     the semantic model for symbol resolution and type analysis
     * @param classSymbol       the class symbol representing the listener type
     * @return a fully configured {@link Listener} model with analyzed properties, code metadata,
     * and all properties marked as non-advanced for UI visibility
     */
    private static Listener createListenerModelFromNewExpressionNode(LineRange lineRange,
                                                                     NewExpressionNode newExpressionNode,
                                                                     SemanticModel semanticModel,
                                                                     ClassSymbol classSymbol) {
        FunctionData functionData = buildListenerFunctionData(classSymbol, semanticModel);

        Listener listenerModel = createBaseListenerModel(functionData);
        analyzeAndSetListenerProperties(listenerModel, functionData, newExpressionNode, classSymbol.initMethod().get());

        setPropertiesAsNonAdvanced(listenerModel);
        Codedata codedata = new Codedata.Builder()
                .setLineRange(lineRange)
                .build();
        listenerModel.setCodedata(codedata);

        return listenerModel;
    }

    /**
     * Builds function data from a class symbol's initialization method.
     * This helper method extracts the init method information to create function metadata
     * used for property analysis and listener model construction.
     *
     * @param classSymbol   the class symbol representing the listener type
     * @param semanticModel the semantic model for symbol resolution
     * @return {@link FunctionData} containing the initialization method metadata
     */
    private static FunctionData buildListenerFunctionData(ClassSymbol classSymbol, SemanticModel semanticModel) {
        Optional<MethodSymbol> optMethodSymbol = classSymbol.initMethod();

        FunctionDataBuilder functionDataBuilder = new FunctionDataBuilder()
                .parentSymbol(classSymbol)
                .semanticModel(semanticModel)
                .name("init")
                .functionResultKind(FunctionData.Kind.CLASS_INIT);

        optMethodSymbol.ifPresent(functionDataBuilder::functionSymbol);

        return functionDataBuilder.build();
    }

    /**
     * Analyzes listener initialization arguments and sets corresponding properties.
     * This method extracts argument values from the new expression and maps them to
     * listener properties using the function metadata.
     *
     * @param listener          the listener model to populate with properties
     * @param functionData      the function metadata containing parameter information
     * @param newExpressionNode the new expression containing initialization arguments
     * @param initSymbol        the init method symbol
     */
    private static void analyzeAndSetListenerProperties(Listener listener, FunctionData functionData,
                                                        NewExpressionNode newExpressionNode,
                                                        MethodSymbol initSymbol) {
        SeparatedNodeList<FunctionArgumentNode> arguments = getArgList(newExpressionNode);

        ListenerDeclAnalyzer analyzer = new ListenerDeclAnalyzer(listener.getProperties());
        analyzer.analyze(arguments, initSymbol, functionData);
    }

    /**
     * Sets all properties of a listener model as non-advanced.
     * to make all properties visible and editable in the UI.
     *
     * @param listenerModel the listener model whose properties should be marked as non-advanced
     */
    private static void setPropertiesAsNonAdvanced(Listener listenerModel) {
        listenerModel.getProperties().forEach((k, v) -> v.setAdvanced(false));
    }

    private static SeparatedNodeList<FunctionArgumentNode> getArgList(NewExpressionNode newExpressionNode) {
        if (newExpressionNode instanceof ExplicitNewExpressionNode explicitNewExpressionNode) {
            return explicitNewExpressionNode.parenthesizedArgList().arguments();
        } else {
            Optional<ParenthesizedArgList> parenthesizedArgList = ((ImplicitNewExpressionNode) newExpressionNode)
                    .parenthesizedArgList();
            return parenthesizedArgList.isPresent() ? parenthesizedArgList.get().arguments() :
                    NodeFactory.createSeparatedNodeList();
        }
    }

    public static boolean isHttpDefaultListener(ListenerDeclarationNode listenerNode) {
        return listenerNode.initializer().toSourceCode().trim().contains(HTTP_DEFAULT_LISTENER_EXPR);
    }

    public static Value nameProperty() {

        Value.ValueBuilder valueBuilder = new Value.ValueBuilder();
        valueBuilder
                .setMetadata(new MetaData("Name", "The name of the listener"))
                .setCodedata(new Codedata("LISTENER_VAR_NAME"))
                .value("")
                .valueType("IDENTIFIER")
                .setValueTypeConstraint("Global")
                .editable(true)
                .enabled(true)
                .optional(false)
                .setAdvanced(false);

        return valueBuilder.build();
    }

    public record DefaultListener(String moduleName, String variableName, LinePosition linePosition) {
    }
}
