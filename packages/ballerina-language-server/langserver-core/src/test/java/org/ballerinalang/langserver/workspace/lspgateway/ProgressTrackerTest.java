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

import org.eclipse.lsp4j.WorkDoneProgressBegin;
import org.eclipse.lsp4j.WorkDoneProgressEnd;
import org.eclipse.lsp4j.WorkDoneProgressNotification;
import org.eclipse.lsp4j.WorkDoneProgressReport;
import org.eclipse.lsp4j.services.LanguageClient;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Tests for {@link ProgressTracker}.
 *
 * @since 1.7.0
 */
public class ProgressTrackerTest {

    @Test
    public void testProgressLifecycle() {
        MockLanguageClient client = new MockLanguageClient();
        ProgressTracker tracker = new ProgressTracker(client);

        String projectRoot = "file:///path/to/project";
        String projectName = "my-project";
        
        // 1. Begin
        String token = tracker.begin(projectRoot, projectName);
        Assert.assertTrue(token.startsWith("ballerina-compile-"), "Token should match pattern");
        Assert.assertEquals(token.length(), "ballerina-compile-".length() + 8, "Token should have 8-char hash");
        
        Assert.assertEquals(client.notifications.size(), 1);
        WorkDoneProgressNotification beginNotif = client.notifications.get(0).value();
        Assert.assertTrue(beginNotif instanceof WorkDoneProgressBegin);
        Assert.assertEquals(((WorkDoneProgressBegin) beginNotif).getTitle(), "Compiling");
        Assert.assertEquals(((WorkDoneProgressBegin) beginNotif).getMessage(), projectName);

        // 2. Report
        tracker.report(token, "Analyzing...", 50);
        Assert.assertEquals(client.notifications.size(), 2);
        WorkDoneProgressNotification reportNotif = client.notifications.get(1).value();
        Assert.assertTrue(reportNotif instanceof WorkDoneProgressReport);
        Assert.assertEquals(((WorkDoneProgressReport) reportNotif).getMessage(), "Analyzing...");
        Assert.assertEquals(((WorkDoneProgressReport) reportNotif).getPercentage(), Integer.valueOf(50));

        // 3. End
        tracker.end(token);
        Assert.assertEquals(client.notifications.size(), 3);
        WorkDoneProgressNotification endNotif = client.notifications.get(2).value();
        Assert.assertTrue(endNotif instanceof WorkDoneProgressEnd);
    }

    @Test
    public void testMultipleTokens() {
        MockLanguageClient client = new MockLanguageClient();
        ProgressTracker tracker = new ProgressTracker(client);

        String token1 = tracker.begin("file:///p1", "p1");
        String token2 = tracker.begin("file:///p2", "p2");

        Assert.assertNotEquals(token1, token2);
        Assert.assertEquals(client.notifications.size(), 2);
    }

    @Test
    public void testEndRemovesToken() {
        MockLanguageClient client = new MockLanguageClient();
        ProgressTracker tracker = new ProgressTracker(client);

        String token = tracker.begin("file:///p1", "p1");
        tracker.end(token);
        
        // Sending report after end should be ignored.
        tracker.report(token, "Stale report", 100);
        Assert.assertEquals(client.notifications.size(), 2, "Report after end should be ignored");
    }

    private static class MockLanguageClient implements LanguageClient {
        List<ProgressNotification> notifications = new ArrayList<>();

        record ProgressNotification(String token, WorkDoneProgressNotification value) {}

        @Override
        public void notifyProgress(org.eclipse.lsp4j.ProgressParams params) {
            notifications.add(new ProgressNotification(params.getToken().getLeft(), params.getValue().getLeft()));
        }

        @Override
        public void telemetryEvent(Object object) {}

        @Override
        public void publishDiagnostics(org.eclipse.lsp4j.PublishDiagnosticsParams diagnostics) {}

        @Override
        public void showMessage(org.eclipse.lsp4j.MessageParams messageParams) {}

        @Override
        public CompletableFuture<org.eclipse.lsp4j.MessageActionItem> showMessageRequest(org.eclipse.lsp4j.ShowMessageRequestParams showMessageRequestParams) {
            return null;
        }

        @Override
        public void logMessage(org.eclipse.lsp4j.MessageParams message) {}
    }
}
