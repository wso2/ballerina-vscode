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

import io.ballerina.openapi.core.generators.common.exception.BallerinaOpenApiException;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.PropertyType;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.util.ListenerUtil;
import org.ballerinalang.formatter.core.FormatterException;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_CONFIGURE_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_EXISTING_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.PROPERTY_BASE_PATH;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.RABBITMQ;
import static io.ballerina.servicemodelgenerator.extension.util.DatabindUtil.addDataBindingParam;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.applyEnabledChoiceProperty;

/**
 * Builder class for RabbitMQ service.
 *
 * @since 1.2.0
 */
public final class RabbitMQServiceBuilder extends AbstractServiceBuilder {

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
    public Map<String, List<TextEdit>> addServiceInitSource(AddServiceInitModelContext context)
            throws WorkspaceDocumentException, FormatterException, IOException, BallerinaOpenApiException,
            EventSyncException {
        Map<String, Value> properties = context.serviceInitModel().getProperties();
        if (!properties.containsKey(KEY_CONFIGURE_LISTENER)) {
            return super.addServiceInitSource(context);
        }
        applyEnabledChoiceProperty(context.serviceInitModel(), KEY_CONFIGURE_LISTENER);
        ListenerDTO listenerDTO;
        if (properties.containsKey(KEY_EXISTING_LISTENER)) {
            listenerDTO = new ListenerDTO(RABBITMQ, properties.get(KEY_EXISTING_LISTENER).getValue(), "");
        } else {
            listenerDTO = buildListenerDTO(context);
        }
        return getServiceDeclarationEdits(context, listenerDTO);
    }

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        ServiceInitModel serviceInitModel = super.getServiceInitModel(context);
        Set<String> listeners = ListenerUtil.getCompatibleListeners(context.moduleName(),
                context.semanticModel(), context.project());
        if (!listeners.isEmpty()) {
            Map<String, Value> properties = serviceInitModel.getProperties();
            Value listenerVarNameProperty = properties.remove(KEY_LISTENER_VAR_NAME);
            Value host = properties.remove("host");
            Value port = properties.remove("port");
            Value basePath = properties.remove("basePath");
            Value createNewListenerChoice = buildCreateNewListenerChoice(listenerVarNameProperty, host, port);
            Value useExistingListenerChoice = buildUseExistingListenerChoice(listeners);

            Value choicesProperty = new Value.ValueBuilder()
                    .metadata("Use Existing Listener", "Use Existing Listener or Create New Listener")
                    .value(true)
                    .types(List.of(PropertyType.types(Value.FieldType.CHOICE)))
                    .enabled(true)
                    .editable(true)
                    .setAdvanced(true)
                    .build();
            choicesProperty.setChoices(List.of(useExistingListenerChoice, createNewListenerChoice));
            properties.put(KEY_CONFIGURE_LISTENER, choicesProperty);
            properties.put(PROPERTY_BASE_PATH, basePath);
        }
        return serviceInitModel;
    }

    private Value buildCreateNewListenerChoice(Value listenerVarNameProperty, Value host, Value port) {
        Map<String, Value> newListenerProps = new LinkedHashMap<>();
        newListenerProps.put("host", host);
        newListenerProps.put("port", port);
        newListenerProps.put(KEY_LISTENER_VAR_NAME, listenerVarNameProperty);
        return new Value.ValueBuilder()
                .metadata("Create New Listener", "Create a new RabbitMQ listener")
                .value("true")
                .types(List.of(PropertyType.types(Value.FieldType.FORM)))
                .enabled(false)
                .editable(false)
                .setAdvanced(false)
                .setProperties(newListenerProps)
                .build();
    }

    private Value buildUseExistingListenerChoice(Set<String> listeners) {
        Map<String, Value> existingListenerProps = new LinkedHashMap<>();
        List<String> items = listeners.stream().toList();
        List<Object> itemsAsObject = listeners.stream().map(item -> (Object) item).toList();
        Value existingListenerOptions = new Value.ValueBuilder()
                .metadata("Select Listener", "Select from the existing RabbitMQ listeners")
                .value(items.getFirst())
                .types(List.of(PropertyType.types(Value.FieldType.SINGLE_SELECT, itemsAsObject)))
                .enabled(true)
                .editable(true)
                .setAdvanced(false)
                .build();
        existingListenerProps.put(KEY_EXISTING_LISTENER, existingListenerOptions);

        return new Value.ValueBuilder()
                .metadata("Use Existing Listener", "Use Existing Listener")
                .value("true")
                .types(List.of(PropertyType.types(Value.FieldType.FORM)))
                .enabled(false)
                .editable(false)
                .setAdvanced(false)
                .setProperties(existingListenerProps)
                .build();
    }

    @Override
    public String kind() {
        return RABBITMQ;
    }
}

