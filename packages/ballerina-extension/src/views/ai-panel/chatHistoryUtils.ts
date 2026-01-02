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

import { ChatMessage } from '@wso2/ballerina-core/lib/state-machine-types';
import { generateId } from './idGenerators';

/**
 * Adds a user message to the chat history
 * @param history The current chat history
 * @param content The user message content
 * @returns Updated chat history with the new message
 */
export const addUserMessage = (
    history: ChatMessage[],
    content: string
): ChatMessage[] => {
    const lastMessage = history[history.length - 1];
    const baseHistory = lastMessage && !lastMessage.uiResponse && lastMessage.modelMessages.length === 0
        ? history.slice(0, -1)
        : history;

    return [
        ...baseHistory,
        {
            id: generateId(),
            content,
            uiResponse: '',
            modelMessages: [],
            timestamp: Date.now(),
        },
    ];
};

/**
 * Updates a specific chat message in the history
 * @param history The current chat history
 * @param id The ID of the message to update
 * @param updates The updates to apply to the message
 * @returns Updated chat history
 */
export const updateChatMessage = (
    history: ChatMessage[],
    id: string,
    updates: {
        uiResponse?: string;
        modelMessages?: any[];
    }
): ChatMessage[] => {
    return history.map(msg => {
        if (msg.id === id) {
            return {
                ...msg,
                uiResponse: updates.uiResponse !== undefined ? updates.uiResponse : msg.uiResponse,
                modelMessages: updates.modelMessages !== undefined ? updates.modelMessages : msg.modelMessages,
            };
        }
        return msg;
    });
};
