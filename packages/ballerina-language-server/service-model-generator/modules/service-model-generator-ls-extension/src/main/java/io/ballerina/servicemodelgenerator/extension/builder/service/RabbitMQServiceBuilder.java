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

import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.util.ListenerUtil;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_CONFIGURE_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_EXISTING_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.RABBITMQ;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_CHOICE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_FORM;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_SINGLE_SELECT;

/**
 * Builder class for RabbitMQ service.
 *
 * @since 1.2.0
 */
public final class RabbitMQServiceBuilder extends AbstractServiceBuilder {

    private static final String ON_MESSAGE = "onMessage";
    private static final String ON_REQUEST = "onRequest";

    @Override
    public Service getModelFromSource(ModelFromSourceContext context) {
        Service service = super.getModelFromSource(context);
        filterRabbitMqFunctions(service.getFunctions());
        return service;
    }

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        ServiceInitModel serviceInitModel = super.getServiceInitModel(context);
        Set<String> listeners = ListenerUtil.getCompatibleListeners(context.moduleName(),
                context.semanticModel(), context.project());
        if (!listeners.isEmpty()) {
            Value listenerVarNameProperty = serviceInitModel.getProperties().remove(KEY_LISTENER_VAR_NAME);

            Value createNewListenerChoice = buildCreateNewListenerChoice(listenerVarNameProperty);
            Value useExistingListenerChoice = buildUseExistingListenerChoice(listeners);

            Value choicesProperty = new Value.ValueBuilder()
                    .metadata("Configure Listener", "Configure the RabbitMQ listener")
                    .value("")
                    .valueType(VALUE_TYPE_CHOICE)
                    .enabled(true)
                    .editable(true)
                    .setAdvanced(true)
                    .build();
            choicesProperty.setChoices(List.of(createNewListenerChoice, useExistingListenerChoice));
            serviceInitModel.getProperties().put(KEY_CONFIGURE_LISTENER, choicesProperty);
        }
        return serviceInitModel;
    }

    private Value buildCreateNewListenerChoice(Value listenerVarNameProperty) {
        Map<String, Value> newListenerProps = new LinkedHashMap<>();
        newListenerProps.put(KEY_LISTENER_VAR_NAME, listenerVarNameProperty);
        return new Value.ValueBuilder()
                .metadata("Create New Listener", "Create a new RabbitMQ listener")
                .value("true")
                .valueType(VALUE_TYPE_FORM)
                .enabled(true)
                .editable(false)
                .setAdvanced(false)
                .setProperties(newListenerProps)
                .build();
    }

    private Value buildUseExistingListenerChoice(Set<String> listeners) {
        Map<String, Value> existingListenerProps = new LinkedHashMap<>();
        Value existingListenerOptions = new Value.ValueBuilder()
                .metadata("Select Listener", "Select from the existing RabbitMQ listeners")
                .value("")
                .valueType(VALUE_TYPE_SINGLE_SELECT)
                .setItems(Collections.singletonList(listeners.stream().toList()))
                .enabled(true)
                .editable(true)
                .setAdvanced(false)
                .build();
        existingListenerProps.put(KEY_EXISTING_LISTENER, existingListenerOptions);

        return new Value.ValueBuilder()
                .metadata("Use Existing Listener", "Use Existing Listener")
                .value("true")
                .valueType(VALUE_TYPE_FORM)
                .enabled(false)
                .editable(false)
                .setAdvanced(false)
                .setProperties(existingListenerProps)
                .build();
    }

    /**
     * Filters the RabbitMQ service functions to ensure that only one of `onMessage` or `onRequest` is present.
     * If both are present, it retains the enabled one and removes the other.
     *
     * @param functions List of functions in the RabbitMQ service
     */
    private static void filterRabbitMqFunctions(List<Function> functions) {
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
        } else if (hasOnRequest) {
            functions.remove(onMessageIndex);
        }
    }

    @Override
    public String kind() {
        return RABBITMQ;
    }
}

