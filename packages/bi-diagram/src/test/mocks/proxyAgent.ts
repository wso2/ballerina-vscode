/**
 * Minimal no-op proxy agents for Jest/jsdom tests.
 * Proxy support is not required in these unit tests.
 */
export class HttpProxyAgent {
    constructor(..._args: unknown[]) {}
}

export class HttpsProxyAgent {
    constructor(..._args: unknown[]) {}
}

export default HttpProxyAgent;
