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

import { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";

interface DebouncedOperation {
    count: number;
    timeoutId: number | null;
    isProcessing: boolean;
}

class DebouncedUndoRedoManager {
    private undoOperation: DebouncedOperation = {
        count: 0,
        timeoutId: null,
        isProcessing: false
    };

    private redoOperation: DebouncedOperation = {
        count: 0,
        timeoutId: null,
        isProcessing: false
    };

    private readonly DEBOUNCE_DELAY = 300; // 300ms debounce delay

    /**
     * Debounced undo operation that collects multiple rapid clicks
     */
    public debouncedUndo(rpcClient: BallerinaRpcClient): void {
        this.undoOperation.count++;
        console.log(`[DebouncedUndoRedo] Undo click #${this.undoOperation.count}`);

        // Clear existing timeout
        if (this.undoOperation.timeoutId) {
            clearTimeout(this.undoOperation.timeoutId);
        }

        // Set new timeout
        this.undoOperation.timeoutId = setTimeout(async () => {
            console.log(`[DebouncedUndoRedo] Executing ${this.undoOperation.count} undo operations`);
            await this.executeUndo(rpcClient, this.undoOperation.count);
            this.undoOperation.count = 0;
            this.undoOperation.timeoutId = null;
        }, this.DEBOUNCE_DELAY);
    }

    /**
     * Debounced redo operation that collects multiple rapid clicks
     */
    public debouncedRedo(rpcClient: BallerinaRpcClient): void {
        this.redoOperation.count++;
        console.log(`[DebouncedUndoRedo] Redo click #${this.redoOperation.count}`);

        // Clear existing timeout
        if (this.redoOperation.timeoutId) {
            clearTimeout(this.redoOperation.timeoutId);
        }

        // Set new timeout
        this.redoOperation.timeoutId = setTimeout(async () => {
            console.log(`[DebouncedUndoRedo] Executing ${this.redoOperation.count} redo operations`);
            await this.executeRedo(rpcClient, this.redoOperation.count);
            this.redoOperation.count = 0;
            this.redoOperation.timeoutId = null;
        }, this.DEBOUNCE_DELAY);
    }

    /**
     * Execute undo operation with validation and proper count
     */
    private async executeUndo(rpcClient: BallerinaRpcClient, requestedCount: number): Promise<void> {
        if (this.undoOperation.isProcessing) {
            return; // Prevent concurrent operations
        }

        try {
            this.undoOperation.isProcessing = true;

            // Get current undo state to validate
            const undoRedoState = await rpcClient.getVisualizerRpcClient().undoRedoState();

            if (!undoRedoState.canUndo) {
                // Show notification that there's nothing to undo
                this.showNotification("No undo operations available", "info");
                return;
            }

            const availableUndoCount = undoRedoState.undoCount;
            const actualUndoCount = Math.min(requestedCount, availableUndoCount);

            if (actualUndoCount < requestedCount) {
                this.showNotification(
                    `Only ${availableUndoCount} undo operation${availableUndoCount === 1 ? '' : 's'} available. Undoing ${actualUndoCount} step${actualUndoCount === 1 ? '' : 's'}.`,
                    "info"
                );
            }

            // Execute multiple undo operations using the efficient bulk method
            await rpcClient.getVisualizerRpcClient().undo(actualUndoCount);

        } catch (error) {
            console.error("Error during debounced undo:", error);
            this.showNotification("Error occurred during undo operation", "error");
        } finally {
            this.undoOperation.isProcessing = false;
        }
    }

    /**
     * Execute redo operation with validation and proper count
     */
    private async executeRedo(rpcClient: BallerinaRpcClient, requestedCount: number): Promise<void> {
        if (this.redoOperation.isProcessing) {
            return; // Prevent concurrent operations
        }

        try {
            this.redoOperation.isProcessing = true;

            // Get current redo state to validate
            const undoRedoState = await rpcClient.getVisualizerRpcClient().undoRedoState();

            if (!undoRedoState.canRedo) {
                // Show notification that there's nothing to redo
                this.showNotification("No redo operations available", "info");
                return;
            }

            const availableRedoCount = undoRedoState.redoCount;
            const actualRedoCount = Math.min(requestedCount, availableRedoCount);

            if (actualRedoCount < requestedCount) {
                this.showNotification(
                    `Only ${availableRedoCount} redo operation${availableRedoCount === 1 ? '' : 's'} available. Redoing ${actualRedoCount} step${actualRedoCount === 1 ? '' : 's'}.`,
                    "info"
                );
            }

            // Execute multiple redo operations using the efficient bulk method
            await rpcClient.getVisualizerRpcClient().redo(actualRedoCount);

        } catch (error) {
            console.error("Error during debounced redo:", error);
            this.showNotification("Error occurred during redo operation", "error");
        } finally {
            this.redoOperation.isProcessing = false;
        }
    }

    /**
     * Show notification to user
     */
    private showNotification(message: string, type: "info" | "error"): void {
        // Log to console for debugging
        console.log(`[${type.toUpperCase()}] ${message}`);

        // Note: Notifications are now handled directly in the RPC manager
        // This method is kept for future extensibility
    }

    /**
     * Cancel any pending operations
     */
    public cancelPendingOperations(): void {
        if (this.undoOperation.timeoutId) {
            clearTimeout(this.undoOperation.timeoutId);
            this.undoOperation.timeoutId = null;
            this.undoOperation.count = 0;
        }

        if (this.redoOperation.timeoutId) {
            clearTimeout(this.redoOperation.timeoutId);
            this.redoOperation.timeoutId = null;
            this.redoOperation.count = 0;
        }
    }

    /**
     * Check if any operations are currently processing
     */
    public isProcessing(): boolean {
        return this.undoOperation.isProcessing || this.redoOperation.isProcessing;
    }
}

// Export singleton instance
export const debouncedUndoRedoManager = new DebouncedUndoRedoManager();

// Export the debounced functions for easy use
export const debouncedUndo = (rpcClient: BallerinaRpcClient) => {
    debouncedUndoRedoManager.debouncedUndo(rpcClient);
};

export const debouncedRedo = (rpcClient: BallerinaRpcClient) => {
    debouncedUndoRedoManager.debouncedRedo(rpcClient);
};
