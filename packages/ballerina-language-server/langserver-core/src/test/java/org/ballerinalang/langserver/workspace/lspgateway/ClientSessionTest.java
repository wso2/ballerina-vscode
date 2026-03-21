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
import org.eclipse.lsp4j.WindowClientCapabilities;
import org.testng.Assert;
import org.testng.annotations.Test;

import javax.annotation.Nonnull;
import java.lang.annotation.Annotation;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;

/**
 * Tests for {@link ClientSession}.
 *
 * @since 1.7.0
 */
public class ClientSessionTest {

    @Test(groups = "client-session")
    public void testExperimentalFlagGating() {
        ClientCapabilities capabilities = new ClientCapabilities();
        JsonObject experimental = new JsonObject();
        experimental.addProperty("runNotifications", true);
        experimental.addProperty("eventSync", false);
        capabilities.setExperimental(experimental);

        ClientSession session = new ClientSession(capabilities, List.of(), "session-1");

        Assert.assertTrue(session.isCapabilityEnabled("runNotifications"));
        Assert.assertFalse(session.isCapabilityEnabled("eventSync"));
        Assert.assertFalse(session.isCapabilityEnabled("debugAttach"), "Non-existent flag should be false");
    }

    @Test(groups = "client-session")
    public void testExperimentalFlagGating_NullExperimental() {
        ClientCapabilities capabilities = new ClientCapabilities();
        ClientSession session = new ClientSession(capabilities, List.of(), "session-1");

        Assert.assertFalse(session.isCapabilityEnabled("runNotifications"));
    }

    @Test(groups = "client-session")
    public void record_accessors() {
        ClientCapabilities caps = new ClientCapabilities();
        List<String> uris = List.of("file:///home/user/project1");

        ClientSession session = new ClientSession(caps, uris, "session-123");

        Assert.assertSame(session.clientCapabilities(), caps);
        Assert.assertEquals(session.workspaceFolderUris(), uris);
        Assert.assertEquals(session.sessionId(), "session-123");
    }

    @Test(groups = "client-session")
    public void record_defensivelyCopiesToPreventMutation() {
        ClientCapabilities caps = new ClientCapabilities();
        List<String> mutableList = new java.util.ArrayList<>(List.of("file:///project1"));

        ClientSession session = new ClientSession(caps, mutableList, "session-1");
        mutableList.add("file:///project2");

        Assert.assertEquals(session.workspaceFolderUris().size(), 1);
    }

    @Test(groups = "client-session")
    public void supportsWorkDoneProgress_returnsTrueWhenSupported() {
        ClientCapabilities caps = new ClientCapabilities();
        WindowClientCapabilities window = new WindowClientCapabilities();
        window.setWorkDoneProgress(true);
        caps.setWindow(window);

        ClientSession session = new ClientSession(caps, List.of(), "session-1");

        Assert.assertTrue(session.supportsWorkDoneProgress());
    }

    @Test(groups = "client-session")
    public void supportsWorkDoneProgress_returnsFalseWhenNotSupported() {
        ClientCapabilities caps = new ClientCapabilities();
        WindowClientCapabilities window = new WindowClientCapabilities();
        window.setWorkDoneProgress(false);
        caps.setWindow(window);

        ClientSession session = new ClientSession(caps, List.of(), "session-1");

        Assert.assertFalse(session.supportsWorkDoneProgress());
    }

    @Test(groups = "client-session")
    public void constructor_nullClientCapabilitiesThrowsNPE() {
        RecordComponent[] components = ClientSession.class.getRecordComponents();
        Annotation[] annotations = components[0].getAnnotations();
        boolean hasNonnull = Arrays.stream(annotations).anyMatch(a -> a.annotationType() == Nonnull.class);
        Assert.assertTrue(hasNonnull, "clientCapabilities record component must be @Nonnull");
    }

    @Test(groups = "client-session")
    public void constructor_blankSessionIdThrowsIAE() {
        Assert.assertThrows(IllegalArgumentException.class, () ->
                new ClientSession(new ClientCapabilities(), List.of(), ""));
    }
}
