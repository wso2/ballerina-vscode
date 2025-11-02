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
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import org.eclipse.lsp4j.TextEdit;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.BiFunction;

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_EXISTING_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_CHOICE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_EXPRESSION;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_FLAG;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_FORM;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_SINGLE_SELECT;

/**
 * Utility class for JMS-based service model generation.
 *
 * @since 1.4.0
 */
public final class JmsUtil {

    private static final String EXISTING_LISTENER_CHOICE_DESCRIPTION = "Select from the existing %s listeners";
    private static final String VALUE_TYPE_STRING = "string";
    private static final String CREATE_NEW_LISTENER_CHOICE_DESCRIPTION = "Create a new %s listener";
    private static final String CALLER_PARAM_DESCRIPTION = "%s caller object for message acknowledgment";
    public static final String CALLER_PARAM_NAME = "caller";

    // Constants for acknowledgment mode handling
    public static final String PROPERTY_SESSION_ACK_MODE = "sessionAckMode";
    public static final String ON_MESSAGE_FUNCTION_NAME = "onMessage";
    private static final String LABEL_SESSION_ACK_MODE = "Session Acknowledgment Mode";
    private static final String DESC_SESSION_ACK_MODE = "How messages received should be acknowledged.";

    private static Value buildUseExistingListenerChoice(Set<String> listeners, String moduleName) {
        Map<String, Value> existingListenerProps = new LinkedHashMap<>();
        List<String> items = listeners.stream().toList();
        List<Object> itemsAsObject = listeners.stream().map(item -> (Object) item).toList();
        Value existingListenerOptions = new Value.ValueBuilder()
                .metadata("Select Listener", String.format(EXISTING_LISTENER_CHOICE_DESCRIPTION, moduleName))
                .value(items.getFirst())
                .valueType(VALUE_TYPE_SINGLE_SELECT)
                .setItems(itemsAsObject)
                .enabled(true)
                .editable(true)
                .setAdvanced(false)
                .build();
        existingListenerProps.put(KEY_EXISTING_LISTENER, existingListenerOptions);

        return new Value.ValueBuilder()
                .metadata("Use Existing Listener", "Use Existing Listener")
                .value("true")
                .valueType(VALUE_TYPE_FORM)
                .enabled(false).
                editable(false)
                .setAdvanced(false)
                .setProperties(existingListenerProps)
                .build();
    }

    private static Value buildCreateNewListenerChoice(Map<String, Value> existingListenerProps, String moduleName) {
        return new Value.ValueBuilder()
                .metadata("Create New Listener", String.format(CREATE_NEW_LISTENER_CHOICE_DESCRIPTION, moduleName))
                .value("true")
                .valueType(VALUE_TYPE_FORM)
                .enabled(false)
                .editable(false)
                .setAdvanced(false)
                .setProperties(existingListenerProps)
                .build();
    }

    public static Value buildListenerChoice(Map<String, Value> existingListenerProps, Set<String> listeners,
                                            String moduleName) {
        Value choicesProperty = new Value.ValueBuilder()
                .metadata("Use Existing Listener", "Use Existing Listener or Create New Listener")
                .value(true)
                .valueType(VALUE_TYPE_CHOICE)
                .enabled(true)
                .editable(true)
                .setAdvanced(true)
                .build();

        choicesProperty.setChoices(List.of(buildUseExistingListenerChoice(listeners, moduleName),
                buildCreateNewListenerChoice(existingListenerProps, moduleName)));
        return choicesProperty;

    }

    public static void addCallerParameter(Function onMessageFunction, String callerTypeStr, String moduleName) {
        Value callerType = new Value.ValueBuilder()
                .value(callerTypeStr)
                .valueType(VALUE_TYPE_EXPRESSION)
                .enabled(true)
                .editable(false)
                .build();

        Value callerName = new Value.ValueBuilder()
                .value(CALLER_PARAM_NAME)
                .valueType(VALUE_TYPE_STRING)
                .enabled(true)
                .editable(false)
                .build();

        Parameter callerParameter = new Parameter.Builder()
                .metadata(new MetaData("Caller", String.format(CALLER_PARAM_DESCRIPTION, moduleName)))
                .kind("OPTIONAL")
                .type(callerType)
                .name(callerName)
                .enabled(true)
                .editable(false)
                .optional(true)
                .build();

        onMessageFunction.getParameters().add(1, callerParameter);
    }

