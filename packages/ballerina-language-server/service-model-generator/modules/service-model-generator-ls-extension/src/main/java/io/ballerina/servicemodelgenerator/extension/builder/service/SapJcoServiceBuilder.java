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

import com.google.gson.Gson;
import com.google.gson.stream.JsonReader;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.FunctionArgumentNode;
import io.ballerina.compiler.syntax.tree.ListenerDeclarationNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingFieldNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.PositionalArgumentNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.projects.Document;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Project;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.PropertyType;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.util.ListenerUtil;
import io.ballerina.servicemodelgenerator.extension.util.Utils;
import io.ballerina.tools.diagnostics.Location;
import io.ballerina.tools.text.TextRange;
import org.ballerinalang.formatter.core.FormatterException;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Logger;

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_EXISTING_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_CONFIG_FIELD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.ListenerUtil.getArgList;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getProtocol;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.applyEnabledChoiceProperty;

/**
 * Builder class for SAP JCo listener service.
 * Supports "Create new" and "Use existing" listener selection with two service types:
 * IDocService and RfcService.
 *
 * @since 1.7.0
 */
public class SapJcoServiceBuilder extends AbstractServiceBuilder {

    private static final Logger LOGGER = Logger.getLogger(SapJcoServiceBuilder.class.getName());

    private static final String SAP_JCO_SERVICE_MODEL_LOCATION = "services/sap_jco.json";
    private static final String KEY_CONFIGURE_LISTENER = "configureListener";
    private static final String KEY_LISTENER_CONFIG = "listenerConfig";
    private static final String KEY_REPO_DESTINATION = "repositoryDestination";
    private static final String KEY_REPO_DEST_ID = "repoDestId";
    private static final String DISPLAY_LABEL = "SAP JCo";

    // DestinationConfig field names
    private static final String FIELD_ASHOST = "ashost";
    private static final String FIELD_SYSNR = "sysnr";
    private static final String FIELD_JCO_CLIENT = "jcoClient";
    private static final String FIELD_USER = "user";
    private static final String FIELD_PASSWD = "passwd";

    @Override
    public String kind() {
        return "sap.jco";
    }

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        InputStream resourceStream = SapJcoServiceBuilder.class.getClassLoader()
                .getResourceAsStream(SAP_JCO_SERVICE_MODEL_LOCATION);
        if (resourceStream == null) {
            return null;
        }

        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            ServiceInitModel serviceInitModel = new Gson().fromJson(reader, ServiceInitModel.class);
            Map<String, Value> properties = serviceInitModel.getProperties();

            // Navigate to listenerVarName inside the "Create new" choice's listenerConfig
            Value configureListener = properties.get(KEY_CONFIGURE_LISTENER);
            Value createNewChoice = configureListener.getChoices().getFirst();
            Value listenerConfig = createNewChoice.getProperties().get(KEY_LISTENER_CONFIG);
            Value listenerVarNameProp = listenerConfig.getProperties().get(KEY_LISTENER_VAR_NAME);

            String listenerVarName = Utils.generateVariableIdentifier(
                    context.semanticModel(), context.document(),
                    context.document().syntaxTree().rootNode().lineRange().endLine(),
                    LISTENER_VAR_NAME.formatted(getProtocol(context.moduleName())));
            listenerVarNameProp.setValue(listenerVarName);

            // Check for existing compatible listeners
            Set<String> compatibleListeners = ListenerUtil.getCompatibleListeners(
                    context.moduleName(), context.semanticModel(), context.project());

            if (compatibleListeners.isEmpty()) {
                return serviceInitModel;
            }

            // Enable the "Use existing" choice
            Value existingChoice = configureListener.getChoices().get(1);
            existingChoice.setMetadata(new MetaData("Use existing",
                    "Select an existing " + DISPLAY_LABEL + " listener"));
            existingChoice.setEnabled(true);
            existingChoice.setEditable(true);

            // Build a SINGLE_SELECT dropdown with per-listener config groups
            List<String> listenerNames = new ArrayList<>(compatibleListeners);
            Map<String, Value> perListenerConfigs = new LinkedHashMap<>();
            for (String name : listenerNames) {
                Map<String, Value> config = extractSapJcoListenerConfig(name, context.semanticModel(),
                        context.project());
                Value configGroup = new Value.ValueBuilder()
                        .metadata(name, DISPLAY_LABEL + " listener: " + name)
                        .value(name)
                        .types(List.of(PropertyType.types(Value.FieldType.FORM)))
                        .enabled(true)
                        .editable(false)
                        .setProperties(config)
                        .build();
                perListenerConfigs.put(name, configGroup);
            }

