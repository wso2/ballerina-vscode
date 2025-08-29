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

/**
 * Enhanced UndoRedoManager with Batch Operation Support
 * 
 * This class now supports both single-file operations (legacy) and batch operations
 * where multiple files can be modified as part of a single undoable transaction.
 * 
 * Key Features:
 * - Batch Operations: Group multiple file changes into a single undo/redo operation
 * - Transaction Safety: Start, commit, or cancel batch operations
 * - Backward Compatibility: All existing single-file methods continue to work
 * - Stack Management: Automatic cleanup and size limiting for both undo and redo stacks
 * 
 * Usage Examples:
 * 
 * 1. Single File Operations (Legacy):
 *    ```typescript
 *    manager.updateContent('file.ts', 'content');
 *    manager.addModification('new content');
 *    manager.undo(); // Undoes single file change
 *    ```
 * 
 * 2. Batch Operations (New):
 *    ```typescript
 *    const batchId = manager.startBatchOperation('Refactor component names');
 *    manager.addFileToBatch('component.tsx', 'new component content');
 *    manager.addFileToBatch('index.ts', 'updated exports');
 *    manager.addFileToBatch('app.tsx', 'updated imports');
 *    manager.commitBatchOperation(); // All changes become one undo operation
 *    
 *    manager.undoBatch(); // Undoes ALL files in the batch
 *    ```
 * 
 * 3. Web Interface Integration:
 *    ```typescript
 *    // When user clicks a button that modifies multiple files
 *    const batchId = manager.startBatchOperation('Add TypeScript types');
 *    try {
 *        for (const change of fileChanges) {
 *            manager.addFileToBatch(change.path, change.content);
 *        }
 *        manager.commitBatchOperation();
 *    } catch (error) {
 *        manager.cancelBatchOperation(); // Revert all changes
 *    }
 *    ```
 */

interface FileSnapshot {
    path: string;
    content: string;
}

interface BatchOperation {
    id: string;
    timestamp: number;
    files: FileSnapshot[];
    description?: string;
}

export class UndoRedoManager {
    // Legacy single file support (for backward compatibility)
    path: string;
    content: string;

    // New batch operation support
    private currentFiles: Map<string, string>; // Current state of all files
    private undoStack: BatchOperation[];
    private redoStack: BatchOperation[];
    private currentTransaction: FileSnapshot[] | null;
    private transactionId: string | null;

    // Legacy stacks (kept for backward compatibility)
    private legacyUndoStack: Map<string, string[]>;
    private legacyRedoStack: Map<string, string[]>;

    private readonly MAX_STACK_SIZE = 100;

    constructor() {
        this.currentFiles = new Map();
        this.undoStack = [];
        this.redoStack = [];
        this.currentTransaction = null;
        this.transactionId = null;

        // Legacy support
        this.legacyUndoStack = new Map();
        this.legacyRedoStack = new Map();
    }

    // ========== NEW BATCH OPERATION METHODS ==========

    /**
     * Start a new batch transaction for multiple file operations
     */
    public startBatchOperation(description?: string): string {
        if (this.currentTransaction) {
            throw new Error('A batch operation is already in progress. Complete it before starting a new one.');
        }

        this.transactionId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.currentTransaction = [];
        return this.transactionId;
    }

    /**
     * Add a file change to the current batch operation
     */
    public addFileToBatch(filePath: string, newContent: string): void {
        if (!this.currentTransaction) {
            throw new Error('No batch operation in progress. Call startBatchOperation() first.');
        }

        // Store the current state before modification (if not already stored)
        const existingSnapshot = this.currentTransaction.find(f => f.path === filePath);
        if (!existingSnapshot) {
            const currentContent = this.currentFiles.get(filePath) || '';
            this.currentTransaction.push({
                path: filePath,
                content: currentContent
            });
        }

        // Update the current state
        this.currentFiles.set(filePath, newContent);

        // Update legacy single file support if this is the current file
        if (this.path === filePath) {
            this.content = newContent;
        }
    }

    /**
     * Commit the current batch operation to the undo stack
     */
    public commitBatchOperation(description?: string): void {
        if (!this.currentTransaction || !this.transactionId) {
            throw new Error('No batch operation in progress.');
        }

        if (this.currentTransaction.length === 0) {
            // No changes were made, just clean up
            this.currentTransaction = null;
            this.transactionId = null;
            return;
        }

        const batchOperation: BatchOperation = {
            id: this.transactionId,
            timestamp: Date.now(),
            files: [...this.currentTransaction],
            description
        };

        // Add to undo stack
        this.undoStack.push(batchOperation);

        // Limit stack size
        if (this.undoStack.length > this.MAX_STACK_SIZE) {
            this.undoStack.shift();
        }

        // Clear redo stack as new operation invalidates it
        this.redoStack = [];

        // Clean up transaction
        this.currentTransaction = null;
        this.transactionId = null;
    }