    /**
     * Builds a Value property for session acknowledgment mode selection.
     *
     * @return Value configured for session ack mode selection.
     */
    public static Value buildSessionAckModeProperty() {
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

    /**
     * Applies the session acknowledgment mode to the onMessage function.
     *
     * @param functions     List of functions to apply ack mode to.
     * @param properties    Map containing the session ack mode property.
     * @param callerTypeStr The caller type as a string (e.g., "ibmmq:Caller").
     * @param moduleName    The module name for display purposes.
     */
    public static void applyAckModeToOnMessageFunction(List<Function> functions, Map<String, Value> properties,
                                                       String callerTypeStr, String moduleName) {
        Function onMessageFunction = functions.stream()
                .filter(func -> ON_MESSAGE_FUNCTION_NAME.equals(func.getName().getValue()))
                .findFirst()
                .orElse(null);

        if (onMessageFunction == null) {
            return;
        }

        Value sessionAckMode = properties.get(PROPERTY_SESSION_ACK_MODE);
        if (sessionAckMode == null || sessionAckMode.getValue() == null) {
            return;
        }

        String ackMode = sessionAckMode.getValue();
        updateCallerParameterForAckMode(onMessageFunction, ackMode, callerTypeStr, moduleName);
    }

    /**
     * Updates the caller parameter based on acknowledgment mode.
     *
     * @param onMessageFunction The onMessage function to update.
     * @param ackMode           The acknowledgment mode value.
     * @param callerTypeStr     The caller type as a string (e.g., "ibmmq:Caller").
     * @param moduleName        The module name for display purposes.
     */
    public static void updateCallerParameterForAckMode(Function onMessageFunction, String ackMode,
                                                       String callerTypeStr, String moduleName) {
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
                addCallerParameter(onMessageFunction, callerTypeStr, moduleName);
            }
        }
    }

    /**
     * Extracts the acknowledgment mode value from a mapping constructor expression.
     *
     * @param mappingNode The mapping constructor expression node.
     * @return The acknowledgment mode value, or null if not found.
     */
    public static String extractAcknowledgmentMode(MappingConstructorExpressionNode mappingNode) {
        for (MappingFieldNode field : mappingNode.fields()) {
            if (field instanceof SpecificFieldNode specificField) {
                String fieldName = specificField.fieldName().toString().trim();
                if (PROPERTY_SESSION_ACK_MODE.equals(fieldName)) {
                    ExpressionNode valueExpr = specificField.valueExpr().orElse(null);
                    if (valueExpr instanceof BasicLiteralNode literalNode) {
                        return literalNode.literalToken().text().trim();
                    }
                }
            }
        }
        return null;
    }

    /**
     * Updates the service model handling acknowledgment mode changes. This is a generic method for JMS-based services
     * that need to handle ack mode updates.
     *
     * @param context            The update model context.
     * @param parentServiceEdits The edits from the parent class's updateModel method.
     * @param protocolName       The protocol name (e.g., "ibmmq", "solace").
     * @param callerType         The caller type (e.g., "ibmmq:Caller", "solace:Caller").
     * @param moduleName         The module name for display purposes.
     * @return A map of file paths to text edits.
     */
    public static Map<String, List<TextEdit>> updateModelWithAckMode(UpdateModelContext context,
                                                                     Map<String, List<TextEdit>> parentServiceEdits,
                                                                     String protocolName,
                                                                     String callerType,
                                                                     String moduleName) {
        List<TextEdit> allEdits = new ArrayList<>(parentServiceEdits.get(context.filePath()));

        Service service = context.service();
        ServiceDeclarationNode serviceNode = context.serviceNode();

        try {
            Function onMessageFunction = service.getFunctions().stream()
                    .filter(func -> ON_MESSAGE_FUNCTION_NAME.equals(func.getName().getValue()))
                    .findFirst()
                    .orElse(null);

            if (onMessageFunction != null) {
                String annotationExpr = service.getProperties().get("annotServiceConfig").getValue();
                ExpressionNode exprNode = NodeParser.parseExpression(annotationExpr);
                if (exprNode instanceof MappingConstructorExpressionNode mappingNode) {
                    String ackMode = extractAcknowledgmentMode(mappingNode);
                    if (ackMode != null) {
                        updateCallerParameterForAckMode(onMessageFunction, ackMode, callerType, moduleName);
                    }
                }

                FunctionDefinitionNode functionNode = serviceNode.members().stream()
                        .filter(member -> member instanceof FunctionDefinitionNode)
                        .map(member -> (FunctionDefinitionNode) member)
                        .filter(funcNode -> ON_MESSAGE_FUNCTION_NAME.equals(funcNode.functionName().text().trim()))
                        .findFirst()
                        .orElse(null);

                if (functionNode != null) {
                    Map<String, List<TextEdit>> functionEdits = FunctionBuilderRouter.updateFunction(
                            protocolName, onMessageFunction, context.filePath(), context.document(), functionNode,
                            context.semanticModel(), context.project(), context.workspaceManager());

                    if (functionEdits.containsKey(context.filePath())) {
                        allEdits.addAll(functionEdits.get(context.filePath()));
                    }
                }
            }
        } catch (Exception ignored) {
        }

        return Map.of(context.filePath(), allEdits);
    }

    /**
     * Builds a destination choice property for Queue/Topic selection with protocol-specific defaults.
     *
     * @param queueDefaultValue         Default queue name value.
     * @param topicDefaultValue         Default topic name value.
     * @param queueLabel                Label for queue choice.
     * @param topicLabel                Label for topic choice.
     * @param queueNameLabel            Label for queue name field.
     * @param queueNameDesc             Description for queue name field.
     * @param topicNameLabel            Label for topic name field.
     * @param topicNameDesc             Description for topic name field.
     * @param destinationLabel          Label for destination choice.
     * @param destinationDesc           Description for destination choice.
     * @param queueDesc                 Description for queue choice.
     * @param topicDesc                 Description for topic choice.
     * @param additionalTopicProperties Additional properties to add to topic choice (e.g., "shared").
     * @return Value configured for destination choice.
     */
    public static Value buildDestinationChoice(String queueDefaultValue,
                                               String topicDefaultValue,
                                               String queueLabel,
                                               String topicLabel,
                                               String queueNameLabel,
                                               String queueNameDesc,
                                               String topicNameLabel,
                                               String topicNameDesc,
                                               String destinationLabel,
                                               String destinationDesc,
                                               String queueDesc,
                                               String topicDesc,
                                               Map<String, Value> additionalTopicProperties) {
        // Build Queue choice
        Map<String, Value> queueProps = new LinkedHashMap<>();
        queueProps.put("queueName", new Value.ValueBuilder()
                .metadata(queueNameLabel, queueNameDesc)
                .value(queueDefaultValue)
                .valueType(VALUE_TYPE_EXPRESSION)
                .setValueTypeConstraint(VALUE_TYPE_STRING)
                .setPlaceholder("")
                .enabled(true)
                .editable(true)
                .build());

        Value queueChoice = new Value.ValueBuilder()
                .metadata(queueLabel, queueDesc)
                .value("true")
                .valueType(VALUE_TYPE_FORM)
                .enabled(true)
                .editable(false)
                .setProperties(queueProps)
                .build();

        // Build Topic choice
        Map<String, Value> topicProps = new LinkedHashMap<>();
        topicProps.put("topicName", new Value.ValueBuilder()
                .metadata(topicNameLabel, topicNameDesc)
                .value(topicDefaultValue)
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
                .metadata("Durable Subscriber", "Persist subscription when disconnected.")
                .value(false)
                .valueType(VALUE_TYPE_FLAG)
                .setValueTypeConstraint("BOOLEAN")
                .enabled(true)
                .editable(true)
                .optional(true)
                .build());

        // Add any additional topic properties (e.g., "shared" for IBMMQ)
        if (additionalTopicProperties != null) {
            topicProps.putAll(additionalTopicProperties);
        }

        Value topicChoice = new Value.ValueBuilder()
                .metadata(topicLabel, topicDesc)
                .value("true")
                .valueType(VALUE_TYPE_FORM)
                .enabled(false)
                .editable(false)
                .setProperties(topicProps)
                .build();

        // Build main choice property
        Value destinationChoice = new Value.ValueBuilder()
                .metadata(destinationLabel, destinationDesc)
                .value(0)
                .valueType(VALUE_TYPE_CHOICE)
                .enabled(true)
                .editable(true)
                .build();
        destinationChoice.setChoices(List.of(queueChoice, topicChoice));

        return destinationChoice;
    }

    /**
     * Builds a service annotation string for JMS-based services.
     *
     * @param serviceConfigType    The service config type annotation (e.g., "@ibmmq:ServiceConfig").
     * @param properties           The service properties containing queue/topic configuration.
     * @param consumerTypeResolver Function that determines consumer type based on durable/shared flags. Input: Boolean
     *                             array [isDurable, isShared], Output: consumer type string.
     * @return The formatted service annotation string.
     */
    public static String buildServiceAnnotation(String serviceConfigType,
                                                Map<String, Value> properties,
                                                BiFunction<Boolean, Boolean, String> consumerTypeResolver) {
        StringBuilder annotation = new StringBuilder();
        List<String> configParams = new ArrayList<>();
        String colonSeparator = ": ";
        String commaSeparator = ", ";

        annotation.append("@").append(serviceConfigType).append(" {").append("\n");

        if (properties.containsKey("queueName")) {
            Value queueName = properties.get("queueName");
            if (queueName != null && queueName.getValue() != null) {
                configParams.add("queueName: " + queueName.getValue());
            }
        } else if (properties.containsKey("topicName")) {
            Value topicName = properties.get("topicName");
            if (topicName != null && topicName.getValue() != null) {
                configParams.add("topicName: " + topicName.getValue());
            }

            Value subscriberName = properties.get("subscriberName");
            if (subscriberName != null && subscriberName.getValue() != null && !subscriberName.getValue().isBlank()) {
                configParams.add("subscriberName" + colonSeparator + subscriberName.getValue());
            }

            Value durableProp = properties.get("durable");
            Value sharedProp = properties.get("shared");

            boolean isDurable = durableProp != null && Boolean.parseBoolean(durableProp.getValue());
            boolean isShared = sharedProp != null && Boolean.parseBoolean(sharedProp.getValue());

            String consumerType = consumerTypeResolver.apply(isDurable, isShared);
            configParams.add("consumerType" + colonSeparator + "\"" + consumerType + "\"");
        }

        // Add session acknowledgment mode
        Value sessionAckMode = properties.get(PROPERTY_SESSION_ACK_MODE);
        if (sessionAckMode != null && Objects.nonNull(sessionAckMode.getValue())) {
            AcknowledgmentMode mode = AcknowledgmentMode.fromString(sessionAckMode.getValue());
            configParams.add(PROPERTY_SESSION_ACK_MODE + colonSeparator + mode.getQuotedValue());
        }

        annotation.append(String.join(commaSeparator, configParams));
        annotation.append("}").append("\n");
        return annotation.toString();
    }

    /**
     * Builds text edits for service initialization source with imports and optional additional edits. This method
     * handles the common logic for adding service code, managing imports, and merging any protocol-specific dependency
     * edits (e.g., IBM MQ platform dependencies).
     *
     * @param context                 The service initialization context containing the document and file path.
     * @param serviceCode             The complete service code string to be added.
     * @param additionalEditsProvider Function that provides protocol-specific edits (e.g., dependency edits). Pass null
     *                                or a function returning empty map for protocols without additional edits.
     * @return A map of file paths to their corresponding text edits.
     */
    public static Map<String, List<TextEdit>> buildServiceCodeEdits(
            AddServiceInitModelContext context,
            String serviceCode,
            java.util.function.Function<AddServiceInitModelContext, Map<String, List<TextEdit>>> additionalEditsProvider) {
        ServiceInitModel serviceInitModel = context.serviceInitModel();
        ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();

        Map<String, List<TextEdit>> allEdits = new HashMap<>();
        List<TextEdit> edits = new ArrayList<>();

        // Add import if not already present
        if (!Utils.importExists(modulePartNode, serviceInitModel.getOrgName(), serviceInitModel.getModuleName())) {
            String importText = Utils.getImportStmt(serviceInitModel.getOrgName(), serviceInitModel.getModuleName());
            edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().startLine()), importText));
        }

        // Add service code
        edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().endLine()), serviceCode));
        allEdits.put(context.filePath(), edits);

        // Merge any additional protocol-specific edits (e.g., dependency edits for IBMMQ)
        if (additionalEditsProvider != null) {
            Map<String, List<TextEdit>> additionalEdits = additionalEditsProvider.apply(context);
            additionalEdits.forEach(
                    (filePath, textEdits) -> allEdits.merge(filePath, textEdits, (existing, additional) -> {
                        existing.addAll(additional);
                        return existing;
                    }));
        }

        return allEdits;
    }

    /**
     * Acknowledgment mode enum for JMS sessions.
     */
    public enum AcknowledgmentMode {
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

}
