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

package io.ballerina.servicemodelgenerator.extension.builder.service;

import com.google.gson.Gson;
import com.google.gson.stream.JsonReader;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.CheckExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionArgumentNode;
import io.ballerina.compiler.syntax.tree.ListenerDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NamedArgumentNode;
import io.ballerina.compiler.syntax.tree.NewExpressionNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.PositionalArgumentNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.projects.Document;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Project;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.PropertyType;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.util.ListenerUtil;
import io.ballerina.servicemodelgenerator.extension.util.Utils;
import io.ballerina.tools.diagnostics.Location;
import io.ballerina.tools.text.TextRange;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Logger;

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_CONFIGURE_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_EXISTING_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.RABBITMQ;
import static io.ballerina.servicemodelgenerator.extension.util.DatabindUtil.addDataBindingParam;
import static io.ballerina.servicemodelgenerator.extension.util.ListenerUtil.getArgList;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.applyEnabledChoiceProperty;

/**
 * Builder class for RabbitMQ service.
 *
 * @since 1.2.0
 */
public final class RabbitMQServiceBuilder extends AbstractServiceBuilder {

    private static final Logger LOGGER = Logger.getLogger(RabbitMQServiceBuilder.class.getName());
    private static final String RABBITMQ_SERVICE_MODEL_LOCATION = "services/rabbitmq.json";

    public static final String PAYLOAD_FIELD_NAME = "content";
    public static final String TYPE_PREFIX = "RabbitMQAnydataMessage";
    private static final String ON_MESSAGE = "onMessage";
    private static final String ON_REQUEST = "onRequest";

    /**
     * Filters the RabbitMQ service functions to ensure that only one of `onMessage` or `onRequest` is present. If both
     * are present, it retains the enabled one and removes the other.
     *
     * @param functions List of functions in the RabbitMQ service
     * @return The name of the enabled function (onMessage or onRequest), or null if neither is enabled
     */
    private static String filterRabbitMqFunctions(List<Function> functions) {
        boolean hasOnMessage = false;
        boolean hasOnRequest = false;
        int onMessageIndex = -1;
        int onRequestIndex = -1;
        for (int i = 0; i < functions.size(); i++) {
            Function function = functions.get(i);
            String functionName = function.getName().getValue();
            if (functionName.equals(ON_MESSAGE)) {
                hasOnMessage = function.isEnabled();
                onMessageIndex = i;
            } else if (functionName.equals(ON_REQUEST)) {
                hasOnRequest = function.isEnabled();
                onRequestIndex = i;
            }
        }
        if (hasOnMessage) {
            functions.remove(onRequestIndex);
            return ON_MESSAGE;
        } else if (hasOnRequest) {
            functions.remove(onMessageIndex);
            return ON_REQUEST;
        }
        return null;
    }

    @Override
    public Service getModelFromSource(ModelFromSourceContext context) {
        Service service = super.getModelFromSource(context);
        String enabledFunction = filterRabbitMqFunctions(service.getFunctions());
        if (enabledFunction != null) {
            addDataBindingParam(service, enabledFunction, context, PAYLOAD_FIELD_NAME, TYPE_PREFIX);
        } else {
            addDataBindingParam(service, ON_MESSAGE, context, PAYLOAD_FIELD_NAME, TYPE_PREFIX);
        }
        return service;
    }

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        InputStream resourceStream = this.getClass().getClassLoader()
                .getResourceAsStream(RABBITMQ_SERVICE_MODEL_LOCATION);
        if (resourceStream == null) {
            return null;
        }
        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            ServiceInitModel serviceInitModel = new Gson().fromJson(reader, ServiceInitModel.class);
            Map<String, Value> properties = serviceInitModel.getProperties();

            // Navigate to listenerVarName in advancedConfigurations
            Value configureListener = properties.get(KEY_CONFIGURE_LISTENER);
            Value createNewChoice = configureListener.getChoices().get(0);
            Value listenerConfig = createNewChoice.getProperties().get("listenerConfig");
            Value advancedSection = listenerConfig.getProperties().get("advancedConfigurations");

