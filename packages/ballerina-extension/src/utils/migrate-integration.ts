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

/**
 * Executes the `bal tool pull` command and sends progress notifications to the webview client via RPC.
 *
 * @param migrationToolName The alias for the Ballerina tool to pull (e.g., "tibco").
 * @returns A promise that resolves when the operation is complete or rejects on failure.
 */
export async function pullMigrationTool(migrationToolName: string): Promise<void> {
    // 1. Initial validation and command mapping
    if (!migrationToolName) {
        const errorMessage = "Migration tool name is required";
        return Promise.reject(new Error(errorMessage));
    }

    const toolCommandSet = new Set(["migrate-tibco", "migrate-mule"]);

    if (!toolCommandSet.has(migrationToolName)) {
        const errorMessage = `Unsupported migration tool: ${migrationToolName}`;
        return Promise.reject(new Error(errorMessage));
    }

    const ballerinaCmd = extension.ballerinaExtInstance.getBallerinaCmd();
    const command = `${ballerinaCmd} tool pull ${migrationToolName}`;
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
            message: "Initializing...",
            percentage: 0,
            success: false,
            step: 1,
        });

        const childProcess = exec(command, { maxBuffer: 1024 * 1024 });
        let accumulatedStdout = "";
        let progressReported = 0;

        // 3. Process the command's standard output
        childProcess.stdout?.on("data", (data: string) => {
            const output = data.toString();
            accumulatedStdout += output;
            debug(`Tool pull stdout: ${output.trim()}`);

            // Case A: Tool is already installed (high-priority check)
            if (accumulatedStdout.includes("is already available locally")) {
                if (progressReported < 100) {
                    progressReported = 100;
                    sendProgress({
                        message: "Tool is already installed.",
                        percentage: 100,
                        success: true,
                        step: 3,
                    });
                }
            }
            // Case B: Download is complete (next-priority check)
            else if (accumulatedStdout.includes("pulled from central successfully")) {
                if (progressReported < 100) {
                    // We jump to 100 here because the final "pulled" message confirms completion.
                    progressReported = 100;
                    sendProgress({
                        message: "Download complete. Finalizing...",
                        percentage: 100,
                        success: false, // Not fully successful until the process closes with code 0
                        step: 2,
                    });
                }
            }
            // Case C: Parse the percentage from the ongoing download stream
            else {
                // Regex to find all sequences of digits followed by a '%' sign.
                const percentageMatches = output.match(/(\d{1,3})\s*%/g);

                if (percentageMatches) {
                    // Get the last percentage found in this chunk, as it's the most recent.
                    const lastMatch = percentageMatches[percentageMatches.length - 1];
                    const currentPercentage = parseInt(lastMatch, 10);

                    // Update progress if it's a valid number and it's moving forward.
                    if (!isNaN(currentPercentage) && currentPercentage > progressReported) {
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
        });

        // 4. Treat any standard error output as a failure
        childProcess.stderr?.on("data", (data: string) => {
            const errorOutput = data.toString().trim();
            debug(`Tool pull stderr: ${errorOutput}`);
            // Check if it's a non-fatal warning about being active
            if (errorOutput.includes("is already active")) {
                debug("Ignoring 'already active' warning.");
                return;
            }
            sendProgress({
                message: errorOutput,
                success: false,
                step: -1,
            });
            reject(new Error(errorOutput));
        });

        // 5. Handle the definitive end of the process
        childProcess.on("close", (code) => {
            debug(`Tool pull command exited with code ${code}`);
            if (code === 0 || (code === 1 && accumulatedStdout.includes("is already available locally"))) {
                const finalMessage = accumulatedStdout.includes("is already available locally")
                    ? `Tool '${migrationToolName}' is already installed.`
                    : `Successfully pulled '${migrationToolName}'.`;

                sendProgress({
                    message: finalMessage,
                    percentage: 100,
                    success: true,
                    step: 3,
                });
                resolve();
            } else {
                const errorMessage = `Operation failed. Process exited with code ${code}.`;
                sendProgress({
                    message: errorMessage,
                    success: false,
                    step: -1,
                });
                reject(new Error(errorMessage));
            }
        });

        // Handle errors in the process execution itself
        childProcess.on("error", (error) => {
            debug(`Tool pull process error: ${error.message}`);
            sendProgress({
                message: `Failed to execute command: ${error.message}`,
                success: false,
                step: -1,
            });
            reject(error);
        });
    });
}
