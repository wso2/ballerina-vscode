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

import {
    debug, DebugAdapterTracker, DebugAdapterTrackerFactory, DebugConfiguration, DebugSession, NotebookCell,
    NotebookCellKind, NotebookRange, ProviderResult, SourceBreakpoint, Uri, workspace, WorkspaceFolder
} from "vscode";
import fileUriToPath from "file-uri-to-path";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, join } from "path";
import { DebugProtocol } from "vscode-debugprotocol";
import { BallerinaExtension, LANGUAGE } from "../../core";
import { DEBUG_REQUEST } from "../../features/debugger";
import { BAL_NOTEBOOK, NOTEBOOK_CELL_SCHEME } from "./constants";
import { getSmallerMax } from "./utils";

let tmpDirectory: string;
let tmpFile: string;
let debugCellInfoHandler: DebugCellInfoHandler | undefined = undefined;
let runningNotebookDebug = false;
let breakpointList: SourceBreakpoint[] = [];

export class NotebookDebuggerController {

    constructor(private extensionInstance: BallerinaExtension) { }

    async startDebugging(cell: NotebookCell): Promise<boolean> {
        runningNotebookDebug = true;
        const fileToRunDebug = this.dumpNotebookCell(cell);
        const uriToRunDebug = Uri.file(fileToRunDebug);
        const workspaceFolder: WorkspaceFolder | undefined = workspace.getWorkspaceFolder(uriToRunDebug);
        const debugConfig: DebugConfiguration = this.constructDebugConfig(uriToRunDebug);

        debug.onDidTerminateDebugSession(() => runningNotebookDebug = false);
        debug.onDidChangeBreakpoints((breakpointChangeEvent) => {
            for (const addedBP of breakpointChangeEvent.added) {
                if (addedBP instanceof SourceBreakpoint && !breakpointList.includes(addedBP)) {
                    breakpointList.push(addedBP);
                }
            }
            for (const removedBP of breakpointChangeEvent.removed) {
                breakpointList = breakpointList.filter(bp => bp.id !== removedBP.id);
            }
        });

        return debug.startDebugging(workspaceFolder, debugConfig);
    }

    constructDebugConfig(uri: Uri): DebugConfiguration {
        const debugConfig: DebugConfiguration = {
            type: LANGUAGE.BALLERINA,
            name: "Ballerina Notebook Debug",
            request: DEBUG_REQUEST.LAUNCH,
            script: fileUriToPath(uri.toString()),
            networkLogs: false,
            debugServer: '10001',
            debuggeePort: '5010',
            'ballerina.home': this.extensionInstance.getBallerinaHome(),
            'ballerina.command': this.extensionInstance.getBallerinaCmd(),
            debugTests: false,
            tests: [],
            configEnv: undefined,
            capabilities: { supportsReadOnlyEditors: true }
        };
        return debugConfig;
    }

    dumpNotebookCell(debugCell: NotebookCell): string {
        debugCellInfoHandler = new DebugCellInfoHandler(debugCell);
        const filename = basename(debugCell.document.uri.fsPath);
        tmpFile = `${getTempDir()}/${filename.substring(0, filename.length - BAL_NOTEBOOK.length)}_notebook.bal`;
        let contentToWrite = "";
        let nextLineToWrite = 0;
        const cells = debugCell.notebook.getCells(new NotebookRange(0, debugCell.index + 1));
        cells.forEach(cell => {
            if (cell.kind === NotebookCellKind.Code && cell.executionSummary?.success) {
                contentToWrite += debugCell.document.uri === cell.document.uri
                    ? "public function main() {" + cell.document.getText() + "\n}"
                    : cell.document.getText() + "\n";
                debugCellInfoHandler?.addLineToCell(nextLineToWrite, cell);
                nextLineToWrite += cell.document.lineCount;
            }
        });
        writeFileSync(tmpFile, contentToWrite);
        return tmpFile;
    }
}

export class BallerinaDebugAdapterTrackerFactory implements DebugAdapterTrackerFactory {

    private eventHandlers = [
        {
            event: "breakpoint",
            handle: (event: DebugProtocol.Event) => {
                const breakpointEvent = <DebugProtocol.BreakpointEvent>event;
                const breakpoint = breakpointEvent.body.breakpoint;
                const cellInfo = debugCellInfoHandler?.getCellForLine(breakpoint.line!);
                if (cellInfo && cellInfo.cell) {
                    breakpoint.source!.path = cellInfo.cell.document.uri.toString();
                    breakpoint.source!.name = basename(cellInfo.cell.document.uri.fsPath);
                    const cellIndex = cellInfo.cell.index;
                    if (cellIndex >= 0) {
                        breakpoint.source!.name += `, Cell ${cellIndex + 1}`;
                    }
                    breakpoint.line! -= cellInfo.line;
                }
            }
        },
    ];