    /**
     * Cancel the current batch operation and revert all changes
     */
    public cancelBatchOperation(): Map<string, string> {
        if (!this.currentTransaction) {
            throw new Error('No batch operation in progress.');
        }

        const revertedFiles = new Map<string, string>();

        // Revert all files to their original state
        for (const snapshot of this.currentTransaction) {
            this.currentFiles.set(snapshot.path, snapshot.content);
            revertedFiles.set(snapshot.path, snapshot.content);

            // Update legacy single file support if this is the current file
            if (this.path === snapshot.path) {
                this.content = snapshot.content;
            }
        }

        // Clean up transaction
        this.currentTransaction = null;
        this.transactionId = null;

        return revertedFiles;
    }

    /**
     * Undo the last batch operation
     */
    public undoBatch(): Map<string, string> | null {
        if (this.undoStack.length === 0) {
            return null;
        }

        const lastOperation = this.undoStack.pop()!;
        const currentStates = new Map<string, string>();

        // Store current states for redo
        for (const snapshot of lastOperation.files) {
            const currentContent = this.currentFiles.get(snapshot.path) || '';
            currentStates.set(snapshot.path, currentContent);
        }

        // Create redo operation
        const redoOperation: BatchOperation = {
            id: `redo_${lastOperation.id}`,
            timestamp: Date.now(),
            files: Array.from(currentStates.entries()).map(([path, content]) => ({ path, content })),
            description: `Redo: ${lastOperation.description || 'Batch operation'}`
        };

        this.redoStack.push(redoOperation);

        // Limit redo stack size
        if (this.redoStack.length > this.MAX_STACK_SIZE) {
            this.redoStack.shift();
        }

        // Restore previous states
        const restoredFiles = new Map<string, string>();
        for (const snapshot of lastOperation.files) {
            this.currentFiles.set(snapshot.path, snapshot.content);
            restoredFiles.set(snapshot.path, snapshot.content);

            // Update legacy single file support if this is the current file
            if (this.path === snapshot.path) {
                this.content = snapshot.content;
            }
        }

        return restoredFiles;
    }

    /**
     * Redo the last undone batch operation
     */
    public redoBatch(): Map<string, string> | null {
        if (this.redoStack.length === 0) {
            return null;
        }

        const redoOperation = this.redoStack.pop()!;
        const currentStates = new Map<string, string>();

        // Store current states for undo
        for (const snapshot of redoOperation.files) {
            const currentContent = this.currentFiles.get(snapshot.path) || '';
            currentStates.set(snapshot.path, currentContent);
        }

        // Create undo operation
        const undoOperation: BatchOperation = {
            id: redoOperation.id.replace('redo_', ''),
            timestamp: Date.now(),
            files: Array.from(currentStates.entries()).map(([path, content]) => ({ path, content })),
            description: redoOperation.description?.replace('Redo: ', '') || 'Batch operation'
        };

        this.undoStack.push(undoOperation);

        // Apply redo states
        const redoneFiles = new Map<string, string>();
        for (const snapshot of redoOperation.files) {
            this.currentFiles.set(snapshot.path, snapshot.content);
            redoneFiles.set(snapshot.path, snapshot.content);

            // Update legacy single file support if this is the current file
            if (this.path === snapshot.path) {
                this.content = snapshot.content;
            }
        }

        return redoneFiles;
    }

    /**
     * Get the current file content (batch-aware)
     */
    public getFileContent(filePath: string): string | undefined {
        return this.currentFiles.get(filePath);
    }

    /**
     * Update file content (batch-aware, can be used outside of transactions)
     */
    public updateFileContent(filePath: string, content: string): void {
        // If we're in a batch operation, use batch methods
        if (this.currentTransaction) {
            this.addFileToBatch(filePath, content);
            return;
        }

        // Otherwise, create a single-file batch operation
        const batchId = this.startBatchOperation(`Update ${filePath}`);
        this.addFileToBatch(filePath, content);
        this.commitBatchOperation();
    }

    /**
     * Check if a batch operation is in progress
     */
    public isBatchInProgress(): boolean {
        return this.currentTransaction !== null;
    }

    /**
     * Get information about available undo operations
     */
    public getUndoInfo(): Array<{ id: string, timestamp: number, description?: string, fileCount: number }> {
        return this.undoStack.map(op => ({
            id: op.id,
            timestamp: op.timestamp,
            description: op.description,
            fileCount: op.files.length
        }));
    }

    /**
     * Get information about available redo operations
     */
    public getRedoInfo(): Array<{ id: string, timestamp: number, description?: string, fileCount: number }> {
        return this.redoStack.map(op => ({
            id: op.id,
            timestamp: op.timestamp,
            description: op.description,
            fileCount: op.files.length
        }));
    }

    /**
     * Check if undo operation is available (for enabling/disabling undo button)
     */
    public canUndo(): boolean {
        return this.undoStack.length > 0 || this.hasLegacyUndoOperations();
    }

    /**
     * Check if redo operation is available (for enabling/disabling redo button)
     */
    public canRedo(): boolean {
        return this.redoStack.length > 0 || this.hasLegacyRedoOperations();
    }

    /**
     * Get the total count of available undo operations
     */
    public getUndoCount(): number {
        return this.undoStack.length + this.getLegacyUndoCount();
    }

