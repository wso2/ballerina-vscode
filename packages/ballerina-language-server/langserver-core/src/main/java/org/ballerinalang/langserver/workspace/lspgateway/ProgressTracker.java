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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages $/progress token lifecycle for compilation progress notifications.
 * Ensures proper pairing of begin/end signals.
 *
 * @since 1.7.0
 */
public class ProgressTracker {

    private final LanguageClient client;
    private final Map<String, String> activeTokens = new ConcurrentHashMap<>();

    public ProgressTracker(LanguageClient client) {
        this.client = client;
    }

    /**
     * Begins a progress session for a project.
     *
     * @param projectRoot Project root URI
     * @param projectName Project name
     * @return The generated progress token
     */
    public String begin(String projectRoot, String projectName) {
        String token = generateToken(projectRoot);
        activeTokens.put(token, projectRoot);

        WorkDoneProgressBegin begin = new WorkDoneProgressBegin();
        begin.setTitle("Compiling");
        begin.setMessage(projectName);
        begin.setPercentage(0);

        client.notifyProgress(new ProgressParams(Either.forLeft(token), Either.forLeft(begin)));
        return token;
    }

    /**
     * Reports progress for an active session.
     *
     * @param token      Progress token
     * @param message    Progress message
     * @param percentage Progress percentage
     */
    public void report(String token, String message, int percentage) {
        if (!activeTokens.containsKey(token)) {
            return;
        }
        WorkDoneProgressReport report = new WorkDoneProgressReport();
        report.setMessage(message);
        report.setPercentage(percentage);
        client.notifyProgress(new ProgressParams(Either.forLeft(token), Either.forLeft(report)));
    }

    /**
     * Ends a progress session.
     *
     * @param token Progress token
     */
    public void end(String token) {
        if (activeTokens.remove(token) == null) {
            return;
        }
        WorkDoneProgressEnd end = new WorkDoneProgressEnd();
        client.notifyProgress(new ProgressParams(Either.forLeft(token), Either.forLeft(end)));
    }

    private String generateToken(String projectRoot) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(projectRoot.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder("ballerina-compile-");
            for (int i = 0; i < 4; i++) {
                sb.append(String.format("%02x", hash[i]));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            // Fallback to hashCode if MD5 is unavailable
            return "ballerina-compile-" + String.format("%08x", projectRoot.hashCode());
        }
    }
}