            // Generate a unique listener variable name
            String listenerVarName = Utils.generateVariableIdentifier(context.semanticModel(), context.document(),
                    context.document().syntaxTree().rootNode().lineRange().endLine(),
                    advancedSection.getProperties().get(KEY_LISTENER_VAR_NAME).getValue());
            advancedSection.getProperties().get(KEY_LISTENER_VAR_NAME).setValue(listenerVarName);

            // Check for existing compatible listeners
            Set<String> compatibleListeners = ListenerUtil.getCompatibleListeners(context.moduleName(),
                    context.semanticModel(), context.project());

            if (!compatibleListeners.isEmpty()) {
                // Determine which keys are "advanced" from the template
                Set<String> advancedKeys = advancedSection.getProperties() != null
                        ? advancedSection.getProperties().keySet() : Set.of();

                // Extract configs from existing listener declarations
                Map<String, Map<String, Value>> listenerConfigs = extractRabbitMQListenerConfigs(
                        compatibleListeners, context.semanticModel(), context.project());

                // Enable and populate "Use existing" choice
                Value existingChoice = configureListener.getChoices().get(1);
                existingChoice.setMetadata(new MetaData("Use existing", "Select an existing RabbitMQ listener"));
                existingChoice.setEnabled(true);
                existingChoice.setEditable(true);

                // Build per-listener config groups
                List<String> listenerNames = new ArrayList<>(compatibleListeners);
                Map<String, Value> perListenerConfigs = new LinkedHashMap<>();
                for (String name : listenerNames) {
                    Map<String, Value> config = listenerConfigs.getOrDefault(name, new LinkedHashMap<>());
                    Map<String, Value> basicProps = new LinkedHashMap<>();
                    Map<String, Value> advancedProps = new LinkedHashMap<>();
                    for (Map.Entry<String, Value> entry : config.entrySet()) {
                        entry.getValue().setEditable(false);
                        if (advancedKeys.contains(entry.getKey())) {
                            advancedProps.put(entry.getKey(), entry.getValue());
                        } else {
                            basicProps.put(entry.getKey(), entry.getValue());
                        }
                    }

                    if (!advancedProps.isEmpty()) {
                        Value advancedGroup = new Value.ValueBuilder()
                                .metadata("Advanced Configurations", "")
                                .types(List.of(new PropertyType.Builder()
                                        .fieldType(Value.FieldType.GROUP_SECTION)
                                        .selected(false)
                                        .build()))
                                .enabled(true)
                                .editable(false)
                                .setProperties(advancedProps)
                                .build();
                        advancedGroup.getTypes().getFirst().selected(false);
                        basicProps.put("advancedConfigurations", advancedGroup);
                    }

                    Value configGroup = new Value.ValueBuilder()
                            .metadata(name, "RabbitMQ listener: " + name)
                            .value(name)
                            .types(List.of(PropertyType.types(Value.FieldType.FORM)))
                            .enabled(true)
                            .editable(false)
                            .setProperties(basicProps)
                            .build();
                    perListenerConfigs.put(name, configGroup);
                }

                // Build SINGLE_SELECT dropdown with per-listener configs
                Value listenerDropdown = new Value.ValueBuilder()
                        .metadata("Listener Name", "Select an existing RabbitMQ listener")
                        .value(listenerNames.get(0))
                        .types(List.of(PropertyType.types(Value.FieldType.SINGLE_SELECT)))
                        .enabled(true)
                        .editable(true)
                        .setItems(new ArrayList<>(listenerNames))
                        .setProperties(perListenerConfigs)
                        .build();

                Map<String, Value> existingProps = new LinkedHashMap<>();
                existingProps.put(KEY_EXISTING_LISTENER, listenerDropdown);
                existingChoice.getProperties().get("listenerConfig").setProperties(existingProps);

                // Set "Use existing" as default selection
                configureListener.setValue("1");
                createNewChoice.setEnabled(false);
            }

