/* eslint-disable @typescript-eslint/no-explicit-any */

import { StdioConnection } from "./StdioConnection";
import { Server } from "ws";
import { toSocket } from "vscode-ws-jsonrpc";
import * as serverRPC from "vscode-ws-jsonrpc/lib/server";

const port = 9095;

export function startBallerinaLS() {
    const wsServer = new Server({ port });
    wsServer.on("connection", (socket: WebSocket) => {
        // start lang-server process
        const stdioConnection = new StdioConnection();
        // tslint:disable-next-line: no-console
        console.log("Established new connection")

        const serverConnection = serverRPC.createProcessStreamConnection(stdioConnection.getChildProcess());
        // forward websocket messages to stdio of ls process
        const clientConnection = serverRPC.createWebSocketConnection(toSocket(socket));
        serverRPC.forward(clientConnection, serverConnection);

        stdioConnection.getChildProcess().on("exit", () => {
            // process.exit(0);
        })

        socket.onclose = () => {
            stdioConnection.stop();
        };
        socket.onerror = () => {
            stdioConnection.stop();
        };
    });
    return wsServer;
}
