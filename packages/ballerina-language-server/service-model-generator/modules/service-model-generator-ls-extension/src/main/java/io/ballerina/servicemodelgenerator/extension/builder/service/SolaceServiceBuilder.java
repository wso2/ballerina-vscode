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
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

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
                // Enable and populate "Use existing" choice
                Value existingChoice = configureListener.getChoices().get(1);
                existingChoice.setMetadata(new MetaData("Use existing", "Select an existing Solace listener"));
                existingChoice.setEnabled(true);
                existingChoice.setEditable(true);

                // Build SINGLE_SELECT dropdown with listener names
                List<String> listenerNames = new ArrayList<>(compatibleListeners);
                Value listenerDropdown = new Value.ValueBuilder()
                        .metadata("Listener Name", "Select an existing Solace listener")
                        .value(listenerNames.get(0))
                        .types(List.of(PropertyType.types(Value.FieldType.SINGLE_SELECT)))
                        .enabled(true)
                        .editable(true)
                        .setItems(new ArrayList<>(listenerNames))
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
