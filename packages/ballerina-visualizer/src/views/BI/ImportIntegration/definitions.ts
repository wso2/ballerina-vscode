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

export const INTEGRATION_CONFIGS = {
    mulesoft: {
        title: "MuleSoft",
        parameters: [
            // {
            //     key: "keepStructure",
            //     label: "Preserve Original Process Flow",
            //     type: "boolean" as const,
            //     defaultValue: false,
            // },
            // {
            //     key: "multiRoot",
            //     label: "Treat each Directory as a Separate Project",
            //     type: "boolean" as const,
            //     defaultValue: false,
            // },
        ],
    },
    tibco: {
        title: "TIBCO",
        parameters: [
            // {
            //     key: "keepStructure",
            //     label: "Preserve Original Process Flow",
            //     type: "boolean" as const,
            //     defaultValue: false,
            // },
            // {
            //     key: "multiRoot",
            //     label: "Treat each Directory as a Separate Project",
            //     type: "boolean" as const,
            //     defaultValue: false,
            // },
        ],
    },
    "logic-apps": {
        title: "Logic Apps",
        parameters: [
            {
                key: "keepStructure",
                label: "Preserve Original Process Flow",
                type: "boolean" as const,
                defaultValue: false,
            },
            {
                key: "multiRoot",
                label: "Treat each Directory as a Separate Project",
                type: "boolean" as const,
                defaultValue: false,
            },
            {
                key: "prompt",
                label: "Describe the Logic App for AI Conversion",
                type: "string" as const,
                defaultValue: "",
            },
        ],
    },
} as const;
