/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tracer } from 'vscode-languageserver-protocol';

export class BLCTracer implements Tracer {
    log(dataObject: any): void;
    log(message: string, data?: string): void;
    log(message: any, data?: any): void {
        // tslint:disable-next-line: no-console
        console.log(message, data);
    }
}
