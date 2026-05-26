import {
    ProtocolConnection
} from 'vscode-languageserver-protocol';

export interface LSConnection {
    getProtocolConnection: () => ProtocolConnection;
    stop: () => Promise<void>;
}