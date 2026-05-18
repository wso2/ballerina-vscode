/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { DownloadProgress, onDownloadProgress } from "@wso2/ballerina-core";
import { exec } from "child_process";
import { extension } from "../BalExtensionContext";
import { RPCLayer } from "../RPCLayer";
import { VisualizerWebview } from "../views/visualizer/webview";
import { debug } from "./logger";
import { quoteShellPath } from "./config";

const PROGRESS_COMPLETE = 100;

/**
 * Executes the `bal tool pull` command and sends progress notifications to the webview client via RPC.
 * Includes 5-minute timeout.
 *
 * @param migrationToolName The alias for the Ballerina tool to pull (e.g., "migrate-tibco", "migrate-mule").
 * @param version The version of the tool to pull (e.g., "1.1.1").
 * @returns A promise that resolves when the operation is complete or rejects on failure.
 */
export async function pullMigrationTool(migrationToolName: string, version: string): Promise<void> {
    // 1. Initial validation and command mapping
    if (!migrationToolName) {
        const errorMessage = "Migration tool name is required";
        return Promise.reject(new Error(errorMessage));
    }

    if (!version) {
        const errorMessage = "Migration tool version is required";
        return Promise.reject(new Error(errorMessage));
    }

    const toolCommandSet = new Set(["migrate-tibco", "migrate-mule"]);

    if (!toolCommandSet.has(migrationToolName)) {
        const errorMessage = `Unsupported migration tool: ${migrationToolName}`;
        return Promise.reject(new Error(errorMessage));
    }

    const ballerinaCmd = extension.ballerinaExtInstance.getBallerinaCmd();
    const command = `${quoteShellPath(ballerinaCmd)} tool pull ${migrationToolName}:${version}`;
    debug(`Executing migration tool pull command: ${command}`);

    // 2. This function now returns a promise that wraps the exec lifecycle
    return new Promise<void>((resolve, reject) => {
        // Helper to send notifications to the webview
        const sendProgress = (progress: DownloadProgress) => {
            RPCLayer._messenger.sendNotification(
                onDownloadProgress,
                { type: "webview", webviewType: VisualizerWebview.viewType },
                progress
            );
        };

        // Send initial progress update
        sendProgress({
            message: "Initializing tool download...",
            percentage: 0,
            success: false,
            step: 1,
        });

        const childProcess = exec(command, {
            maxBuffer: 1024 * 1024,
            timeout: 300000 // 5 minutes timeout
        });

        let accumulatedStdout = "";
        let progressReported = 0;

        // 3. Process the command's standard output with carriage return handling
        childProcess.stdout?.on("data", (data: Buffer) => {
            const output = data.toString();
            accumulatedStdout += output;
            debug(`Tool pull stdout chunk: ${output.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}`);

            // Handle carriage return progress updates - split by \r and take the last meaningful line
            const lines = output.split('\r');
            const lastLine = lines[lines.length - 1] || lines[lines.length - 2] || '';

            // Case A: Tool is already installed (high-priority check)
            if (accumulatedStdout.includes("is already available locally")) {
                if (progressReported < PROGRESS_COMPLETE) {
                    progressReported = PROGRESS_COMPLETE;
                    sendProgress({
                        message: "Tool is already installed.",
                        percentage: PROGRESS_COMPLETE,
                        success: true,
                        step: 3,
                    });
                }
            }
            // Case B: Download is complete (check for success message)
            else if (accumulatedStdout.includes("pulled from central successfully")) {
                if (progressReported < PROGRESS_COMPLETE) {
                    progressReported = PROGRESS_COMPLETE;
                    sendProgress({
                        message: "Download complete. Finalizing...",
                        percentage: PROGRESS_COMPLETE,
                        success: false, // Not fully successful until the process closes with code 0
                        step: 2,
                    });
                }
            }
            // Case C: Parse the percentage from the progress bar output
            else {
                // Look for percentage in the current line (handles carriage return updates)
                const percentageMatch = lastLine.match(/\s+(\d{1,3})\s*%/);

                if (percentageMatch) {
                    const currentPercentage = parseInt(percentageMatch[1], 10);

                    // Update progress if it's a valid number and moving forward
                    if (!isNaN(currentPercentage) && currentPercentage > progressReported && currentPercentage <= PROGRESS_COMPLETE) {
                        progressReported = currentPercentage;

                        // Extract download info from progress line if available
                        const sizeMatch = lastLine.match(/(\d+)\/(\d+)\s+KB/);
                        let message = `Downloading...`;

                        if (sizeMatch) {
                            const downloaded = parseInt(sizeMatch[1], 10);
                            const total = parseInt(sizeMatch[2], 10);
                            message = `Downloading... ${currentPercentage}% (${Math.round(downloaded / 1024)}/${Math.round(total / 1024)} MB)`;
                        }

                        sendProgress({
                            message,
                            percentage: currentPercentage,
                            success: false,
                            step: 2,
                        });
                    }
                }
                // Also check for any percentage in the accumulated output as fallback
                else {
                    const allPercentageMatches = output.match(/(\d{1,3})\s*%/g);
                    if (allPercentageMatches) {
                        const lastMatch = allPercentageMatches[allPercentageMatches.length - 1];
                        const currentPercentage = parseInt(lastMatch, 10);

                        if (!isNaN(currentPercentage) && currentPercentage > progressReported && currentPercentage <= PROGRESS_COMPLETE) {
                            progressReported = currentPercentage;
                            sendProgress({
                                message: `Downloading... ${currentPercentage}%`,
                                percentage: currentPercentage,
                                success: false,
                                step: 2,
                            });
                        }
                    }
                }
            }
        });

        // 4. Handle standard error output with improved filtering
        childProcess.stderr?.on("data", (data: Buffer) => {
            const errorOutput = data.toString().trim();
            debug(`Tool pull stderr: ${errorOutput}`);

            // Filter out non-critical messages that shouldn't cause failure
            const nonCriticalPatterns = [
                /is already active/i,
                /warning:/i,
                /deprecated/i
            ];

            const isNonCritical = nonCriticalPatterns.some(pattern => pattern.test(errorOutput));

            if (isNonCritical) {
                debug(`Ignoring non-critical stderr: ${errorOutput}`);
                return;
            }

            // Only treat as error if it's a real error message
            if (errorOutput.length > 0) {
                sendProgress({
                    message: `Error: ${errorOutput}`,
                    success: false,
                    step: -1,
                });
                reject(new Error(errorOutput));
            }
        });

        // 5. Handle the definitive end of the process
        childProcess.on("close", (code) => {
            debug(`Tool pull command exited with code ${code}`);

            // Success conditions: code 0, or code 1 with "already available" message
            const isAlreadyInstalled = accumulatedStdout.includes("is already available locally");
            const isSuccessfulDownload = accumulatedStdout.includes("pulled from central successfully") ||
                accumulatedStdout.includes("successfully set as the active version");

            if (code === 0 || (code === 1 && isAlreadyInstalled)) {
                let finalMessage: string;

                if (isAlreadyInstalled) {
                    finalMessage = `Tool '${migrationToolName}' is already installed.`;
                } else if (isSuccessfulDownload) {
                    finalMessage = `Successfully pulled '${migrationToolName}'.`;
                } else {
                    finalMessage = `Tool pull completed with code ${code}. Please check the logs for more details.`;
                }

                sendProgress({
                    message: finalMessage,
                    percentage: PROGRESS_COMPLETE,
                    success: true,
                    step: 3,
                });
                resolve();
            } else {
                const errorMessage = `Tool pull failed with exit code ${code}. Check logs for details.`;
                sendProgress({
                    message: errorMessage,
                    success: false,
                    step: -1,
                });
                reject(new Error(errorMessage));
            }
        });

        // Handle process execution errors (e.g., command not found)
        childProcess.on("error", (error) => {
            debug(`Tool pull process error: ${error.message}`);

            const errorMessage = `Failed to execute command: ${error.message}`;
            sendProgress({
                message: errorMessage,
                success: false,
                step: -1,
            });
            reject(new Error(errorMessage));
        });

        // Handle timeout from exec options
        childProcess.on("timeout", () => {
            debug("Tool pull process timed out after 5 minutes");

            const errorMessage = "Download timed out after 5 minutes";
            sendProgress({
                message: errorMessage,
                success: false,
                step: -1,
            });
            reject(new Error("Migration tool pull timed out after 5 minutes"));
        });
    });
}