            return serviceInitModel;
        } catch (IOException e) {
            return null;
        }
    }

    private Map<String, Map<String, Value>> extractRabbitMQListenerConfigs(
            Set<String> listenerNames, SemanticModel semanticModel, Project project) {
        Map<String, Map<String, Value>> configs = new LinkedHashMap<>();
        for (String listenerName : listenerNames) {
            Map<String, Value> config = extractRabbitMQListenerConfig(listenerName, semanticModel, project);
            if (config != null && !config.isEmpty()) {
                configs.put(listenerName, config);
            }
        }
        return configs;
    }

    private Map<String, Value> extractRabbitMQListenerConfig(
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
            return Collections.emptyMap();
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
            return extractConfigFromRabbitMQListenerDeclaration(listenerNode);
        } catch (RuntimeException e) {
            LOGGER.warning("Failed to extract RabbitMQ listener config for '" + listenerName + "': " + e.getMessage());
            return null;
        }
    }

    private Map<String, Value> extractConfigFromRabbitMQListenerDeclaration(
            ListenerDeclarationNode listenerNode) {
        Map<String, Value> config = new LinkedHashMap<>();

        Node initializer = listenerNode.initializer();
        NewExpressionNode newExpressionNode;
        if (initializer instanceof CheckExpressionNode checkExpressionNode) {
            if (!(checkExpressionNode.expression() instanceof NewExpressionNode newExpr)) {
                return config;
            }
            newExpressionNode = newExpr;
        } else if (initializer instanceof NewExpressionNode newExpr) {
            newExpressionNode = newExpr;
        } else {
            return config;
        }

        SeparatedNodeList<FunctionArgumentNode> arguments = getArgList(newExpressionNode);
        if (arguments == null) {
            return config;
        }

        int positionalIndex = 0;
        for (FunctionArgumentNode argument : arguments) {
            if (argument instanceof PositionalArgumentNode positionalArg) {
                String argValue = positionalArg.expression().toSourceCode().trim();
                if (positionalIndex == 0) {
                    config.put("host", ListenerUtil.buildReadOnlyTextValue("Host",
                            "The host used for establishing the connection", argValue));
                } else if (positionalIndex == 1) {
                    config.put("port", ListenerUtil.buildReadOnlyNumberValue("Port",
                            "The port used for establishing the connection", argValue));
                }
                positionalIndex++;
            } else if (argument instanceof NamedArgumentNode namedArg) {
                String argName = namedArg.argumentName().name().text().trim();
                String argValue = namedArg.expression().toSourceCode().trim();
                switch (argName) {
                    case "host" -> config.put("host", ListenerUtil.buildReadOnlyTextValue("Host",
                            "The host used for establishing the connection", argValue));
                    case "port" -> config.put("port", ListenerUtil.buildReadOnlyNumberValue("Port",
                            "The port used for establishing the connection", argValue));
                    default -> {
                    }
                }
            }
        }

        return config;
    }

    @Override
    public Map<String, List<TextEdit>> addServiceInitSource(AddServiceInitModelContext context) {
        ServiceInitModel serviceInitModel = context.serviceInitModel();

        applyEnabledChoiceProperty(serviceInitModel, KEY_CONFIGURE_LISTENER);
        Map<String, Value> properties = serviceInitModel.getProperties();
        unwrapGroupSections(properties);

        ListenerDTO listenerDTO;
        if (ListenerUtil.shouldUseExistingListener(properties)) {
            String listenerName = ListenerUtil.getExistingListenerName(properties).orElse("");
            listenerDTO = new ListenerDTO(RABBITMQ, listenerName, "");
        } else {
            listenerDTO = buildListenerDTO(context);
        }

        return getServiceDeclarationEdits(context, listenerDTO);
    }

    @Override
    public String kind() {
        return RABBITMQ;
    }
}
