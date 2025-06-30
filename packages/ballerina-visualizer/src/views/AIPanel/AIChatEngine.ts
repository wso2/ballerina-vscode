

import { VisualizerLocation, AIPanelAPI } from '@wso2/ballerina-core';
import { AiPanelRpcClient } from "@wso2/ballerina-rpc-client";


interface ChatMessage {
    role: string;
    content: string;
    type: string;
}

export class AIChatEngine {
    private messages: ChatMessage[] = [];
    private aiPanelRpcClient: AiPanelRpcClient;
    private backendUrl: string;

    constructor(aiPanelRpcClient: AiPanelRpcClient) {
        // It will get the token and backend url from rpc client
        // load the history from local storage 
        this.aiPanelRpcClient = aiPanelRpcClient;
    }

    public async getHistory() {
        try {
            this.backendUrl = await this.aiPanelRpcClient.getBackendUrl();
        } catch (error) {
            console.error('Failed to fetch backend URL:', error);
        }
    }

    sendMessage(message: string) {
    }

    generateDocumentation(serviceLocation: Location) {
        // const data: any = this.aiPanelRpcClient.getDocumentationContext(serviceLocation);

    }

    generateTestCases(message: string) {

    }

}
