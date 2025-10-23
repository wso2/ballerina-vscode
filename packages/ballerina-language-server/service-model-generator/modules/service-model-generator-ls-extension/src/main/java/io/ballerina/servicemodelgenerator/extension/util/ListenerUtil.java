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
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
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
import static io.ballerina.servicemodelgenerator.extension.util.Constants.RABBITMQ;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.RABBITMQ_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SF;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SF_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.TCP;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.TCP_DEFAULT_LISTENER_EXPR;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.TRIGGER_GITHUB;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_EXPRESSION;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.PROP_KEY_VARIABLE_NAME;
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

    public record DefaultListener(String moduleName, String variableName, LinePosition linePosition) {
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
        String stmt =  NEW_LINE + "listener %s:Listener %s = %s;" + NEW_LINE;
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

    public static Listener getListenerModelWithoutParamProps(FunctionData functionData) {
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

        Listener listener = getListenerModelWithoutParamProps(functionData);
        setParameterProperties(functionData, listener.getProperties());
        return Optional.of(listener);
    }

    public static Optional<Listener> getDefaultListenerModel(String org, ListenerDeclarationNode listenerNode) {
        ServiceDatabaseManager dbManager = ServiceDatabaseManager.getInstance();
        Optional<FunctionData> optFunctionResult = dbManager.getListener(org, "http");
        if (optFunctionResult.isEmpty()) {
            return Optional.empty();
        }
        FunctionData functionData = optFunctionResult.get();
        LinkedHashMap<String, ParameterData> parameters = dbManager
                .getFunctionParametersAsMap(functionData.functionId());
        functionData.setParameters(parameters);
        Listener listener = getListenerModelWithoutParamProps(functionData);
        listener.getProperties().put("defaultListener", getHttpDefaultListenerValue());
        Value nameProperty = listener.getVariableNameProperty();
        nameProperty.setValue(listenerNode.variableName().text().trim());
        nameProperty.setCodedata(new Codedata(listenerNode.variableName().lineRange()));
        nameProperty.setEditable(false);
        listener.setCodedata(new Codedata(listenerNode.lineRange()));
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
     * @param node the syntax tree node to process (should be ListenerDeclarationNode or ExplicitNewExpressionNode)
     * @param orgName the organization name for looking up listener metadata
     * @param semanticModel the semantic model for symbol resolution
     * @return {@link ListenerFromSourceResponse} containing the extracted listener model
     * or empty response if processing fails
     */
    public static ListenerFromSourceResponse processListenerNode(NonTerminalNode node, String orgName,
                                                           SemanticModel semanticModel) {
        if (node instanceof ListenerDeclarationNode listenerNode) {
            return processListenerDeclaration(listenerNode, orgName, semanticModel);
        }

        if (node instanceof ExplicitNewExpressionNode newExpressionNode) {
            return processExplicitNewExpression(newExpressionNode, orgName, semanticModel);
        }

        return new ListenerFromSourceResponse();
    }

    /**
     * Processes a listener declaration node to extract listener configuration and properties.
     * This method handles listener variable declarations with their initialization expressions.
     *
     * @param listenerNode the listener declaration syntax node
     * @param orgName the organization name for looking up listener metadata
     * @param semanticModel the semantic model for symbol resolution
     * @return {@link ListenerFromSourceResponse} containing the listener model with all properties set as non-advanced
     */
    private static ListenerFromSourceResponse processListenerDeclaration(ListenerDeclarationNode listenerNode,
                                                                  String orgName, SemanticModel semanticModel) {
        Optional<Listener> listenerModelOpt = ListenerUtil.getListenerFromSource(
                listenerNode, orgName, semanticModel);

        if (listenerModelOpt.isEmpty()) {
            return new ListenerFromSourceResponse();
        }

        Listener listenerModel = listenerModelOpt.get();
        setPropertiesAsNonAdvanced(listenerModel);
        return new ListenerFromSourceResponse(listenerModel);
    }

    /**
     * Processes an explicit new expression node that creates a listener instance.
     * This method extracts listener configuration from constructor calls and removes the variable name property.
     *
     * @param newExpressionNode the explicit new expression syntax node
     * @param orgName the organization name for looking up listener metadata
     * @param semanticModel the semantic model for symbol resolution
     * @return {@link ListenerFromSourceResponse} containing the listener model without variable name property
     */
    private static ListenerFromSourceResponse processExplicitNewExpression(ExplicitNewExpressionNode newExpressionNode,
                                                                    String orgName, SemanticModel semanticModel) {
        Optional<Listener> listenerModelOpt = ListenerUtil.getListenerFromSource(
                newExpressionNode, orgName, semanticModel);

        if (listenerModelOpt.isEmpty()) {
            return new ListenerFromSourceResponse();
        }

        Listener listenerModel = listenerModelOpt.get();
        listenerModel.getProperties().remove(PROP_KEY_VARIABLE_NAME);
        setPropertiesAsNonAdvanced(listenerModel);
        return new ListenerFromSourceResponse(listenerModel);
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

    private static Optional<Listener> getListenerFromSource(ListenerDeclarationNode listenerNode,
                                                           String org, SemanticModel semanticModel) {
        if (isHttpDefaultListener(listenerNode)) {
            return getDefaultListenerModel(org, listenerNode);
        }

        Optional<TypeSymbol> typeSymbol = extractTypeSymbol(semanticModel, listenerNode.typeDescriptor().get());
        if (typeSymbol.isEmpty()) {
            return Optional.empty();
        }

        Optional<Listener> baseListener = createBaseListener(org, typeSymbol.get());
        if (baseListener.isEmpty()) {
            return Optional.empty();
        }

        Listener listener = baseListener.get();
        configureListenerFromDeclaration(listener, listenerNode, typeSymbol.get());

        return Optional.of(listener);
    }

    public static Optional<Listener> getListenerFromSource(ExplicitNewExpressionNode newExpressionNode,
                                                           String org, SemanticModel semanticModel) {
        Optional<TypeSymbol> typeSymbol = extractTypeSymbol(semanticModel, newExpressionNode.typeDescriptor());
        if (typeSymbol.isEmpty()) {
            return Optional.empty();
        }

        Optional<Listener> baseListener = createBaseListener(org, typeSymbol.get());
        if (baseListener.isEmpty()) {
            return Optional.empty();
        }

        Listener listener = baseListener.get();
        configureListenerFromNewExpression(listener, newExpressionNode, typeSymbol.get());

        return Optional.of(listener);
    }

    private static Optional<TypeSymbol> extractTypeSymbol(SemanticModel semanticModel, Node typeNode) {
        Optional<Symbol> symbol = semanticModel.symbol(typeNode);
        if (symbol.isEmpty() || !(symbol.get() instanceof TypeSymbol typeSymbol) || typeSymbol.getModule().isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(typeSymbol);
    }

    private static Optional<Listener> createBaseListener(String org, TypeSymbol typeSymbol) {
        String moduleName = typeSymbol.getModule().get().id().moduleName();
        ServiceDatabaseManager dbManager = ServiceDatabaseManager.getInstance();
        Optional<FunctionData> optFunctionResult = dbManager.getListener(org, moduleName);

        if (optFunctionResult.isEmpty()) {
            return Optional.empty();
        }

        FunctionData functionData = optFunctionResult.get();
        LinkedHashMap<String, ParameterData> parameters = dbManager
                .getFunctionParametersAsMap(functionData.functionId());
        functionData.setParameters(parameters);

        return Optional.of(getListenerModelWithoutParamProps(functionData));
    }

    private static void configureListenerFromDeclaration(Listener listener,
                                                         ListenerDeclarationNode listenerDeclarationNode,
                                                         TypeSymbol typeSymbol) {
        Value nameProperty = listener.getVariableNameProperty();
        nameProperty.setValue(listenerDeclarationNode.variableName().text().trim());
        nameProperty.setCodedata(new Codedata(listenerDeclarationNode.variableName().lineRange()));
        nameProperty.setEditable(false);
        listener.setCodedata(new Codedata(listenerDeclarationNode.lineRange()));

        Node initializer = listenerDeclarationNode.initializer();
        if (initializer instanceof NewExpressionNode newExpressionNode) {
            analyzeListenerArguments(listener, typeSymbol, newExpressionNode);
        }
    }

    private static void configureListenerFromNewExpression(Listener listener,
                                                           ExplicitNewExpressionNode newExpressionNode,
                                                           TypeSymbol typeSymbol) {
        listener.setCodedata(new Codedata(newExpressionNode.lineRange()));
        analyzeListenerArguments(listener, typeSymbol, newExpressionNode);
    }

    private static void analyzeListenerArguments(Listener listener, TypeSymbol typeSymbol,
                                                 NewExpressionNode newExpressionNode) {
        TypeSymbol rawType = CommonUtils.getRawType(typeSymbol);
        if (rawType instanceof ClassSymbol classSymbol && classSymbol.initMethod().isPresent()) {
            SeparatedNodeList<FunctionArgumentNode> arguments = getArgList(newExpressionNode);

            // Get function data from listener properties (assuming it's stored in metadata)
            ServiceDatabaseManager dbManager = ServiceDatabaseManager.getInstance();
            String moduleName = typeSymbol.getModule().get().id().moduleName();
            Optional<FunctionData> optFunctionData = dbManager.getListener(listener.getOrgName(), moduleName);

            if (optFunctionData.isPresent()) {
                FunctionData functionData = optFunctionData.get();
                LinkedHashMap<String, ParameterData> parameters = dbManager
                        .getFunctionParametersAsMap(functionData.functionId());
                functionData.setParameters(parameters);

                ListenerDeclAnalyzer analyzer = new ListenerDeclAnalyzer(listener.getProperties());
                analyzer.analyze(arguments, classSymbol.initMethod().get(), functionData);
            }
        }
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
}
