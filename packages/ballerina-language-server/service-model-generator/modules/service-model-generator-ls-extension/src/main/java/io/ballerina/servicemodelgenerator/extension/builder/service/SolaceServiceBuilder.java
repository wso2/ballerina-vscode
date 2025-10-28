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

import io.ballerina.compiler.syntax.tree.BasicLiteralNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingFieldNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NodeParser;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.servicemodelgenerator.extension.builder.FunctionBuilderRouter;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_CONFIGURE_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_EXISTING_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_INCLUDED_DEFAULTABLE_FIELD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_INCLUDED_FIELD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_REQUIRED;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.AT;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.CLOSE_BRACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.COLON;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.NEW_LINE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ON;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.OPEN_BRACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SERVICE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SOLACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SPACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.TWO_NEW_LINES;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_CHOICE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_EXPRESSION;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_FLAG;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_FORM;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_SINGLE_SELECT;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_STRING;
import static io.ballerina.servicemodelgenerator.extension.util.DatabindUtil.addDataBindingParam;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.CALLER_PARAM_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.addCallerParameter;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildListenerChoice;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getProtocol;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getRequiredFunctionsForServiceType;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.FunctionAddContext.TRIGGER_ADD;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.applyEnabledChoiceProperty;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getImportStmt;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.importExists;

/**
 * Builder class for Solace service.
 *
 * @since 1.2.0
 */
public final class SolaceServiceBuilder extends AbstractServiceBuilder {

    private static final String PROPERTY_DESTINATION = "destination";
    private static final String PROPERTY_SESSION_ACK_MODE = "sessionAckMode";
    private static final String PROPERTY_QUEUE_NAME = "queueName";
    private static final String PROPERTY_TOPIC_NAME = "topicName";
    private static final String TYPE_SOLACE_SERVICE_CONFIG = "solace:ServiceConfig";
    private static final String SERVICE_TYPE = "solace:Service";
    private static final String CALLER_TYPE = "solace:Caller";
    private static final String LISTENER_TYPE = "Listener";

    // Display labels
    private static final String LABEL_SOLACE = "Solace";
    private static final String LABEL_QUEUE = "Queue";
    private static final String LABEL_TOPIC = "Topic";
    private static final String LABEL_QUEUE_NAME = "Queue Name";
    private static final String LABEL_TOPIC_NAME = "Topic Name";
    private static final String LABEL_DURABLE_SUBSCRIBER = "Durable Subscriber";
    private static final String LABEL_SESSION_ACK_MODE = "Session Ack Mode";
    private static final String LABEL_DESTINATION = "Destination";

    // Descriptions
    private static final String DESC_QUEUE = "Listen to messages from a queue";
    private static final String DESC_TOPIC = "Listen to messages from a topic";
    private static final String DESC_QUEUE_NAME = "Queue to listen for incoming messages.";
    private static final String DESC_TOPIC_NAME = "Topic to listen for incoming messages.";
    private static final String DESC_DURABLE_SUBSCRIBER = "Persist subscription when disconnected.";
    private static final String DESC_SESSION_ACK_MODE = "How messages received should be acknowledged.";
    private static final String DESC_DESTINATION = "The Solace destination to expect messages from.";

    // Formatting strings
    private static final String BOOLEAN_TRUE = "true";
    private static final String EQUALS_SEPARATOR = SPACE + "=" + SPACE;
    private static final String COMMA_SEPARATOR = "," + SPACE;
    private static final String COLON_SEPARATOR = COLON + SPACE;
    private static final String QUEUE_NAME_PARAM = PROPERTY_QUEUE_NAME + COLON_SEPARATOR;
    private static final String TOPIC_NAME_PARAM = PROPERTY_TOPIC_NAME + COLON_SEPARATOR;
    private static final String LISTENER_DECLARATION_FORMAT = "listener %s:%s %s = new (%s);";

    // Function and parameter names
    private static final String ON_MESSAGE_FUNCTION_NAME = "onMessage";
    public static final String PAYLOAD_FIELD_NAME = "payload";
    public static final String TYPE_PREFIX = "SolaceMessage";

    // Listener configuration property keys
    private static final String[] LISTENER_CONFIG_KEYS = {
            KEY_LISTENER_VAR_NAME, "url", "messageVpn"
    };

