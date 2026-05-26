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

import { useCallback, useState } from 'react';
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { DiagnosticEntry } from "@wso2/ballerina-core";
import { getConvoHistoryForFeedback } from "../utils/feedback";

interface UseFeedbackOptions {
    messages: Array<{ role: string; content: string; type: string }>;
    currentDiagnosticsRef: React.MutableRefObject<DiagnosticEntry[]>;
}

export const useFeedback = ({ messages, currentDiagnosticsRef }: UseFeedbackOptions) => {
    const { rpcClient } = useRpcContext();
    const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);

    const handleFeedback = useCallback(async (index: number, isPositive: boolean, detailedFeedback?: string) => {
        // Store feedback in local state
        setFeedbackGiven(isPositive ? 'positive' : 'negative');

        try {
            // Parse all messages up to the current index to extract input badges
            const parsedInputs = getConvoHistoryForFeedback(messages, index, isPositive);
            await rpcClient.getAiPanelRpcClient().submitFeedback({
                positive: isPositive,
                messages: parsedInputs,
                feedbackText: detailedFeedback,
                diagnostics: currentDiagnosticsRef.current
            });
        } catch (error) {
            console.error("Failed to send feedback:", error);
        }
    }, [messages, currentDiagnosticsRef, rpcClient]);

    return {
        feedbackGiven,
        setFeedbackGiven,
        handleFeedback
    };
};
