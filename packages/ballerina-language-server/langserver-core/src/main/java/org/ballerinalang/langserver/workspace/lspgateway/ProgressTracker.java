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

/**
 * Contract for reporting progress to a connected LSP client.
 * Implements the LSP `$/progress` lifecycle: begin → report* → end.
 *
 * @since 1.7.0
 */
public interface ProgressTracker {

    /**
     * Begins a new progress report with the given token.
     * Sent once at the start of a long-running operation.
     *
     * @param token unique progress token; must not be null or blank
     * @param title human-readable operation title; must not be null
     * @param message initial status message; must not be null
     * @param percentage initial progress percentage (0-100)
     */
    void begin(String token, String title, String message, int percentage);

    /**
     * Reports progress update for an ongoing operation.
     * Called zero or more times between begin and end.
     *
     * @param token progress token matching the begin call; must not be null or blank
     * @param message updated status message; must not be null
     * @param percentage current progress percentage (0-100)
     */
    void report(String token, String message, int percentage);

    /**
     * Ends the progress report for the given token.
     * Sent once when the operation completes (success or failure).
     *
     * @param token progress token matching the begin call; must not be null or blank
     * @param message final status message; must not be null
     */
    void end(String token, String message);
}
