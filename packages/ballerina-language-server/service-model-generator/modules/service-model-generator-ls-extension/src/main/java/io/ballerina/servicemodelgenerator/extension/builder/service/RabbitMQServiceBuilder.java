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
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;

import java.util.List;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.RABBITMQ;

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

