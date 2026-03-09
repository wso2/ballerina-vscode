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

package org.ballerinalang.langserver.workspace.lspgateway;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import org.eclipse.lsp4j.ClientCapabilities;

import java.util.Optional;

/**
 * Aggregate root representing an active LSP client session.
 * Tracks negotiated capabilities and experimental feature flags.
 *
 * @since 1.7.0
 */
public class ClientSession {

    private final ClientCapabilities capabilities;

    public ClientSession(ClientCapabilities capabilities) {
        this.capabilities = capabilities;
    }

    /**
     * Checks if a specific experimental capability is enabled by the client.
     *
     * @param capabilityName Name of the capability (e.g., "runNotifications")
     * @return {@code true} if enabled, {@code false} otherwise
     */
    public boolean isCapabilityEnabled(String capabilityName) {
        Object experimental = capabilities.getExperimental();
        if (experimental instanceof JsonObject jsonObject) {
            JsonElement element = jsonObject.get(capabilityName);
            if (element != null && element.isJsonPrimitive()) {
                return element.getAsBoolean();
            }
        }
        return false;
    }

    /**
     * Returns the raw client capabilities.
     *
     * @return {@link ClientCapabilities}
     */
    public ClientCapabilities getCapabilities() {
        return capabilities;
    }
}
