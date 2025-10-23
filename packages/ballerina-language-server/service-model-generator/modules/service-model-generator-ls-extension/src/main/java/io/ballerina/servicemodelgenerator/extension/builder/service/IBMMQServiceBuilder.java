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
import io.ballerina.projects.BallerinaToml;
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
import io.ballerina.toml.semantic.ast.TomlKeyValueNode;
import io.ballerina.toml.semantic.ast.TomlTableArrayNode;
import io.ballerina.toml.semantic.ast.TomlTableNode;
import io.ballerina.toml.semantic.ast.TopLevelNode;
import org.ballerinalang.langserver.common.utils.PositionUtil;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
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
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SPACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.TWO_NEW_LINES;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_CHOICE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_EXPRESSION;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_FLAG;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_FORM;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_SINGLE_SELECT;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_STRING;
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
 * Builder class for IBM MQ service.
 *
 * @since 1.2.0
 */
public final class IBMMQServiceBuilder extends AbstractServiceBuilder {

    private static final String IBM_MQ = "IBM_MQ";
    private static final String PROPERTY_DESTINATION = "destination";
    private static final String PROPERTY_SESSION_ACK_MODE = "sessionAckMode";
    private static final String PROPERTY_QUEUE_NAME = "queueName";
    private static final String PROPERTY_TOPIC_NAME = "topicName";
    private static final String TYPE_IBM_MQ_SERVICE_CONFIG = "ibmmq:ServiceConfig";
    private static final String SERVICE_TYPE = "ibmmq:Service";
    private static final String CALLER_TYPE = "ibmmq:Caller";
    private static final String LISTENER_TYPE = "Listener";

    // Display labels
    private static final String LABEL_QUEUE = "Queue";
    private static final String LABEL_TOPIC = "Topic";
    private static final String LABEL_QUEUE_NAME = "Queue Name";
    private static final String LABEL_TOPIC_NAME = "Topic Name";
    private static final String LABEL_SESSION_ACK_MODE = "Session Ack Mode";
    private static final String LABEL_DESTINATION = "Destination";

    // Descriptions
    private static final String DESC_QUEUE = "Listen to messages from a queue";
    private static final String DESC_TOPIC = "Listen to messages from a topic";
    private static final String DESC_QUEUE_NAME = "Queue to listen for incoming messages.";
    private static final String DESC_TOPIC_NAME = "Topic to listen for incoming messages.";
    private static final String DESC_SESSION_ACK_MODE = "How messages received should be acknowledged.";
    private static final String DESC_DESTINATION = "The IBM MQ destination to expect messages from.";