            Value listenerDropdown = new Value.ValueBuilder()
                    .metadata("Listener Name", "Select an existing " + DISPLAY_LABEL + " listener")
                    .value(listenerNames.getFirst())
                    .types(List.of(PropertyType.types(Value.FieldType.SINGLE_SELECT)))
                    .enabled(true)
                    .editable(true)
                    .setItems(new ArrayList<>(listenerNames))
                    .setProperties(perListenerConfigs)
                    .build();

            Map<String, Value> existingProps = new LinkedHashMap<>();
            existingProps.put(KEY_EXISTING_LISTENER, listenerDropdown);
            existingChoice.getProperties().get(KEY_LISTENER_CONFIG).setProperties(existingProps);

            // Default to "Use existing"
            configureListener.setValue("1");
            createNewChoice.setEnabled(false);

            return serviceInitModel;
        } catch (IOException e) {
            LOGGER.warning("Failed to load SAP JCo service init model: " + e.getMessage());
            return null;
        }
    }

    @Override
    public Map<String, List<TextEdit>> addServiceInitSource(AddServiceInitModelContext context)
            throws WorkspaceDocumentException, FormatterException, IOException, EventSyncException,
            io.ballerina.openapi.core.generators.common.exception.BallerinaOpenApiException {
        ServiceInitModel serviceInitModel = context.serviceInitModel();

        // 1. Flatten the selected configureListener choice into the top-level properties map
        applyEnabledChoiceProperty(serviceInitModel, KEY_CONFIGURE_LISTENER);
        Map<String, Value> properties = serviceInitModel.getProperties();

        // 2. Unwrap GROUP_SECTION wrappers (e.g. listenerConfig) into the flat map
        unwrapGroupSections(properties);

        // 3. Determine whether an existing listener was selected
        boolean useExisting = ListenerUtil.shouldUseExistingListener(properties);
        Optional<String> existingListenerName = ListenerUtil.getExistingListenerName(properties);
        properties.remove(KEY_EXISTING_LISTENER);

        ListenerDTO listenerDTO;
        if (useExisting && existingListenerName.isPresent()) {
            String listenerProtocol = getProtocol(serviceInitModel.getModuleName());
            listenerDTO = new ListenerDTO(listenerProtocol, existingListenerName.get(), "");
        } else {
            // Build the repositoryDestination value from its CHOICE and inject it
            applyRepositoryDestinationProperty(properties);

            // Remove serverName if it was left blank (optional field)
            Value serverNameProp = properties.get("serverName");
            if (serverNameProp != null && (serverNameProp.getValue() == null
                    || serverNameProp.getValue().isBlank())) {
                properties.remove("serverName");
            }

            listenerDTO = buildListenerDTO(context);
        }

        return getServiceDeclarationEdits(context, listenerDTO);
    }

    /**
     * Processes the repositoryDestination CHOICE property.
     * Replaces it with a flat LISTENER_PARAM_CONFIG_FIELD Value whose value string is either:
     *   - a quoted string  e.g.  "\"MY_SAP_DEST\""   (Destination ID choice), or
     *   - a record literal e.g.  "{ashost: \"sap\", sysnr: \"00\", ...}" (SAP Credentials choice).
     */
    private void applyRepositoryDestinationProperty(Map<String, Value> properties) {
        Value repoDestChoice = properties.get(KEY_REPO_DESTINATION);
        if (repoDestChoice == null || repoDestChoice.getChoices() == null
                || repoDestChoice.getChoices().isEmpty()) {
            return;
        }

        Value selectedChoice = repoDestChoice.getChoices().stream()
                .filter(Value::isEnabled)
                .findFirst()
                .orElse(repoDestChoice.getChoices().getFirst());

        Map<String, Value> choiceProps = selectedChoice.getProperties();
        String builtValue;

        if (choiceProps != null && choiceProps.containsKey(KEY_REPO_DEST_ID)) {
            // "Destination ID" branch — the value is a plain Ballerina string literal
            Value destIdValue = choiceProps.get(KEY_REPO_DEST_ID);
            builtValue = destIdValue != null && destIdValue.getValue() != null
                    ? destIdValue.getValue() : "\"\"";
        } else {
            // "SAP Credentials" branch — build a DestinationConfig record literal
            builtValue = buildDestinationConfigRecord(choiceProps);
        }

        Value injected = new Value.ValueBuilder()
                .value(builtValue)
                .types(List.of(PropertyType.types(Value.FieldType.EXPRESSION)))
                .enabled(true)
                .editable(false)
                .setCodedata(new Codedata(null, ARG_TYPE_LISTENER_PARAM_CONFIG_FIELD))
                .build();
        properties.put(KEY_REPO_DESTINATION, injected);
    }

    private String buildDestinationConfigRecord(Map<String, Value> credProps) {
        if (credProps == null) {
            return "{}";
        }
        List<String> fields = new ArrayList<>();
        for (String fieldName : List.of(FIELD_ASHOST, FIELD_SYSNR, FIELD_JCO_CLIENT, FIELD_USER, FIELD_PASSWD)) {
            Value fieldValue = credProps.get(fieldName);
            if (fieldValue != null && fieldValue.getValue() != null && !fieldValue.getValue().isBlank()) {
                fields.add(fieldName + ": " + fieldValue.getValue());
            }
        }
        return "{" + String.join(", ", fields) + "}";
    }

    /**
     * Extracts read-only listener config properties from an existing SAP JCo listener declaration.
     * Reads gwhost, gwserv, and progid from the first positional argument record.
     */
    private Map<String, Value> extractSapJcoListenerConfig(
            String listenerName, SemanticModel semanticModel, Project project) {
        Map<String, Value> config = new LinkedHashMap<>();

        Optional<VariableSymbol> listenerSymbol = Optional.empty();
        for (Symbol moduleSymbol : semanticModel.moduleSymbols()) {
            if (!(moduleSymbol instanceof VariableSymbol variableSymbol)
                    || !variableSymbol.qualifiers().contains(Qualifier.LISTENER)) {
                continue;
            }
            if (variableSymbol.getName().isPresent()
                    && variableSymbol.getName().get().equals(listenerName)) {
                listenerSymbol = Optional.of(variableSymbol);
                break;
            }
        }
        if (listenerSymbol.isEmpty() || listenerSymbol.get().getLocation().isEmpty()) {
            return config;
        }

        Location location = listenerSymbol.get().getLocation().get();
        try {
            Path path = project.sourceRoot().resolve(location.lineRange().fileName());
            DocumentId documentId = project.documentId(path);
            Document document = project.currentPackage().getDefaultModule().document(documentId);
            if (document == null) {
                return config;
            }

            ModulePartNode modulePartNode = document.syntaxTree().rootNode();
            TextRange range = TextRange.from(
                    location.textRange().startOffset(), location.textRange().length());
            NonTerminalNode foundNode = modulePartNode.findNode(range);
            while (foundNode != null && !(foundNode instanceof ListenerDeclarationNode)) {
                foundNode = foundNode.parent();
            }
            if (foundNode == null) {
                return config;
            }

            ListenerDeclarationNode listenerNode = (ListenerDeclarationNode) foundNode;
            io.ballerina.compiler.syntax.tree.NewExpressionNode newExpressionNode = null;
            Node initializer = listenerNode.initializer();
            if (initializer instanceof io.ballerina.compiler.syntax.tree.CheckExpressionNode checkExpr) {
                if (checkExpr.expression()
                        instanceof io.ballerina.compiler.syntax.tree.NewExpressionNode newExpr) {
                    newExpressionNode = newExpr;
                }
            } else if (initializer instanceof io.ballerina.compiler.syntax.tree.NewExpressionNode newExpr) {
                newExpressionNode = newExpr;
            }
            if (newExpressionNode == null) {
                return config;
            }

            SeparatedNodeList<FunctionArgumentNode> arguments = getArgList(newExpressionNode);
            if (arguments == null) {
                return config;
            }

            // The first positional argument is the ServerConfig record
            for (FunctionArgumentNode argument : arguments) {
                if (argument instanceof PositionalArgumentNode positionalArg) {
                    if (positionalArg.expression() instanceof MappingConstructorExpressionNode mapping) {
                        for (MappingFieldNode fieldNode : mapping.fields()) {
                            if (!(fieldNode instanceof SpecificFieldNode field)) {
                                continue;
                            }
                            String fieldName = field.fieldName().toSourceCode().trim();
                            String fieldValue = field.valueExpr()
                                    .map(expr -> expr.toSourceCode().trim()).orElse("");
                            switch (fieldName) {
                                case "gwhost" -> config.put("gwhost",
                                        ListenerUtil.buildReadOnlyTextValue("Gateway Host",
                                                "SAP gateway host", fieldValue));
                                case "gwserv" -> config.put("gwserv",
                                        ListenerUtil.buildReadOnlyTextValue("Gateway Service",
                                                "SAP gateway service", fieldValue));
                                case "progid" -> config.put("progid",
                                        ListenerUtil.buildReadOnlyTextValue("Program ID",
                                                "Program ID registered in SAP", fieldValue));
                                default -> { }
                            }
                        }
                    }
                    break;
                }
            }
        } catch (RuntimeException e) {
            LOGGER.warning("Failed to extract SAP JCo listener config for '" + listenerName
                    + "': " + e.getMessage());
        }

        return config;
    }
}
