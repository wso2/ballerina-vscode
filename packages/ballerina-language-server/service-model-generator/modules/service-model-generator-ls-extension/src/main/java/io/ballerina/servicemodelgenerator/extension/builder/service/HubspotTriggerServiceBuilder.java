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
import io.ballerina.compiler.syntax.tree.NamedArgumentNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.PositionalArgumentNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.openapi.core.generators.common.exception.BallerinaOpenApiException;
import io.ballerina.projects.Document;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Project;
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
import static io.ballerina.servicemodelgenerator.extension.util.Constants.LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.ListenerUtil.getArgList;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getProtocol;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.applyEnabledChoiceProperty;

/**
 * Builder class for HubSpot trigger service.
 * Supports "Create new" and "Use existing" listener selection with 7 service types:
 * CompanyService, ContactService, ConversationService, DealService, TicketService,
 * LineItemService, ProductService.
 *
 * @since 1.7.1
 */
public class HubspotTriggerServiceBuilder extends AbstractServiceBuilder {

    private static final Logger LOGGER = Logger.getLogger(HubspotTriggerServiceBuilder.class.getName());

    private static final String HUBSPOT_TRIGGER_SERVICE_MODEL_LOCATION = "services/hubspot_trigger.json";
    private static final String KEY_CONFIGURE_LISTENER = "configureListener";
    private static final String KEY_LISTENER_CONFIG = "listenerConfig";
    private static final String KEY_CLIENT_SECRET = "clientSecret";
    private static final String KEY_CALLBACK_URL = "callbackURL";
    private static final String KEY_LISTEN_ON = "listenOn";
    private static final String DISPLAY_LABEL = "HubSpot";

    @Override
    public String kind() {
        return "trigger.hubspot";
    }

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        InputStream resourceStream = HubspotTriggerServiceBuilder.class.getClassLoader()
                .getResourceAsStream(HUBSPOT_TRIGGER_SERVICE_MODEL_LOCATION);
        if (resourceStream == null) {
            return null;
        }

        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            ServiceInitModel serviceInitModel = new Gson().fromJson(reader, ServiceInitModel.class);
            Map<String, Value> properties = serviceInitModel.getProperties();

            // Navigate into the "Create new" choice's listenerConfig to set unique listener var name
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

            // Enable "Use existing" choice
            Value existingChoice = configureListener.getChoices().get(1);
            existingChoice.setMetadata(new MetaData("Use existing",
                    "Select an existing " + DISPLAY_LABEL + " listener"));
            existingChoice.setEnabled(true);
            existingChoice.setEditable(true);

            // Build per-listener config map
            List<String> listenerNames = new ArrayList<>(compatibleListeners);
            Map<String, Value> perListenerConfigs = new LinkedHashMap<>();
            for (String name : listenerNames) {
                Map<String, Value> config = extractHubspotListenerConfig(name, context.semanticModel(),
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

            // Set "Use existing" as default selection
            configureListener.setValue("1");
            createNewChoice.setEnabled(false);

            return serviceInitModel;
        } catch (IOException e) {
            LOGGER.warning("Failed to load HubSpot trigger service init model: " + e.getMessage());
            return null;
        }
    }

    @Override
    public Map<String, List<TextEdit>> addServiceInitSource(AddServiceInitModelContext context)
            throws WorkspaceDocumentException, FormatterException, IOException, BallerinaOpenApiException,
            EventSyncException {
        ServiceInitModel serviceInitModel = context.serviceInitModel();

        // 1. Collapse the configureListener CHOICE into flat properties
        applyEnabledChoiceProperty(serviceInitModel, KEY_CONFIGURE_LISTENER);
        Map<String, Value> properties = serviceInitModel.getProperties();

        // 2. Unwrap GROUP_SECTION children into the flat properties map
        unwrapGroupSections(properties);

        // 3. Determine if "Use existing" was selected
        boolean useExistingListener = ListenerUtil.shouldUseExistingListener(properties);
        Optional<String> existingListenerName = ListenerUtil.getExistingListenerName(properties);
        properties.remove(KEY_EXISTING_LISTENER);

        ListenerDTO listenerDTO;
        if (useExistingListener && existingListenerName.isPresent()) {
            // Listener already exists — no declaration to emit
            String listenerProtocol = getProtocol(serviceInitModel.getModuleName());
            listenerDTO = new ListenerDTO(listenerProtocol, existingListenerName.get(), "");
        } else {
            // Build new listener declaration from properties using argType dispatch
            listenerDTO = buildListenerDTO(context);
        }

        return getServiceDeclarationEdits(context, listenerDTO);
    }

