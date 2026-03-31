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
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.PropertyType;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
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
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Logger;

import static io.ballerina.servicemodelgenerator.extension.util.ListenerUtil.getArgList;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_CONFIGURE_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_EXISTING_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_INCLUDED_FIELD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.CLOSE_BRACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.NEW_LINE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ON;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.OPEN_BRACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SERVICE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SOLACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SPACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.TWO_NEW_LINES;
import static io.ballerina.servicemodelgenerator.extension.util.DatabindUtil.addDataBindingParam;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.ON_MESSAGE_FUNCTION_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.applyAckModeToOnMessageFunction;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildServiceAnnotation;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildServiceCodeEdits;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.cleanSecureSocketProperty;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.updateModelWithAckMode;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getRequiredFunctionsForServiceType;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.FunctionAddContext.TRIGGER_ADD;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.applyEnabledChoiceProperty;

/**
 * Builder class for Solace service.
 *
 * @since 1.4.0
 */
public final class SolaceServiceBuilder extends AbstractServiceBuilder {

    private static final Logger LOGGER = Logger.getLogger(SolaceServiceBuilder.class.getName());
    private static final String SOLACE_SERVICE_MODEL_LOCATION = "services/solace.json";

    private static final String PROPERTY_DESTINATION = "destination";
    private static final String PROPERTY_AUTHENTICATION = "authentication";
    private static final String TYPE_SOLACE_SERVICE_CONFIG = "solace:ServiceConfig";
    private static final String SERVICE_TYPE = "solace:Service";
    private static final String CALLER_TYPE = "solace:Caller";

    // Display labels
    public static final String LABEL_SOLACE = "Solace";

    // Function and parameter names
    public static final String PAYLOAD_FIELD_NAME = "payload";
    public static final String TYPE_PREFIX = "SolaceMessage";

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        InputStream resourceStream = this.getClass().getClassLoader()
                .getResourceAsStream(SOLACE_SERVICE_MODEL_LOCATION);
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
                Map<String, Map<String, Value>> listenerConfigs = extractSolaceListenerConfigs(
                        compatibleListeners, context.semanticModel(), context.project());

                // Enable and populate "Use existing" choice
                Value existingChoice = configureListener.getChoices().get(1);
                existingChoice.setMetadata(new MetaData("Use existing", "Select an existing Solace listener"));
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
                            .metadata(name, "Solace source: " + name)
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
                        .metadata("Listener Name", "Select an existing Solace listener")
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

    private Map<String, Map<String, Value>> extractSolaceListenerConfigs(
            Set<String> listenerNames, SemanticModel semanticModel, Project project) {
        Map<String, Map<String, Value>> configs = new LinkedHashMap<>();
        for (String listenerName : listenerNames) {
            Map<String, Value> config = extractSolaceListenerConfig(listenerName, semanticModel, project);
            if (config != null && !config.isEmpty()) {
                configs.put(listenerName, config);
            }
        }
        return configs;
    }