    /**
     * Acknowledgment mode enum for IBM MQ sessions.
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

    // IBM MQ Platform dependency constants
    private static final String IBM_MQ_CLIENT_GROUP_ID = "com.ibm.mq";
    private static final String IBM_MQ_CLIENT_ARTIFACT_ID = "com.ibm.mq.allclient";
    private static final String IBM_MQ_CLIENT_VERSION = "9.4.1.0";
    private static final String PLATFORM_JAVA21_DEPENDENCY = "platform.java21.dependency";

    // Listener configuration property keys
    private static final String[] LISTENER_CONFIG_KEYS = {
            KEY_LISTENER_VAR_NAME, "name", "host", "port", "channel"
    };

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        ServiceInitModel serviceInitModel = super.getServiceInitModel(context);
        if (serviceInitModel == null) {
            return null;
        }

        Map<String, Value> properties = serviceInitModel.getProperties();

        // Check for existing IBM MQ listeners
        Set<String> listeners = ListenerUtil.getCompatibleListeners(context.moduleName(),
                context.semanticModel(), context.project());

        if (!listeners.isEmpty()) {
            Map<String, Value> listenerProps = new LinkedHashMap<>();
            for (String key : LISTENER_CONFIG_KEYS) {
                listenerProps.put(key, properties.remove(key));
            }
            Value choicesProperty = buildListenerChoice(listenerProps, listeners, IBM_MQ);
            properties.put(KEY_CONFIGURE_LISTENER, choicesProperty);
        }

        // Add destination choice (Queue vs Topic)
        Value destinationChoice = buildDestinationChoice();
        properties.put(PROPERTY_DESTINATION, destinationChoice);

        // Add session acknowledgment mode dropdown
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
            listenerDTO = new ListenerDTO(IBM_MQ, properties.get(KEY_EXISTING_LISTENER).getValue(), "");
        } else {
            listenerDTO = buildIBMMQListenerDTO(context);
        }

        // Build service annotation
        String serviceAnnotation = buildServiceAnnotation(properties);

        // Get required functions with conditional onMessage signature
        List<Function> functions = getRequiredFunctionsForServiceType(serviceInitModel);
        applyAckModeToOnMessageFunction(functions, properties);
        List<String> functionsStr = buildMethodDefinitions(functions, TRIGGER_ADD, new HashMap<>());

        // Build complete service
        ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();
        StringBuilder builder = new StringBuilder(NEW_LINE)
                .append(listenerDTO.listenerDeclaration())
                .append(NEW_LINE)
                .append(serviceAnnotation)
                .append(SERVICE).append(SPACE).append(SERVICE_TYPE).append(SPACE)
                .append(ON).append(SPACE).append(listenerDTO.listenerVarName()).append(SPACE)
                .append(OPEN_BRACE)
                .append(NEW_LINE)
                .append(String.join(TWO_NEW_LINES, functionsStr)).append(NEW_LINE)
                .append(CLOSE_BRACE).append(NEW_LINE);

        Map<String, List<TextEdit>> allEdits = new HashMap<>();
        List<TextEdit> edits = new ArrayList<>();

        if (!importExists(modulePartNode, serviceInitModel.getOrgName(), serviceInitModel.getModuleName())) {
            String importText = getImportStmt(serviceInitModel.getOrgName(), serviceInitModel.getModuleName());
            edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().startLine()), importText));
        }
        edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().endLine()), builder.toString()));

        allEdits.put(context.filePath(), edits);

        // Check and add/update IBM MQ platform dependency if needed
        Map<String, List<TextEdit>> dependencyEdits = createIBMMQDependencyEdits(context);
        dependencyEdits.forEach((filePath, textEdits) -> {
            allEdits.merge(filePath, textEdits, (existing, additional) -> {
                existing.addAll(additional);
                return existing;
            });
        });

        return allEdits;
    }

    private Map<String, List<TextEdit>> addServiceWithNewListener(AddServiceInitModelContext context) {
        ServiceInitModel serviceInitModel = context.serviceInitModel();
        Map<String, Value> properties = serviceInitModel.getProperties();

        ListenerDTO listenerDTO = buildIBMMQListenerDTO(context);

        // Build service annotation
        String serviceAnnotation = buildServiceAnnotation(properties);

        // Get required functions with conditional onMessage signature
        List<Function> functions = getRequiredFunctionsForServiceType(serviceInitModel);
        applyAckModeToOnMessageFunction(functions, properties);
        List<String> functionsStr = buildMethodDefinitions(functions, TRIGGER_ADD, new HashMap<>());

        // Build complete service
        ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();
        StringBuilder builder = new StringBuilder(NEW_LINE)
                .append(listenerDTO.listenerDeclaration())
                .append(NEW_LINE)
                .append(serviceAnnotation)
                .append(SERVICE).append(SPACE).append(SERVICE_TYPE).append(SPACE)
                .append(ON).append(SPACE).append(listenerDTO.listenerVarName()).append(SPACE)
                .append(OPEN_BRACE)
                .append(NEW_LINE)
                .append(String.join(TWO_NEW_LINES, functionsStr)).append(NEW_LINE)
                .append(CLOSE_BRACE).append(NEW_LINE);

        Map<String, List<TextEdit>> allEdits = new HashMap<>();
        List<TextEdit> edits = new ArrayList<>();

        if (!importExists(modulePartNode, serviceInitModel.getOrgName(), serviceInitModel.getModuleName())) {
            String importText = getImportStmt(serviceInitModel.getOrgName(), serviceInitModel.getModuleName());
            edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().startLine()), importText));
        }
        edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().endLine()), builder.toString()));

        allEdits.put(context.filePath(), edits);

        // Check and add/update IBM MQ platform dependency if needed
        Map<String, List<TextEdit>> dependencyEdits = createIBMMQDependencyEdits(context);
        dependencyEdits.forEach((filePath, textEdits) -> {
            allEdits.merge(filePath, textEdits, (existing, additional) -> {
                existing.addAll(additional);
                return existing;
            });
        });

        return allEdits;
    }

    private Value buildDestinationChoice() {
        // Build Queue choice
        Map<String, Value> queueProps = new LinkedHashMap<>();
        queueProps.put(PROPERTY_QUEUE_NAME, new Value.ValueBuilder()
                .metadata(LABEL_QUEUE_NAME, DESC_QUEUE_NAME)
                .value("\"DEV.QUEUE.1\"")
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
                .value("\"SYSTEM.BASE.TOPIC\"")
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

        List<Object> consumerTypeOptions = List.of(
                "Durable",
                "Shared"
        );

        topicProps.put("durable", new Value.ValueBuilder()
                .metadata("Durable Subscriber", "Persist subscription when disconnected.")
                .value(false)
                .valueType(VALUE_TYPE_FLAG)
                .setValueTypeConstraint("BOOLEAN")
                .enabled(true)
                .editable(true)
                .optional(true)
                .build());

        topicProps.put("shared", new Value.ValueBuilder()
                .metadata("Shared Consumer", "Allow multiple consumers to process messages.")
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

    private static ListenerDTO buildIBMMQListenerDTO(AddServiceInitModelContext context) {
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

        String listenerProtocol = getProtocol(IBM_MQ);
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

        annotation.append(AT).append(TYPE_IBM_MQ_SERVICE_CONFIG).append(OPEN_BRACE).append(NEW_LINE);

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
            Value sharedProp = properties.get("shared");

            boolean isDurable = durableProp != null && Boolean.parseBoolean(durableProp.getValue());
            boolean isShared = sharedProp != null && Boolean.parseBoolean(sharedProp.getValue());

            if (isDurable && isShared) {
                configParams.add("consumerType" + COLON_SEPARATOR + "\"SHARED_DURABLE\"");
            } else if (isDurable) {
                configParams.add("consumerType" + COLON_SEPARATOR + "\"DURABLE\"");
            } else if (isShared) {
                configParams.add("consumerType" + COLON_SEPARATOR + "\"SHARED\"");
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

    private String extractFieldValue(MappingConstructorExpressionNode mappingNode, String fieldName) {
        // Parse the mapping constructor to find the specified field
        for (MappingFieldNode field : mappingNode.fields()) {
            if (field instanceof SpecificFieldNode specificField) {
                // Get the field name
                String currentFieldName = specificField.fieldName().toString().trim();

                // Check if this is the field we're looking for
                if (fieldName.equals(currentFieldName)) {
                    // Get the field value
                    ExpressionNode valueExpr = specificField.valueExpr().orElse(null);
                    if (valueExpr instanceof BasicLiteralNode literalNode) {
                        return literalNode.literalToken().text().trim().replace("\"", "");
                    }
                }
            }
        }
        return null; // Return null if field not found
    }

    private void extractDestinationFromAnnotation(Service service) {
        Map<String, Value> properties = service.getProperties();
        Map<String, Value> readonlyProperties = service.getReadonlyProperties();

        // Get the annotation configuration from properties
        Value annotServiceConfig = properties.get("annotServiceConfig");
        if (annotServiceConfig == null || annotServiceConfig.getValue() == null) {
            return;
        }

        // Parse the annotation expression
        String annotationExpr = annotServiceConfig.getValue();
        ExpressionNode exprNode = NodeParser.parseExpression(annotationExpr);
        if (!(exprNode instanceof MappingConstructorExpressionNode mappingNode)) {
            return;
        }

        // Extract queue name first, then topic name if queue name not found
        String queueName = extractFieldValue(mappingNode, PROPERTY_QUEUE_NAME);
        if (queueName != null) {
            // Create a new readonly property for the queue name
            Value queueNameProperty = new Value.ValueBuilder()
                    .metadata(LABEL_QUEUE_NAME, DESC_QUEUE_NAME)
                    .value(queueName)
                    .valueType(VALUE_TYPE_EXPRESSION)
                    .setValueTypeConstraint(VALUE_TYPE_STRING)
                    .enabled(true)
                    .editable(false)
                    .build();

            // Add the queue name as a readonly property
            readonlyProperties.put(PROPERTY_QUEUE_NAME, queueNameProperty);
        } else {
            // Try to extract topic name if queue name not found
            String topicName = extractFieldValue(mappingNode, PROPERTY_TOPIC_NAME);
            if (topicName != null) {
                // Create a new readonly property for the topic name
                Value topicNameProperty = new Value.ValueBuilder()
                        .metadata(LABEL_TOPIC_NAME, DESC_TOPIC_NAME)
                        .value(topicName)
                        .valueType(VALUE_TYPE_EXPRESSION)
                        .setValueTypeConstraint(VALUE_TYPE_STRING)
                        .enabled(true)
                        .editable(false)
                        .build();

                // Add the topic name as a readonly property
                readonlyProperties.put(PROPERTY_TOPIC_NAME, topicNameProperty);

                // Extract and add subscriber name if present
                String subscriberName = extractFieldValue(mappingNode, "subscriberName");
                if (subscriberName != null && !subscriberName.isEmpty()) {
                    Value subscriberNameProperty = new Value.ValueBuilder()
                            .metadata("Subscriber Name", "The name to be used for the subscription.")
                            .value(subscriberName)
                            .valueType(VALUE_TYPE_EXPRESSION)
                            .setValueTypeConstraint(VALUE_TYPE_STRING)
                            .enabled(true)
                            .editable(false)
                            .build();
                    readonlyProperties.put("subscriberName", subscriberNameProperty);
                }
            }
        }

        // Extract and add session acknowledgment mode as readonly property
        String ackMode = extractAcknowledgmentMode(mappingNode);
        if (ackMode != null) {
            Value ackModeProperty = new Value.ValueBuilder()
                    .metadata(LABEL_SESSION_ACK_MODE, DESC_SESSION_ACK_MODE)
                    .value(ackMode.replace("\"", ""))
                    .valueType(VALUE_TYPE_EXPRESSION)
                    .setValueTypeConstraint(VALUE_TYPE_STRING)
                    .enabled(true)
                    .editable(false)
                    .build();

            readonlyProperties.put(PROPERTY_SESSION_ACK_MODE, ackModeProperty);
        }
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
                addCallerParameter(onMessageFunction, CALLER_TYPE, IBM_MQ);
            }
        }
    }

    private DependencyCheckResult checkIBMMQDependency(AddServiceInitModelContext context) {
        Optional<BallerinaToml> ballerinaToml = context.project().currentPackage().ballerinaToml();
        if (ballerinaToml.isEmpty()) {
            return new DependencyCheckResult(false, false, null);
        }

        TomlTableNode tomlTableNode = ballerinaToml.get().tomlAstNode();
        TopLevelNode platformNode = tomlTableNode.entries().get("platform");
        if (!(platformNode instanceof TomlTableNode platformTable)) {
            return new DependencyCheckResult(false, false, null);
        }

        TopLevelNode java21Node = platformTable.entries().get("java21");
        if (!(java21Node instanceof TomlTableNode java21Table)) {
            return new DependencyCheckResult(false, false, null);
        }

        TopLevelNode dependencyNode = java21Table.entries().get("dependency");
        if (!(dependencyNode instanceof TomlTableArrayNode dependencyArray)) {
            return new DependencyCheckResult(false, false, null);
        }

        // Check if IBM MQ dependency already exists
        for (TomlTableNode dependencyTable : dependencyArray.children()) {
            TomlKeyValueNode groupIdNode = (TomlKeyValueNode) dependencyTable.entries().get("groupId");
            TomlKeyValueNode artifactIdNode = (TomlKeyValueNode) dependencyTable.entries().get("artifactId");
            TomlKeyValueNode versionNode = (TomlKeyValueNode) dependencyTable.entries().get("version");

            if (groupIdNode != null && artifactIdNode != null && versionNode != null) {
                String groupId = groupIdNode.value().toNativeValue().toString().replace("\"", "");
                String artifactId = artifactIdNode.value().toNativeValue().toString().replace("\"", "");
                String version = versionNode.value().toNativeValue().toString().replace("\"", "");

                if (IBM_MQ_CLIENT_GROUP_ID.equals(groupId) && IBM_MQ_CLIENT_ARTIFACT_ID.equals(artifactId)) {
                    boolean correctVersion = IBM_MQ_CLIENT_VERSION.equals(version);
                    return new DependencyCheckResult(true, correctVersion, versionNode);
                }
            }
        }
        return new DependencyCheckResult(false, false, null);
    }

    private Map<String, List<TextEdit>> createIBMMQDependencyEdits(AddServiceInitModelContext context) {
        Path tomlPath = context.project().sourceRoot().resolve("Ballerina.toml");
        Optional<BallerinaToml> ballerinaToml = context.project().currentPackage().ballerinaToml();

        if (ballerinaToml.isEmpty()) {
            return Map.of();
        }

        DependencyCheckResult checkResult = checkIBMMQDependency(context);

        if (checkResult.exists && !checkResult.correctVersion && checkResult.versionNode != null) {
            // Update only the version field
            TextEdit versionEdit = new TextEdit(
                    PositionUtil.toRange(checkResult.versionNode.location().lineRange()),
                    "version = \"" + IBM_MQ_CLIENT_VERSION + "\""
            );
            return Map.of(tomlPath.toString(), List.of(versionEdit));
        } else if (!checkResult.exists) {
            // Add the full dependency
            TomlTableNode tomlTableNode = ballerinaToml.get().tomlAstNode();
            String dependencyText = String.format(
                    "%s%s[[%s]]%sgroupId = \"%s\"%sartifactId = \"%s\"%sversion = \"%s\"%s",
                    NEW_LINE,
                    NEW_LINE,
                    PLATFORM_JAVA21_DEPENDENCY,
                    NEW_LINE,
                    IBM_MQ_CLIENT_GROUP_ID,
                    NEW_LINE,
                    IBM_MQ_CLIENT_ARTIFACT_ID,
                    NEW_LINE,
                    IBM_MQ_CLIENT_VERSION,
                    NEW_LINE
            );

            TextEdit edit = new TextEdit(
                    PositionUtil.toRange(tomlTableNode.location().lineRange().endLine()),
                    dependencyText
            );
            return Map.of(tomlPath.toString(), List.of(edit));
        }

        // Dependency exists with correct version, no edits needed
        return Map.of();
    }

    private record DependencyCheckResult(boolean exists, boolean correctVersion, TomlKeyValueNode versionNode) { }

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
                            IBM_MQ, onMessageFunction, context.filePath(), context.document(), functionNode,
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

        // Find onError function and set it as optional and editable
        service.getFunctions().stream()
                .filter(func -> "onError".equals(func.getName().getValue()))
                .findFirst().ifPresent(onErrorFunction -> {
                    onErrorFunction.setOptional(true);
                });

        // Extract destination from annotation and add as readonly property
        extractDestinationFromAnnotation(service);
        return service;
    }

    @Override
    public String kind() {
        return IBM_MQ;
    }
}