    /**
     * Acknowledgment mode enum for Solace sessions.
     */
    private enum AcknowledgmentMode {
        AUTO_ACKNOWLEDGE("AUTO_ACKNOWLEDGE"),
        CLIENT_ACKNOWLEDGE("CLIENT_ACKNOWLEDGE"),
        DUPS_OK_ACKNOWLEDGE("DUPS_OK_ACKNOWLEDGE"),
        SESSION_TRANSACTED("SESSION_TRANSACTED");

        private final String value;

        AcknowledgmentMode(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }

        public String getQuotedValue() {
            return "\"" + value + "\"";
        }

        public static AcknowledgmentMode fromString(String value) {
            String cleanValue = value.replace("\"", "");
            for (AcknowledgmentMode mode : values()) {
                if (mode.value.equals(cleanValue)) {
                    return mode;
                }
            }
            return AUTO_ACKNOWLEDGE;
        }
    }

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        ServiceInitModel serviceInitModel = super.getServiceInitModel(context);
        if (serviceInitModel == null) {
            return null;
        }

        Map<String, Value> properties = serviceInitModel.getProperties();

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

        Value destinationChoice = buildDestinationChoice();
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

        // Handle existing listener if configured
        if (!properties.containsKey(KEY_CONFIGURE_LISTENER)) {
            return addServiceWithNewListener(context);
        }
        applyEnabledChoiceProperty(serviceInitModel, KEY_CONFIGURE_LISTENER);

        ListenerDTO listenerDTO;
        if (properties.containsKey(KEY_EXISTING_LISTENER)) {
            listenerDTO = new ListenerDTO(context.serviceInitModel().getModuleName(),
                    properties.get(KEY_EXISTING_LISTENER).getValue(), "");
        } else {
            listenerDTO = buildSolaceListenerDTO(context);
        }

        // Build service annotation
        String serviceAnnotation = buildServiceAnnotation(properties);

        // Get required functions
        List<Function> functions = getRequiredFunctionsForServiceType(serviceInitModel);
        applyAckModeToOnMessageFunction(functions, properties);
        List<String> functionsStr = buildMethodDefinitions(functions, TRIGGER_ADD, new HashMap<>());

        // Build complete service
        ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();
        String serviceCode = NEW_LINE
                + listenerDTO.listenerDeclaration()
                + NEW_LINE
                + serviceAnnotation
                + SERVICE + SPACE + SERVICE_TYPE + SPACE
                + ON + SPACE + listenerDTO.listenerVarName() + SPACE
                + OPEN_BRACE
                + NEW_LINE
                + String.join(TWO_NEW_LINES, functionsStr) + NEW_LINE
                + CLOSE_BRACE + NEW_LINE;

        Map<String, List<TextEdit>> allEdits = new HashMap<>();
        List<TextEdit> edits = new ArrayList<>();