    /**
     * Extracts read-only listener config properties (clientSecret, callbackURL, listenOn) from an existing
     * HubSpot listener declaration in the project source.
     */
    private Map<String, Value> extractHubspotListenerConfig(
            String listenerName, SemanticModel semanticModel, Project project) {
        Map<String, Value> config = new LinkedHashMap<>();

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
            while (foundNode != null
                    && !(foundNode instanceof ListenerDeclarationNode)) {
                foundNode = foundNode.parent();
            }
            if (foundNode == null) {
                return config;
            }
            ListenerDeclarationNode listenerNode = (ListenerDeclarationNode) foundNode;

            // Parse the new (...) expression arguments
            io.ballerina.compiler.syntax.tree.NewExpressionNode newExpressionNode = null;
            Node initializer = listenerNode.initializer();
            if (initializer instanceof io.ballerina.compiler.syntax.tree.CheckExpressionNode checkExpr) {
                if (checkExpr.expression() instanceof io.ballerina.compiler.syntax.tree.NewExpressionNode newExpr) {
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

            for (FunctionArgumentNode argument : arguments) {
                if (argument instanceof PositionalArgumentNode positionalArg) {
                    // The ListenerConfig record {clientSecret: "...", callbackURL: "..."}
                    if (positionalArg.expression() instanceof MappingConstructorExpressionNode mapping) {
                        extractListenerConfigFields(mapping, config);
                    }
                } else if (argument instanceof NamedArgumentNode namedArg) {
                    String argName = namedArg.argumentName().name().text().trim();
                    if (KEY_LISTEN_ON.equals(argName)) {
                        String argValue = namedArg.expression().toSourceCode().trim();
                        config.put(KEY_LISTEN_ON,
                                ListenerUtil.buildReadOnlyTextValue("Port",
                                        "The port on which the webhook listener accepts incoming HTTP requests",
                                        argValue));
                    } else if (namedArg.expression() instanceof MappingConstructorExpressionNode mapping) {
                        // listenerConfig passed as a named argument
                        extractListenerConfigFields(mapping, config);
                    }
                }
            }
        } catch (RuntimeException e) {
            LOGGER.warning("Failed to extract HubSpot listener config for '" + listenerName
                    + "': " + e.getMessage());
        }

        return config;
    }

    private void extractListenerConfigFields(MappingConstructorExpressionNode mapping, Map<String, Value> config) {
        for (MappingFieldNode fieldNode : mapping.fields()) {
            if (!(fieldNode instanceof SpecificFieldNode field)) {
                continue;
            }
            String fieldName = field.fieldName().toSourceCode().trim();
            String fieldValue = field.valueExpr()
                    .map(expr -> expr.toSourceCode().trim()).orElse("");
            if (KEY_CLIENT_SECRET.equals(fieldName)) {
                config.put(KEY_CLIENT_SECRET,
                        ListenerUtil.buildReadOnlyTextValue("Client Secret",
                                "The client secret of the HubSpot app", fieldValue));
            } else if (KEY_CALLBACK_URL.equals(fieldName)) {
                config.put(KEY_CALLBACK_URL,
                        ListenerUtil.buildReadOnlyTextValue("Callback URL",
                                "The callback URL of the HubSpot app", fieldValue));
            }
        }
    }
}
