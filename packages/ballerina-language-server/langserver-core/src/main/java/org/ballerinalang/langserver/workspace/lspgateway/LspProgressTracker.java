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

import org.eclipse.lsp4j.ProgressParams;
import org.eclipse.lsp4j.WorkDoneProgressBegin;
import org.eclipse.lsp4j.WorkDoneProgressEnd;
import org.eclipse.lsp4j.WorkDoneProgressReport;
import org.eclipse.lsp4j.jsonrpc.messages.Either;
import org.eclipse.lsp4j.services.LanguageClient;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * LSP-backed implementation of {@link ProgressTracker}.
 * Sends {@code $/progress} notifications to the connected language client.
 *
 * @since 1.7.0
 */
public class LspProgressTracker implements ProgressTracker {

    private final LanguageClient client;
    private final Set<String> activeTokens = ConcurrentHashMap.newKeySet();

    /**
     * Creates a new tracker backed by the given language client.
     *
     * @param client language client to send progress notifications to; must not be null
     */
    public LspProgressTracker(LanguageClient client) {
        this.client = client;
    }

    @Override
    public void begin(String token, String title, String message, int percentage) {
        activeTokens.add(token);

        WorkDoneProgressBegin begin = new WorkDoneProgressBegin();
        begin.setTitle(title);
        begin.setMessage(message);
        begin.setPercentage(percentage);

        client.notifyProgress(new ProgressParams(Either.forLeft(token), Either.forLeft(begin)));
    }

    @Override
    public void report(String token, String message, int percentage) {
        if (!activeTokens.contains(token)) {
            return;
        }
        WorkDoneProgressReport report = new WorkDoneProgressReport();
        report.setMessage(message);
        report.setPercentage(percentage);
        client.notifyProgress(new ProgressParams(Either.forLeft(token), Either.forLeft(report)));
    }

    @Override
    public void end(String token, String message) {
        if (!activeTokens.remove(token)) {
            return;
        }
        WorkDoneProgressEnd end = new WorkDoneProgressEnd();
        end.setMessage(message);
        client.notifyProgress(new ProgressParams(Either.forLeft(token), Either.forLeft(end)));
    }
}
