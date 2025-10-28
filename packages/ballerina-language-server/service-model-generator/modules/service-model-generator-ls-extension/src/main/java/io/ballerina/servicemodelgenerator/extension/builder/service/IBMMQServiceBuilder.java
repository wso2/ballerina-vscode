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

import io.ballerina.projects.BallerinaToml;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import io.ballerina.servicemodelgenerator.extension.util.ListenerUtil;
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
import java.util.Optional;
import java.util.Set;

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_CONFIGURE_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_EXISTING_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_INCLUDED_DEFAULTABLE_FIELD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_INCLUDED_FIELD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_REQUIRED;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.CLOSE_BRACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.COLON;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.IBM_MQ;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.NEW_LINE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ON;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.OPEN_BRACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SERVICE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SPACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.TWO_NEW_LINES;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_FLAG;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.PROPERTY_SESSION_ACK_MODE;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.applyAckModeToOnMessageFunction;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildDestinationChoice;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildListenerChoice;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildServiceAnnotation;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildServiceCodeEdits;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.buildSessionAckModeProperty;
import static io.ballerina.servicemodelgenerator.extension.util.JmsUtil.updateModelWithAckMode;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getProtocol;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getRequiredFunctionsForServiceType;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.FunctionAddContext.TRIGGER_ADD;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.applyEnabledChoiceProperty;

/**
 * Builder class for IBM MQ service.
 *
 * @since 1.2.0
 */
public final class IBMMQServiceBuilder extends AbstractServiceBuilder {

    private static final String PROPERTY_DESTINATION = "destination";
    private static final String TYPE_IBM_MQ_SERVICE_CONFIG = "ibmmq:ServiceConfig";
    private static final String SERVICE_TYPE = "ibmmq:Service";
    private static final String CALLER_TYPE = "ibmmq:Caller";
    private static final String LISTENER_TYPE = "Listener";

    // Display labels
    private static final String LABEL_IBM_MQ = "IBM_MQ";
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
    private static final String DESC_DESTINATION = "The IBM MQ destination to expect messages from.";

    // Formatting strings
    private static final String BOOLEAN_TRUE = "true";
    private static final String EQUALS_SEPARATOR = SPACE + "=" + SPACE;
    private static final String COMMA_SEPARATOR = "," + SPACE;
    private static final String COLON_SEPARATOR = COLON + SPACE;
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
            Value choicesProperty = buildListenerChoice(listenerProps, listeners, LABEL_IBM_MQ);
            properties.put(KEY_CONFIGURE_LISTENER, choicesProperty);
        }

        // Add destination choice (Queue vs Topic)
        Map<String, Value> additionalTopicProps = new LinkedHashMap<>();
        additionalTopicProps.put("shared", new Value.ValueBuilder()
                .metadata("Shared Consumer", "Allow multiple consumers to process messages.")
                .value(false)
                .valueType(VALUE_TYPE_FLAG)
                .setValueTypeConstraint("BOOLEAN")
                .enabled(true)
                .editable(true)
                .optional(true)
                .build());

        Value destinationChoice = buildDestinationChoice(
                "\"DEV.QUEUE.1\"",
                "\"SYSTEM.BASE.TOPIC\"",
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
                additionalTopicProps);
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

        // Build service code
        String serviceCode = buildJMSServiceCode(context, listenerDTO);

        // Build text edits with IBM MQ dependency handling
        return buildServiceCodeEdits(context, serviceCode, this::createIBMMQDependencyEdits);
    }

    private Map<String, List<TextEdit>> addServiceWithNewListener(AddServiceInitModelContext context) {
        ListenerDTO listenerDTO = buildIBMMQListenerDTO(context);
        String serviceCode = buildJMSServiceCode(context, listenerDTO);
        return buildServiceCodeEdits(context, serviceCode, this::createIBMMQDependencyEdits);
    }

    private String buildJMSServiceCode(AddServiceInitModelContext context, ListenerDTO listenerDTO) {
        ServiceInitModel serviceInitModel = context.serviceInitModel();
        Map<String, Value> properties = serviceInitModel.getProperties();

        // Build service annotation
        String serviceAnnotation = buildServiceAnnotation(
                TYPE_IBM_MQ_SERVICE_CONFIG,
                properties,
                (isDurable, isShared) -> isDurable && isShared ? "SHARED_DURABLE"
                        : isDurable ? "DURABLE"
                        : isShared ? "SHARED"
                        : "DEFAULT");

        // Get required functions with conditional onMessage signature
        List<Function> functions = getRequiredFunctionsForServiceType(serviceInitModel);
        applyAckModeToOnMessageFunction(functions, properties, CALLER_TYPE, LABEL_IBM_MQ);
        List<String> functionsStr = buildMethodDefinitions(functions, TRIGGER_ADD, new HashMap<>());

        // Build and return complete service code
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
        // Use JmsUtil to handle ack mode updates for onMessage function
        return updateModelWithAckMode(context, serviceEdits, IBM_MQ, CALLER_TYPE, LABEL_IBM_MQ);
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

        return service;
    }

    @Override
    public String kind() {
        return IBM_MQ;
    }
}
