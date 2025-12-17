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

import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.PropertyType;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import io.ballerina.servicemodelgenerator.extension.util.ListenerUtil;
import org.eclipse.lsp4j.TextEdit;

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
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.PROPERTY_SESSION_ACK_MODE;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.applyAckModeToOnMessageFunction;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildAuthenticationChoice;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildDestinationChoice;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildListenerChoice;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildSecureSocketChoice;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildServiceAnnotation;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildServiceCodeEdits;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildSessionAckModeProperty;
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

    private static final String PROPERTY_DESTINATION = "destination";
    private static final String PROPERTY_AUTHENTICATION = "authentication";
    private static final String PROPERTY_SECURE_SOCKET = "secureSocket";
    private static final String TYPE_SOLACE_SERVICE_CONFIG = "solace:ServiceConfig";
    private static final String SERVICE_TYPE = "solace:Service";
    private static final String CALLER_TYPE = "solace:Caller";

    // Display labels
    public static final String LABEL_SOLACE = "Solace";
    private static final String LABEL_QUEUE = "Queue";
    private static final String LABEL_TOPIC = "Topic";
    private static final String LABEL_QUEUE_NAME = "Queue Name";
    private static final String LABEL_TOPIC_NAME = "Topic Name";
    private static final String LABEL_DESTINATION = "Destination";

    // Descriptions
    private static final String DESC_QUEUE = "Listen to messages from a queue";
    private static final String DESC_TOPIC = "Listen to messages from a topic";
    private static final String DESC_QUEUE_NAME = "Queue to listen for incoming messages.";
    private static final String DESC_TOPIC_NAME = "Topic to listen for incoming messages.";
    private static final String DESC_DESTINATION = "The Solace destination to expect messages from.";

    // Function and parameter names
    public static final String PAYLOAD_FIELD_NAME = "payload";
    public static final String TYPE_PREFIX = "SolaceMessage";

    // Listener configuration property keys
    private static final String[] LISTENER_CONFIG_KEYS = {
            KEY_LISTENER_VAR_NAME, "url", "messageVpn", PROPERTY_AUTHENTICATION, PROPERTY_SECURE_SOCKET
    };

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        ServiceInitModel serviceInitModel = super.getServiceInitModel(context);
        if (serviceInitModel == null) {
            return null;
        }

        Map<String, Value> properties = serviceInitModel.getProperties();
        Value authenticationChoice = buildAuthenticationChoice();
        properties.put(PROPERTY_AUTHENTICATION, authenticationChoice);

        Value secureSocket = buildSecureSocketChoice(serviceInitModel.getOrgName(),
                serviceInitModel.getModuleName(), serviceInitModel.getVersion());
        properties.put(PROPERTY_SECURE_SOCKET, secureSocket);

        Set<String> listeners = ListenerUtil.getCompatibleListeners(context.moduleName(),
                context.semanticModel(), context.project());

        if (!listeners.isEmpty()) {
            Map<String, Value> listenerProps = new LinkedHashMap<>();
            for (String key : LISTENER_CONFIG_KEYS) {
                listenerProps.put(key, properties.remove(key));
            }
            Value choicesProperty = buildListenerChoice(listenerProps, listeners, LABEL_SOLACE);
            properties.put(KEY_CONFIGURE_LISTENER, choicesProperty);
        }

        Value destinationChoice = buildDestinationChoice(
                "\"test-queue\"",
                "\"test/topic\"",
                LABEL_QUEUE,
                LABEL_TOPIC,
                LABEL_QUEUE_NAME,
                DESC_QUEUE_NAME,
                LABEL_TOPIC_NAME,
                DESC_TOPIC_NAME,
                LABEL_DESTINATION,
                DESC_DESTINATION,
                DESC_QUEUE,
                DESC_TOPIC,
                null);

        properties.put(PROPERTY_DESTINATION, destinationChoice);

        Value sessionAckMode = buildSessionAckModeProperty();
        properties.put(PROPERTY_SESSION_ACK_MODE, sessionAckMode);

        return serviceInitModel;
    }

    @Override
    public Map<String, List<TextEdit>> addServiceInitSource(AddServiceInitModelContext context) {
        ServiceInitModel serviceInitModel = context.serviceInitModel();
        applyEnabledChoiceProperty(serviceInitModel, PROPERTY_DESTINATION);

        Map<String, Value> properties = serviceInitModel.getProperties();

        cleanSecureSocketProperty(properties);
        if (!properties.containsKey(KEY_CONFIGURE_LISTENER)) {
            applyAuthenticationProperty(properties);
            return addServiceWithNewListener(context);
        }
        applyEnabledChoiceProperty(serviceInitModel, KEY_CONFIGURE_LISTENER);
        applyAuthenticationProperty(properties);

        ListenerDTO listenerDTO;
        if (properties.containsKey(KEY_EXISTING_LISTENER)) {
            listenerDTO = new ListenerDTO(context.serviceInitModel().getModuleName(),
                    properties.get(KEY_EXISTING_LISTENER).getValue(), "");
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

    private Map<String, List<TextEdit>> addServiceWithNewListener(AddServiceInitModelContext context) {
        ListenerDTO listenerDTO = buildListenerDTO(context);
        String serviceCode = buildJMSServiceCode(context, listenerDTO);
        return buildServiceCodeEdits(context, serviceCode, null);
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
