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
export class UndoRedoManager {
    path: string;
    content: string;
    undoStack: Map<string, string[]>;
    redoStack: Map<string, string[]>;

    constructor() {
        this.undoStack = new Map();
        this.redoStack = new Map();
    }

    public updateContent(filePath: string, fileContent: string) {
        this.path = filePath;
        this.content = fileContent;
    }

    public undo() {
        if (this.undoStack.get(this.path)?.length) {
            const redoSourceStack = this.redoStack.get(this.path);
            if (!redoSourceStack) {
                this.redoStack.set(this.path, [this.content]);
            } else {
                redoSourceStack.push(this.content);
                if (redoSourceStack.length >= 100) {
                    redoSourceStack.shift();
                }
                this.redoStack.set(this.path, redoSourceStack);
            }
            const lastsource = this.undoStack.get(this.path).pop();
            this.updateContent(this.path, lastsource)
            return lastsource;
        }
    }

    public redo() {
        if (this.redoStack.get(this.path)?.length) {
            const undoSourceStack = this.undoStack.get(this.path);
            undoSourceStack.push(this.content);
            if (undoSourceStack.length >= 100) {
                undoSourceStack.shift();
            }
            this.undoStack.set(this.path, undoSourceStack);
            const lastUndoSource = this.redoStack.get(this.path).pop();
            this.updateContent(this.path, lastUndoSource)
            return lastUndoSource;
        }
    }

    public addModification(source: string) {
        const sourcestack = this.undoStack.get(this.path);
        if (!sourcestack) {
            this.undoStack.set(this.path, [this.content]);
        } else {
            sourcestack.push(this.content);
            if (sourcestack.length >= 100) {
                sourcestack.shift();
            }
            this.undoStack.set(this.path, sourcestack);
        }
        this.content = source;
    }

    public getFilePath() {
        return(this.path);
    }
}
