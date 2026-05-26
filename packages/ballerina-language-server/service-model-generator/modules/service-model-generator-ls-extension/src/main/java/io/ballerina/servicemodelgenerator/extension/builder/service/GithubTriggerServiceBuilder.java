/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
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
import io.ballerina.openapi.core.generators.common.exception.BallerinaOpenApiException;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import org.ballerinalang.formatter.core.FormatterException;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getProtocol;

/**
 * Builder class for GitHub trigger service.
 * Exposes a flat {@code webhookSecret} field instead of the full {@code ListenerConfig} record,
 * and reconstructs the nested record during code generation.
 *
 * @since 1.8.0
 */
public class GithubTriggerServiceBuilder extends AbstractServiceBuilder {

    private static final String GITHUB_TRIGGER_INIT_JSON = "services/github_trigger_init.json";

    @Override
    public String kind() {
        return "trigger.github";
    }

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        InputStream resourceStream = GithubTriggerServiceBuilder.class.getClassLoader()
                .getResourceAsStream(GITHUB_TRIGGER_INIT_JSON);
        if (resourceStream == null) {
            return null;
        }

        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            ServiceInitModel serviceInitModel = new Gson().fromJson(reader, ServiceInitModel.class);
            Value listenerNameProp = listenerNameProperty(context);
            serviceInitModel.getProperties().get(KEY_LISTENER_VAR_NAME).setValue(listenerNameProp.getValue());
            return serviceInitModel;
        } catch (IOException e) {
            return null;
        }
    }

    @Override
    public Map<String, List<TextEdit>> addServiceInitSource(AddServiceInitModelContext context)
            throws WorkspaceDocumentException, FormatterException, IOException, BallerinaOpenApiException,
            EventSyncException {
        ServiceInitModel serviceInitModel = context.serviceInitModel();
        Map<String, Value> properties = serviceInitModel.getProperties();

        String listenerVarName = properties.get(KEY_LISTENER_VAR_NAME).getValue();
        String webhookSecret = getPropertyValue(properties, "webhookSecret");
        String listenOn = getPropertyValue(properties, "listenOn");

        StringBuilder listenerBuilder = new StringBuilder();
        listenerBuilder.append("listener github:Listener ").append(listenerVarName).append(" = new (");

        boolean hasListenerConfig = !webhookSecret.isEmpty();
        boolean hasListenOn = !listenOn.isEmpty();

        if (hasListenerConfig) {
            listenerBuilder.append("listenerConfig = { webhookSecret: ").append(webhookSecret).append(" }");
            if (hasListenOn) {
                listenerBuilder.append(", ");
            }
        }

        if (hasListenOn) {
            listenerBuilder.append("listenOn = ").append(listenOn);
        }

        listenerBuilder.append(");");

        String listenerProtocol = getProtocol(serviceInitModel.getModuleName());
        ListenerDTO listenerDTO = new ListenerDTO(listenerProtocol, listenerVarName, listenerBuilder.toString());
        return getServiceDeclarationEdits(context, listenerDTO);
    }

    private String getPropertyValue(Map<String, Value> properties, String key) {
        Value property = properties.get(key);
        if (property != null && property.getValue() != null && !property.getValue().isEmpty()) {
            return property.getValue();
        }
        return "";
    }
}