    /**
     * Get the total count of available redo operations
     */
    public getRedoCount(): number {
        return this.redoStack.length + this.getLegacyRedoCount();
    }

    /**
     * Get the description of the next undo operation (useful for button tooltips)
     */
    public getNextUndoDescription(): string | null {
        if (this.undoStack.length > 0) {
            const lastOp = this.undoStack[this.undoStack.length - 1];
            return lastOp.description || `Batch operation (${lastOp.files.length} files)`;
        }

        // Check legacy operations
        if (this.hasLegacyUndoOperations()) {
            return `Edit ${this.path || 'file'}`;
        }

        return null;
    }

    /**
     * Get the description of the next redo operation (useful for button tooltips)
     */
    public getNextRedoDescription(): string | null {
        if (this.redoStack.length > 0) {
            const lastOp = this.redoStack[this.redoStack.length - 1];
            return lastOp.description || `Batch operation (${lastOp.files.length} files)`;
        }

        // Check legacy operations
        if (this.hasLegacyRedoOperations()) {
            return `Edit ${this.path || 'file'}`;
        }

        return null;
    }

    /**
     * Reset the undo-redo stack
     */
    public reset() {
        this.undoStack = [];
        this.redoStack = [];
        this.currentTransaction = null;
        this.transactionId = null;
    }

    /**
     * Get comprehensive state for UI button management
     */
    public getUIState(): {
        canUndo: boolean;
        canRedo: boolean;
        undoCount: number;
        redoCount: number;
        nextUndoDescription: string | null;
        nextRedoDescription: string | null;
        batchInProgress: boolean;
    } {
        return {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            undoCount: this.getUndoCount(),
            redoCount: this.getRedoCount(),
            nextUndoDescription: this.getNextUndoDescription(),
            nextRedoDescription: this.getNextRedoDescription(),
            batchInProgress: this.isBatchInProgress()
        };
    }

    // ========== PRIVATE HELPER METHODS ==========

    /**
     * Check if there are legacy undo operations available
     */
    private hasLegacyUndoOperations(): boolean {
        if (!this.path) return false;
        const stack = this.legacyUndoStack.get(this.path);
        return stack !== undefined && stack.length > 0;
    }

    /**
     * Check if there are legacy redo operations available
     */
    private hasLegacyRedoOperations(): boolean {
        if (!this.path) return false;
        const stack = this.legacyRedoStack.get(this.path);
        return stack !== undefined && stack.length > 0;
    }

    /**
     * Get count of legacy undo operations
     */
    private getLegacyUndoCount(): number {
        if (!this.path) return 0;
        const stack = this.legacyUndoStack.get(this.path);
        return stack ? stack.length : 0;
    }

    /**
     * Get count of legacy redo operations
     */
    private getLegacyRedoCount(): number {
        if (!this.path) return 0;
        const stack = this.legacyRedoStack.get(this.path);
        return stack ? stack.length : 0;
    }

    // ========== LEGACY METHODS (for backward compatibility) ==========

    public updateContent(filePath: string, fileContent: string) {
        this.path = filePath;
        this.content = fileContent;
        this.currentFiles.set(filePath, fileContent);
    }

    public undo() {
        // Try batch undo first
        const batchResult = this.undoBatch();
        if (batchResult) {
            // Return the content of the current legacy file if it was affected
            return batchResult.get(this.path) || this.content;
        }

        // Fall back to legacy undo
        if (this.legacyUndoStack.get(this.path)?.length) {
            const redoSourceStack = this.legacyRedoStack.get(this.path);
            if (!redoSourceStack) {
                this.legacyRedoStack.set(this.path, [this.content]);
            } else {
                redoSourceStack.push(this.content);
                if (redoSourceStack.length >= this.MAX_STACK_SIZE) {
                    redoSourceStack.shift();
                }
                this.legacyRedoStack.set(this.path, redoSourceStack);
            }
            const lastsource = this.legacyUndoStack.get(this.path)!.pop()!;
            this.updateContent(this.path, lastsource);
            return lastsource;
        }
    }

    public redo() {
        // Try batch redo first
        const batchResult = this.redoBatch();
        if (batchResult) {
            // Return the content of the current legacy file if it was affected
            return batchResult.get(this.path) || this.content;
        }

        // Fall back to legacy redo
        if (this.legacyRedoStack.get(this.path)?.length) {
            const undoSourceStack = this.legacyUndoStack.get(this.path);
            if (undoSourceStack) {
                undoSourceStack.push(this.content);
                if (undoSourceStack.length >= this.MAX_STACK_SIZE) {
                    undoSourceStack.shift();
                }
                this.legacyUndoStack.set(this.path, undoSourceStack);
            }
            const lastUndoSource = this.legacyRedoStack.get(this.path)!.pop()!;
            this.updateContent(this.path, lastUndoSource);
            return lastUndoSource;
        }
    }

    public addModification(source: string) {
        // Use the new batch-aware update method
        if (this.path) {
            this.updateFileContent(this.path, source);
        } else {
            throw new Error('No file path set. Call updateContent() first or use updateFileContent().');
        }
    }

    public getFilePath() {
        return this.path;
    }
}
