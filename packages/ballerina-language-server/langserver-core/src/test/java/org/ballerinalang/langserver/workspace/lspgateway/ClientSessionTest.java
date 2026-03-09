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

import com.google.gson.JsonObject;
import org.eclipse.lsp4j.ClientCapabilities;
import org.testng.Assert;
import org.testng.annotations.Test;

/**
 * Tests for {@link ClientSession}.
 *
 * @since 1.7.0
 */
public class ClientSessionTest {

    @Test
    public void testExperimentalFlagGating() {
        ClientCapabilities capabilities = new ClientCapabilities();
        JsonObject experimental = new JsonObject();
        experimental.addProperty("runNotifications", true);
        experimental.addProperty("eventSync", false);
        capabilities.setExperimental(experimental);

        ClientSession session = new ClientSession(capabilities);

        Assert.assertTrue(session.isCapabilityEnabled("runNotifications"));
        Assert.assertFalse(session.isCapabilityEnabled("eventSync"));
        Assert.assertFalse(session.isCapabilityEnabled("debugAttach"), "Non-existent flag should be false");
    }

    @Test
    public void testExperimentalFlagGating_NullExperimental() {
        ClientCapabilities capabilities = new ClientCapabilities();
        ClientSession session = new ClientSession(capabilities);

        Assert.assertFalse(session.isCapabilityEnabled("runNotifications"));
    }
}
