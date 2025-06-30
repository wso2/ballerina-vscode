/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    InitializeRequest, InitializeResult, ProtocolConnection,
    Trace, DidOpenTextDocumentNotification,
    DidOpenTextDocumentParams, InitializedNotification, PublishDiagnosticsNotification, PublishDiagnosticsParams,
    DidCloseTextDocumentParams, DidCloseTextDocumentNotification
} from 'vscode-languageserver-protocol';
import { BLCTracer } from "./BLCTracer";
import { initializeRequest } from "./messages"
import { LSConnection } from "./LSConnection";
import { SyntaxTreeParams, SyntaxTree } from "../interfaces/extended-lang-client";

interface IBallerinaLangClient {
    didOpen: (Params: DidOpenTextDocumentParams) => void;
    didClose: (params: DidCloseTextDocumentParams) => void;
    getSyntaxTree: (params: SyntaxTreeParams) => Thenable<SyntaxTree>;
}

export class BallerinaLanguageClient implements IBallerinaLangClient {

    private _id: number = 1;
    private _name: string = "ballerina";
    private _lsConnection: LSConnection;
    private _clientConnection: ProtocolConnection;

    private _ready: any = null;
    private _initializedError: any = null;
    private _onReady: Promise<void>;
    private _diagnostics?: PublishDiagnosticsParams;
    private _diagnosticsReceived: Promise<void>;
    private _diagnosticsReady: any = null;
    private _diagnosticsError: any = null;

    // constructor
    public constructor(connection: LSConnection) {
        this._lsConnection = connection;
        this._id = 1;
        this._clientConnection = connection.getProtocolConnection();
        this._clientConnection.trace(Trace.Verbose, new BLCTracer());
        this._clientConnection.listen();
        this._onReady = new Promise((resolve, reject) => {
            this._ready = resolve;
            this._initializedError = reject;
        });
        this._diagnosticsReceived = new Promise((resolve, reject) => {
            this._diagnosticsReady = resolve;
            this._diagnosticsError = reject;
        });
        // Send the initializzation request
        this.initialize();
    }

    public onReady(): Promise<void> {
        return this._onReady;
    }

    private initialize() {
        this._clientConnection.sendRequest(InitializeRequest.type, initializeRequest(this._id)).then((result: InitializeResult) => {
            this._clientConnection.sendNotification(InitializedNotification.type, {});
            this._clientConnection.onNotification(PublishDiagnosticsNotification.type, this.handleDiagnostics);
            this._ready();
        });
    }

    private handleDiagnostics(diagnostics: PublishDiagnosticsParams) {
        this._diagnostics = diagnostics
    }

    public didOpen(params: DidOpenTextDocumentParams) {
        this._clientConnection.sendNotification(DidOpenTextDocumentNotification.type, params);
    }

    public didClose(params: DidCloseTextDocumentParams) {
        this._clientConnection.sendNotification(DidCloseTextDocumentNotification.type, params);
    }

    public getSyntaxTree(params: SyntaxTreeParams): Thenable<SyntaxTree> {
        return this._clientConnection.sendRequest<SyntaxTree>("ballerinaDocument/syntaxTree", params);
    }
}