        if (!importExists(modulePartNode, serviceInitModel.getOrgName(), serviceInitModel.getModuleName())) {
            String importText = getImportStmt(serviceInitModel.getOrgName(), serviceInitModel.getModuleName());
            edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().startLine()), importText));
        }
        edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().endLine()), serviceCode));

        allEdits.put(context.filePath(), edits);
        return allEdits;
    }

    private Map<String, List<TextEdit>> addServiceWithNewListener(AddServiceInitModelContext context) {
        ServiceInitModel serviceInitModel = context.serviceInitModel();
        Map<String, Value> properties = serviceInitModel.getProperties();

        ListenerDTO listenerDTO = buildSolaceListenerDTO(context);

        // Build service annotation
        String serviceAnnotation = buildServiceAnnotation(properties);

        // Get required functions
        List<Function> functions = getRequiredFunctionsForServiceType(serviceInitModel);
        applyAckModeToOnMessageFunction(functions, properties);
        List<String> functionsStr = buildMethodDefinitions(functions, TRIGGER_ADD, new HashMap<>());

        // Build complete service
        ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();
        String serviceCode = NEW_LINE
                + listenerDTO.listenerDeclaration()
                + NEW_LINE
                + serviceAnnotation
                + SERVICE + SPACE + SERVICE_TYPE + SPACE
                + ON + SPACE + listenerDTO.listenerVarName() + SPACE
                + OPEN_BRACE
                + NEW_LINE
                + String.join(TWO_NEW_LINES, functionsStr) + NEW_LINE
                + CLOSE_BRACE + NEW_LINE;

        Map<String, List<TextEdit>> allEdits = new HashMap<>();
        List<TextEdit> edits = new ArrayList<>();

        if (!importExists(modulePartNode, serviceInitModel.getOrgName(), serviceInitModel.getModuleName())) {
            String importText = getImportStmt(serviceInitModel.getOrgName(), serviceInitModel.getModuleName());
            edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().startLine()), importText));
        }
        edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().endLine()), serviceCode));

        allEdits.put(context.filePath(), edits);
        return allEdits;
    }

    private Value buildDestinationChoice() {
        // Build Queue choice
        Map<String, Value> queueProps = new LinkedHashMap<>();
        queueProps.put(PROPERTY_QUEUE_NAME, new Value.ValueBuilder()
                .metadata(LABEL_QUEUE_NAME, DESC_QUEUE_NAME)
                .value("\"myQueue\"")
                .valueType(VALUE_TYPE_EXPRESSION)
                .setValueTypeConstraint(VALUE_TYPE_STRING)
                .setPlaceholder("")
                .enabled(true)
                .editable(true)
                .build());

        Value queueChoice = new Value.ValueBuilder()
                .metadata(LABEL_QUEUE, DESC_QUEUE)
                .value(BOOLEAN_TRUE)
                .valueType(VALUE_TYPE_FORM)
                .enabled(true)
                .editable(false)
                .setProperties(queueProps)
                .build();

        // Build Topic choice
        Map<String, Value> topicProps = new LinkedHashMap<>();
        topicProps.put(PROPERTY_TOPIC_NAME, new Value.ValueBuilder()
                .metadata(LABEL_TOPIC_NAME, DESC_TOPIC_NAME)
                .value("\"myTopic\"")
                .valueType(VALUE_TYPE_EXPRESSION)
                .setValueTypeConstraint(VALUE_TYPE_STRING)
                .setPlaceholder("")
                .enabled(true)
                .editable(true)
                .build());

        topicProps.put("subscriberName", new Value.ValueBuilder()
                .metadata("Subscriber Name", "The name to be used for the subscription.")
                .value("")
                .valueType(VALUE_TYPE_EXPRESSION)
                .setValueTypeConstraint(VALUE_TYPE_STRING)
                .setPlaceholder("")
                .enabled(true)
                .editable(true)
                .optional(true)
                .build());

        topicProps.put("durable", new Value.ValueBuilder()
                .metadata(LABEL_DURABLE_SUBSCRIBER, DESC_DURABLE_SUBSCRIBER)
                .value(false)
                .valueType(VALUE_TYPE_FLAG)
                .setValueTypeConstraint("BOOLEAN")
                .enabled(true)
                .editable(true)
                .optional(true)
                .build());

        Value topicChoice = new Value.ValueBuilder()
                .metadata(LABEL_TOPIC, DESC_TOPIC)
                .value(BOOLEAN_TRUE)
                .valueType(VALUE_TYPE_FORM)
                .enabled(false)
                .editable(false)
                .setProperties(topicProps)
                .build();

        // Build main choice property
        Value destinationChoice = new Value.ValueBuilder()
                .metadata(LABEL_DESTINATION, DESC_DESTINATION)
                .value(0)
                .valueType(VALUE_TYPE_CHOICE)
                .enabled(true)
                .editable(true)
                .build();
        destinationChoice.setChoices(List.of(queueChoice, topicChoice));

        return destinationChoice;
    }

    private Value buildSessionAckModeProperty() {
        List<Object> ackModeOptions = List.of(
                AcknowledgmentMode.AUTO_ACKNOWLEDGE.getValue(),
                AcknowledgmentMode.CLIENT_ACKNOWLEDGE.getValue(),
                AcknowledgmentMode.DUPS_OK_ACKNOWLEDGE.getValue(),
                AcknowledgmentMode.SESSION_TRANSACTED.getValue()
        );

        return new Value.ValueBuilder()
                .metadata(LABEL_SESSION_ACK_MODE, DESC_SESSION_ACK_MODE)
                .value(AcknowledgmentMode.AUTO_ACKNOWLEDGE.getValue())
                .valueType(VALUE_TYPE_SINGLE_SELECT)
                .setValueTypeConstraint(VALUE_TYPE_STRING)
                .setPlaceholder(AcknowledgmentMode.AUTO_ACKNOWLEDGE.getValue())
                .setItems(ackModeOptions)
                .enabled(true)
                .editable(true)
                .build();
    }

    private static ListenerDTO buildSolaceListenerDTO(AddServiceInitModelContext context) {
        ServiceInitModel serviceInitModel = context.serviceInitModel();
        Map<String, Value> properties = serviceInitModel.getProperties();
        List<String> requiredParams = new ArrayList<>();
        List<String> includedParams = new ArrayList<>();

        for (Map.Entry<String, Value> entry : properties.entrySet()) {
            Value value = entry.getValue();
            if (value.getCodedata() == null) {
                continue;
            }
            String argType = value.getCodedata().getArgType();
            if (argType == null || argType.isEmpty()) {
                continue;
            }
            if (argType.equals(ARG_TYPE_LISTENER_PARAM_REQUIRED)) {
                requiredParams.add(value.getValue());
            } else if (argType.equals(ARG_TYPE_LISTENER_PARAM_INCLUDED_FIELD)
                    || argType.equals(ARG_TYPE_LISTENER_PARAM_INCLUDED_DEFAULTABLE_FIELD)) {
                includedParams.add(entry.getKey() + EQUALS_SEPARATOR + value.getValue());
            }
        }

        String listenerProtocol = getProtocol(SOLACE);
        String listenerVarName = properties.get(KEY_LISTENER_VAR_NAME).getValue();
        requiredParams.addAll(includedParams);
        String args = String.join(COMMA_SEPARATOR, requiredParams);
        String listenerDeclaration = String.format(LISTENER_DECLARATION_FORMAT,
                listenerProtocol, LISTENER_TYPE, listenerVarName, args);
        return new ListenerDTO(listenerProtocol, listenerVarName, listenerDeclaration);
    }

    private String buildServiceAnnotation(Map<String, Value> properties) {
        StringBuilder annotation = new StringBuilder();
        List<String> configParams = new ArrayList<>();

        annotation.append(AT).append(TYPE_SOLACE_SERVICE_CONFIG).append(OPEN_BRACE).append(NEW_LINE);

        if (properties.containsKey(PROPERTY_QUEUE_NAME)) {
            Value queueName = properties.get(PROPERTY_QUEUE_NAME);
            if (queueName != null && queueName.getValue() != null) {
                configParams.add(QUEUE_NAME_PARAM + queueName.getValue());
            }
        } else if (properties.containsKey(PROPERTY_TOPIC_NAME)) {
            Value topicName = properties.get(PROPERTY_TOPIC_NAME);
            if (topicName != null && topicName.getValue() != null) {
                configParams.add(TOPIC_NAME_PARAM + topicName.getValue());
            }

            Value subscriberName = properties.get("subscriberName");
            if (subscriberName != null && subscriberName.getValue() != null && !subscriberName.getValue().isBlank()) {
                configParams.add("subscriberName" + COLON_SEPARATOR + subscriberName.getValue());
            }

            Value durableProp = properties.get("durable");
            boolean isDurable = durableProp != null && Boolean.parseBoolean(durableProp.getValue());

            if (isDurable) {
                configParams.add("consumerType" + COLON_SEPARATOR + "\"DURABLE\"");
            } else {
                configParams.add("consumerType" + COLON_SEPARATOR + "\"DEFAULT\"");
            }
        }

        // Add session acknowledgment mode
        Value sessionAckMode = properties.get(PROPERTY_SESSION_ACK_MODE);
        if (sessionAckMode != null && Objects.nonNull(sessionAckMode.getValue())) {
            AcknowledgmentMode mode = AcknowledgmentMode.fromString(sessionAckMode.getValue());
            configParams.add(PROPERTY_SESSION_ACK_MODE + COLON_SEPARATOR + mode.getQuotedValue());
        }

        annotation.append(String.join(COMMA_SEPARATOR, configParams));
        annotation.append(CLOSE_BRACE).append(NEW_LINE);
        return annotation.toString();
    }

    private void applyAckModeToOnMessageFunction(List<Function> functions, Map<String, Value> properties) {
        // Find the onMessage function
        Function onMessageFunction = functions.stream()
                .filter(func -> ON_MESSAGE_FUNCTION_NAME.equals(func.getName().getValue()))
                .findFirst()
                .orElse(null);

        if (onMessageFunction == null) {
            return;
        }

        // Get the session ack mode
        Value sessionAckMode = properties.get(PROPERTY_SESSION_ACK_MODE);
        if (sessionAckMode == null || sessionAckMode.getValue() == null) {
            return;
        }

        String ackMode = sessionAckMode.getValue();
        updateCallerParameterForAckMode(onMessageFunction, ackMode);
    }

    private String extractAcknowledgmentMode(MappingConstructorExpressionNode mappingNode) {
        // Parse the mapping constructor to find the sessionAckMode field
        for (MappingFieldNode field : mappingNode.fields()) {
            if (field instanceof SpecificFieldNode specificField) {
                // Get the field name
                String fieldName = specificField.fieldName().toString().trim();

                // Check if this is the sessionAckMode field
                if (PROPERTY_SESSION_ACK_MODE.equals(fieldName)) {
                    // Get the field value
                    ExpressionNode valueExpr = specificField.valueExpr().orElse(null);
                    if (valueExpr instanceof BasicLiteralNode literalNode) {
                        return literalNode.literalToken().text().trim();
                    }
                }
            }
        }
        return null; // Return null if sessionAckMode field not found
    }

    private void updateCallerParameterForAckMode(Function onMessageFunction, String ackMode) {
        if (onMessageFunction == null) {
            return;
        }

        Parameter callerParam = onMessageFunction.getParameters().stream()
                .filter(param -> CALLER_PARAM_NAME.equals(param.getName().getValue()))
                .findFirst()
                .orElse(null);

        AcknowledgmentMode mode = AcknowledgmentMode.fromString(ackMode);

        if (mode == AcknowledgmentMode.AUTO_ACKNOWLEDGE) {
            if (callerParam != null) {
                callerParam.setEnabled(false);
            }
        } else {
            if (callerParam != null) {
                callerParam.setEnabled(true);
            } else {
                addCallerParameter(onMessageFunction, CALLER_TYPE, LABEL_SOLACE);
            }
        }
    }

    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        // Get service-level edits from parent
        Map<String, List<TextEdit>> serviceEdits = super.updateModel(context);
        List<TextEdit> allEdits = new ArrayList<>(serviceEdits.get(context.filePath()));

        Service service = context.service();
        ServiceDeclarationNode serviceNode = context.serviceNode();

        // Find and update onMessage function if ack mode changed
        try {
            Function onMessageFunction = service.getFunctions().stream()
                    .filter(func -> ON_MESSAGE_FUNCTION_NAME.equals(func.getName().getValue()))
                    .findFirst()
                    .orElse(null);

            if (onMessageFunction != null) {
                // Extract and apply ack mode from annotation
                String annotationExpr = service.getProperties().get("annotServiceConfig").getValue();
                ExpressionNode exprNode = NodeParser.parseExpression(annotationExpr);
                if (exprNode instanceof MappingConstructorExpressionNode mappingNode) {
                    String ackMode = extractAcknowledgmentMode(mappingNode);
                    if (ackMode != null) {
                        updateCallerParameterForAckMode(onMessageFunction, ackMode);
                    }
                }

                // Find corresponding FunctionDefinitionNode in the service
                FunctionDefinitionNode functionNode = serviceNode.members().stream()
                        .filter(member -> member instanceof FunctionDefinitionNode)
                        .map(member -> (FunctionDefinitionNode) member)
                        .filter(funcNode -> ON_MESSAGE_FUNCTION_NAME.equals(funcNode.functionName().text().trim()))
                        .findFirst()
                        .orElse(null);

                if (functionNode != null) {
                    // Use FunctionBuilderRouter to generate function update edits
                    Map<String, List<TextEdit>> functionEdits = FunctionBuilderRouter.updateFunction(
                            SOLACE, onMessageFunction, context.filePath(), context.document(), functionNode,
                            context.semanticModel(), context.project(), context.workspaceManager());

                    // Add function edits to the service edits
                    if (functionEdits.containsKey(context.filePath())) {
                        allEdits.addAll(functionEdits.get(context.filePath()));
                    }
                }
            }
        } catch (Exception e) {
            // If function update fails, just return service edits
            // This ensures service-level updates still work even if function updates fail
        }

        return Map.of(context.filePath(), allEdits);
    }

    @Override
    public Service getModelFromSource(ModelFromSourceContext context) {
        Service service = super.getModelFromSource(context);
        addDataBindingParam(service, ON_MESSAGE_FUNCTION_NAME, context, PAYLOAD_FIELD_NAME, TYPE_PREFIX);
        return service;
    }

    @Override
    public String kind() {
        return SOLACE;
    }
}
