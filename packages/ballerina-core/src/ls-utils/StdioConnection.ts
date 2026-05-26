/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    createProtocolConnection, ProtocolConnection
} from 'vscode-languageserver-protocol';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node'
import { LSConnection } from "./LSConnection";
import { ChildProcess, spawn } from "child_process";
import * as kill from "tree-kill";


export class StdioConnection implements LSConnection {

    private _connection: ProtocolConnection;
    private _lsProcess: any;

    constructor() {
        this._lsProcess = spawn('bal', ['start-language-server']);
        this._connection = createProtocolConnection(
            new StreamMessageReader(this._lsProcess.stdout),
            new StreamMessageWriter(this._lsProcess.stdin),
        );
    }

    stop(): Promise<void> {
        return new Promise<void>((resolve) => {
            this._lsProcess.on("exit", () => {
                // tslint:disable-next-line: no-console
                console.log("LS process killed");
                resolve();
            });
            kill.default(this._lsProcess.pid);
        });
    }


    getProtocolConnection(): ProtocolConnection {
        return this._connection;
    }

    getChildProcess(): ChildProcess {
        return this._lsProcess;
    }
}