    private Map<String, Value> extractSolaceListenerConfig(
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
            return extractConfigFromSolaceListenerDeclaration(listenerNode, listenerName);
        } catch (RuntimeException e) {
            LOGGER.warning("Failed to extract Solace listener config for '" + listenerName + "': " + e.getMessage());
            return null;
        }
    }

    private Map<String, Value> extractConfigFromSolaceListenerDeclaration(
            ListenerDeclarationNode listenerNode, String listenerName) {
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

        boolean firstPositional = true;
        for (FunctionArgumentNode argument : arguments) {
            if (argument instanceof PositionalArgumentNode positionalArg && firstPositional) {
                String url = positionalArg.expression().toSourceCode().trim();
                config.put("url", ListenerUtil.buildReadOnlyTextValue("Broker URL",
                        "The Solace broker URL", url));
                firstPositional = false;
            } else if (argument instanceof NamedArgumentNode namedArg) {
                firstPositional = false;
                String argName = namedArg.argumentName().name().text().trim();
                String argValue = namedArg.expression().toSourceCode().trim();
                switch (argName) {
                    case "messageVpn" -> config.put("messageVpn", ListenerUtil.buildReadOnlyTextValue(
                            "Message VPN", "The message VPN to connect to", argValue));
                    case "auth" -> config.put(PROPERTY_AUTHENTICATION, ListenerUtil.buildReadOnlyTextValue(
                            "Authentication", "Authentication configuration for Solace broker connection",
                            argValue));
                    case "secureSocket" -> config.put("secureSocket", ListenerUtil.buildReadOnlyTextValue(
                            "Secure Socket", "Configure SSL/TLS configuration for secure connection",
                            argValue));
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

        // Apply destination choice first (Queue or Topic)
        applyEnabledChoiceProperty(serviceInitModel, PROPERTY_DESTINATION);

        // Apply configure listener choice and flatten nested GROUP_SECTION wrappers
        applyEnabledChoiceProperty(serviceInitModel, KEY_CONFIGURE_LISTENER);
        Map<String, Value> properties = serviceInitModel.getProperties();
        unwrapGroupSections(properties);

        cleanSecureSocketProperty(properties);
        applyAuthenticationProperty(properties);

        ListenerDTO listenerDTO;
        if (ListenerUtil.shouldUseExistingListener(properties)) {
            String listenerName = ListenerUtil.getExistingListenerName(properties).orElse("");
            listenerDTO = new ListenerDTO(context.serviceInitModel().getModuleName(), listenerName, "");
        } else {
            listenerDTO = buildListenerDTO(context);
        }

        String serviceCode = buildJMSServiceCode(context, listenerDTO);
        return buildServiceCodeEdits(context, serviceCode, null);
    }

    private void applyAuthenticationProperty(Map<String, Value> properties) {
        String authConfig = buildAuthenticationConfig(properties);
        if (authConfig != null && !authConfig.isEmpty()) {
            Value authValue = new Value.ValueBuilder()
                    .value(authConfig)
                    .types(List.of(PropertyType.types(Value.FieldType.EXPRESSION)))
                    .enabled(true)
                    .editable(false)
                    .setCodedata(new Codedata(null, ARG_TYPE_LISTENER_PARAM_INCLUDED_FIELD))
                    .build();
            properties.put("auth", authValue);
        }
    }

    private String buildJMSServiceCode(AddServiceInitModelContext context, ListenerDTO listenerDTO) {
        ServiceInitModel serviceInitModel = context.serviceInitModel();
        Map<String, Value> properties = serviceInitModel.getProperties();

        String serviceAnnotation = buildServiceAnnotation(
                TYPE_SOLACE_SERVICE_CONFIG,
                properties,
                (isDurable, isShared) -> isDurable ? "DURABLE" : "DEFAULT");

        List<Function> functions = getRequiredFunctionsForServiceType(serviceInitModel);
        applyAckModeToOnMessageFunction(functions, properties, CALLER_TYPE, LABEL_SOLACE);
        List<String> functionsStr = buildMethodDefinitions(functions, TRIGGER_ADD, new HashMap<>());

        return NEW_LINE
                + listenerDTO.listenerDeclaration()
                + NEW_LINE
                + serviceAnnotation
                + SERVICE + SPACE + SERVICE_TYPE + SPACE
                + ON + SPACE + listenerDTO.listenerVarName() + SPACE
                + OPEN_BRACE
                + NEW_LINE
                + String.join(TWO_NEW_LINES, functionsStr) + NEW_LINE
                + CLOSE_BRACE + NEW_LINE;
    }

    private String buildAuthenticationConfig(Map<String, Value> properties) {
        if (!properties.containsKey(PROPERTY_AUTHENTICATION)) {
            return null;
        }

        Value authChoice = properties.get(PROPERTY_AUTHENTICATION);
        if (authChoice == null || authChoice.getChoices() == null || authChoice.getChoices().isEmpty()) {
            return null;
        }

        // Find the enabled choice (selected by user)
        List<Value> choices = authChoice.getChoices();
        Value selectedAuthChoice = choices.stream()
                .filter(Value::isEnabled)
                .findFirst()
                .orElse(null);

        if (selectedAuthChoice == null) {
            return null;
        }

        Map<String, Value> authProps = selectedAuthChoice.getProperties();
        if (authProps == null || authProps.isEmpty()) {
            return null;
        }

        List<String> authFields = new ArrayList<>();

        authProps.forEach((key, value) -> {
            if (value != null && value.getValue() != null && !value.getValue().isEmpty()) {
                authFields.add(key + ": " + value.getValue());
            }
        });

        if (authFields.isEmpty()) {
            return null;
        }

        return "{" + String.join(", ", authFields) + "}";
    }

    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        Map<String, List<TextEdit>> serviceEdits = super.updateModel(context);
        return updateModelWithAckMode(context, serviceEdits, SOLACE, CALLER_TYPE, LABEL_SOLACE);
    }

    @Override
    public Service getModelFromSource(ModelFromSourceContext context) {
        Service service = super.getModelFromSource(context);
        addDataBindingParam(service, ON_MESSAGE_FUNCTION_NAME, context, PAYLOAD_FIELD_NAME, TYPE_PREFIX);
        service.getFunctions().stream().filter(function ->
                        function.getName().getValue().equals(ON_MESSAGE_FUNCTION_NAME)).findFirst()
                .flatMap(function -> function.getParameters().stream().filter(parameter ->
                        parameter.getType().getValue().equals(CALLER_TYPE)).findFirst()).ifPresent(parameter ->
                        parameter.setEditable(false));
        return service;
    }

    @Override
    public String kind() {
        return SOLACE;
    }
}