    private requestHandlers = [
        {
            command: "setBreakpoints",
            handle: (request: DebugProtocol.Request) => {
                const setBreakpointsArguments = <DebugProtocol.SetBreakpointsArguments>request.arguments;
                const source = setBreakpointsArguments.source;
                if (source?.path?.startsWith(NOTEBOOK_CELL_SCHEME)) {
                    const breakpoints = setBreakpointsArguments.breakpoints ?? [];
                    breakpoints.forEach(breakpoint => {
                        breakpoint.line += debugCellInfoHandler?.getCellStartLine(source.path!)!;
                    });
                    // not including breakpoints in other notebooks
                    if (source.name && source.name.endsWith(BAL_NOTEBOOK) && debugCellInfoHandler &&
                        source.name !== basename(debugCellInfoHandler.getDebugRanCell().document.uri.fsPath)) {
                        breakpoints.length = 0;
                    }
                    // make sure all breakpoints in current notebook are added in every request
                    breakpointList.forEach(breakpoint => {
                        if (!debugCellInfoHandler ||
                            basename(breakpoint.location.uri.fsPath) !== basename(debugCellInfoHandler.getDebugRanCell().document.uri.fsPath)) {
                            return;
                        }
                        let line = breakpoint.location.range.end.line + 1;
                        line += debugCellInfoHandler.getCellStartLine(breakpoint.location.uri.toString())!;
                        const newBreakPoint = { line };
                        (breakpoints.findIndex(bp => bp.line === line) === -1) && breakpoints.push(newBreakPoint);
                    });
                    source.path = tmpFile;
                }
            }
        },
        {
            command: "source",
            handle: (request: DebugProtocol.Request) => {
                const sourceArguments = <DebugProtocol.SourceArguments>request.arguments;
                const source = sourceArguments.source;
                if (source?.path?.startsWith(NOTEBOOK_CELL_SCHEME)) {
                    source.path = tmpFile;
                }
            }
        },
    ];

    private responseHandlers = [
        {
            command: "setBreakpoints",
            handle: (response: DebugProtocol.Response) => {
                const setBreakpointsResponse = <DebugProtocol.SetBreakpointsResponse>response;
                const breakpoints = setBreakpointsResponse.body.breakpoints;
                breakpoints.forEach(breakpoint => {
                    if (!breakpoint.source?.name?.endsWith(BAL_NOTEBOOK)) {
                        return;
                    }
                    const cellInfo = debugCellInfoHandler?.getCellForLine(breakpoint.line!);
                    if (cellInfo && cellInfo.cell) {
                        breakpoint.source!.path = cellInfo.cell.document.uri.toString();
                        breakpoint.source!.name = basename(cellInfo.cell.document.uri.fsPath);
                        const cellIndex = cellInfo.cell.index;
                        if (cellIndex >= 0) {
                            breakpoint.source!.name += `, Cell ${cellIndex + 1}`;
                        }
                        breakpoint.line! -= cellInfo.line;
                    }
                });
            }
        },
        {
            command: "stackTrace",
            handle: (response: DebugProtocol.Response) => {
                const stackTraceResponse = <DebugProtocol.StackTraceResponse>response;
                const stackFrames = stackTraceResponse.body.stackFrames;
                stackFrames.forEach(stackFrame => {
                    const cellInfo = debugCellInfoHandler?.getCellForLine(stackFrame.line);
                    if (cellInfo && cellInfo.cell) {
                        stackFrame.source!.path = cellInfo.cell.document.uri.toString();
                        stackFrame.source!.name = basename(cellInfo.cell.document.uri.fsPath);
                        const cellIndex = cellInfo.cell.index;
                        if (cellIndex >= 0) {
                            stackFrame.source!.name += `, Cell ${cellIndex + 1}`;
                        }
                        stackFrame.line! -= cellInfo.line;
                    }
                });
            }
        },
    ];

    createDebugAdapterTracker(_session: DebugSession): ProviderResult<DebugAdapterTracker> {
        return {
            // VS Code -> Debug Adapter
            onWillReceiveMessage: (message: DebugProtocol.ProtocolMessage) => {
                this.visitSources(message);
            },
            // Debug Adapter -> VS Code
            onDidSendMessage: (message: DebugProtocol.ProtocolMessage) => {
                this.visitSources(message);
            },
            onExit: (_code: number | undefined, _signal: string | undefined) => {
                runningNotebookDebug = false;
                breakpointList = [];
                debugCellInfoHandler = undefined;
            }
        };
    }

    private visitSources(msg: DebugProtocol.ProtocolMessage): void {
        if (!runningNotebookDebug) {
            return;
        }
        let handler: any = undefined;
        switch (msg.type) {
            case 'event':
                const event = <DebugProtocol.Event>msg;
                handler = this.eventHandlers.find(eventHandler => eventHandler.event === event.event);
                handler && handler.handle(event);
                break;
            case 'request':
                const request = <DebugProtocol.Request>msg;
                handler = this.requestHandlers.find(requestHandler => requestHandler.command === request.command);
                handler && handler.handle(request);
                break;
            case 'response':
                const response = <DebugProtocol.Response>msg;
                if (response.success) {
                    handler = this.responseHandlers.find(respHandler => respHandler.command === response.command);
                    handler && handler.handle(response);
                }
                break;
        }
    }
}

class DebugCellInfoHandler {
    private lineToCell: Map<number, NotebookCell>;

    constructor(private currentCell: NotebookCell) {
        this.lineToCell = new Map();
    }

    addLineToCell(lineNumber: number, cell: NotebookCell) {
        this.lineToCell.set(lineNumber, cell);
    }

    getDebugRanCell() {
        return this.currentCell;
    }

    getCellForLine(lineNumber: number) {
        const line = getSmallerMax(Array.from(this.lineToCell.keys()), lineNumber);
        return (typeof line === 'undefined' || line === null)
            ? { line: lineNumber, cell: this.currentCell }
            : { line, cell: this.lineToCell.get(line)! };
    }

    getCellStartLine(path: string) {
        for (const [line, cell] of this.lineToCell.entries()) {
            if (path === cell.document.uri.toString()) {
                return line;
            }
        }
        return 0;
    }
}

export function getTempDir(): string {
    if (!tmpDirectory) {
        tmpDirectory = mkdtempSync(join(tmpdir(), 'ballerina-notebook-'));
    }
    return tmpDirectory;
}

export function getTempFile(): string {
    return tmpFile;
}
