import { ChatNotify, ChatContent } from "@wso2/ballerina-core";
import { sendContentAppendNotification, sendContentReplaceNotification, sendDiagnosticMessageNotification, sendErrorNotification, sendMessagesNotification, sendMessageStartNotification, sendMessageStopNotification, sendTestGenIntermidateStateNotification } from "./utils";

export type CopilotEventHandler = (event: ChatNotify) => void;

// Event listener that handles events and sends notifications
export function createWebviewEventHandler(): CopilotEventHandler {
    return (event: ChatNotify) => {
        switch (event.type) {
            case 'start':
                sendMessageStartNotification();
                break;
            case 'content_block':
                sendContentAppendNotification(event.content);
                break;
            case 'content_replace':
                sendContentReplaceNotification(event.content);
                break;
            case 'error':
                sendErrorNotification(event.content);
                break;
            case 'stop':
                sendMessageStopNotification();
                break;
            case 'intermediary_state':
                sendTestGenIntermidateStateNotification(event.state);
                break;
            case 'messages':
                sendMessagesNotification(event.messages);
                break;
            case 'diagnostics':
                sendDiagnosticMessageNotification(event.diagnostics);
                break;
            default:
                console.warn(`Unhandled event type: ${event}`);
                break;
        }
    };
}
