/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { AIPanelPrompt } from "@wso2/ballerina-core";
import type { QuickPickItem } from "vscode";

/**
 * Available options for the Try It dropdown in the Service and Resource designers.
 */
export enum TryItOptionValue {
    TRY_IT = "try-it",
    TRY_IT_WITH_AI = "try-it-with-ai",
}

export interface TryItDropdownOption {
    title: string;
    description: string;
    value: TryItOptionValue;
    iconName: string;
    iconIsCodicon?: boolean;
}

export interface TryItQuickPickItem extends QuickPickItem {
    value: TryItOptionValue;
}

export function getTryItAIDefaultPromptResource(methodValue: string, pathValue: string, serviceName: string, basePath: string): AIPanelPrompt {
    return {
        type: "text" as const,
        text: "",
        planMode: false,
        suggestedCommandTemplates: [
            {
                type: "text" as const,
                text: `Try out the ${methodValue} ${pathValue} resource in the ${serviceName} ${basePath ? `at base path ${basePath}` : ''}`,
                planMode: false,
            },
            {
                type: "text" as const,
                text: `Try out the following scenario on the ${methodValue} ${pathValue} resource in the ${serviceName} ${basePath ? `at base path ${basePath}` : ''} : \n`,
                planMode: false,
            }
        ],
        inputPlaceholder: "Describe your try it scenario...",
    }
}

export function getTryItAIDefaultPromptService(serviceName: string, basePath: string): AIPanelPrompt {
    return {
        type: "text" as const,
        text: "",
        planMode: false,
        suggestedCommandTemplates: [
            {
                type: "text" as const,
                text: `Try out the ${serviceName} ${basePath ? `at base path ${basePath}` : ''}`,
                planMode: false
            },
            {
                type: "text" as const,
                text: `Try out the following scenario on the ${serviceName} ${basePath ? `at base path ${basePath}` : ''} : \n`,
                planMode: false
            }
        ],
        inputPlaceholder: "Describe your try it scenario..."
    }
}

export function getTryItDropdownOptions(context: "service" | "resource"): TryItDropdownOption[] {

    return [
        {
            title: "Try It",
            description: `Try ${context} with Hurl Client`,
            value: TryItOptionValue.TRY_IT,
            iconName: "play",
            iconIsCodicon: true,
        },
        {
            title: "Try It with AI",
            description: `Describe your try it scenario to AI`,
            value: TryItOptionValue.TRY_IT_WITH_AI,
            iconName: "bi-ai-chat",
        },
    ];
}
