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

import React from "react";
import { OpenAiIcon } from "../../resources/icons/OpenAiIcon";
import DefaultLlmIcon from "../../resources/icons/DefaultLlmIcon";
import { AzureOpenAiIcon } from "../../resources/icons/AzureOpenAiIcon";
import DeepseekIcon from "../../resources/icons/DeepseekIcon";
import { AnthropicIcon } from "../../resources/icons/AnthropicIcon";
import { MistralAIIcon } from "../../resources/icons/MistralAIIcon";
import { OllamaIcon } from "../../resources/icons/OllamaIcon";
import { Icon } from "@wso2/ui-toolkit";
import { CodeData } from "@wso2/ballerina-core";
import { NodeIcon } from "../NodeIcon";

interface AIModelIconProps {
    type: string;
    codedata?: CodeData;
}

export function AIModelIcon(props: AIModelIconProps): React.ReactElement {
    const { type, codedata } = props;

    if (codedata && isWso2Module(codedata)) {
        return <Icon name="bi-wso2" sx={{ width: 24, height: 24, fontSize: 24 }} />;
    }

    switch (type) {
        case "OpenAiProvider":
        case "ai.openai":
            return <OpenAiIcon />;
        case "AzureOpenAiProvider":
        case "ai.azure":
            return <AzureOpenAiIcon />;
        case "AnthropicProvider":
        case "ai.anthropic":
            return <AnthropicIcon />;
        case "OllamaProvider":
        case "ai.ollama":
            return <OllamaIcon />;
        case "MistralAiProvider":
        case "ai.mistral":
            return <MistralAIIcon />;
        case "DeepseekProvider":
        case "ai.deepseek":
            return <DeepseekIcon />;
        case "ai.milvus":
            return <Icon name="bi-milvus" sx={{ width: 24, height: 24, fontSize: 24, color: "#4fc4f9" }} />;
        case "ai.pinecone":
            return <Icon name="bi-pinecone" sx={{ width: 24, height: 24, fontSize: 24 }} />;
        case "ai.pgvector":
            return <Icon name="bi-postgresql" sx={{ width: 24, height: 24, fontSize: 24 }} />;
        default:
            if (codedata?.node) {
                return <NodeIcon type={codedata?.node} size={24} />;
            }
            return <DefaultLlmIcon />;
    }
}

export function isWso2Module(codedata: CodeData): boolean {
    if (codedata?.module === "ai") {
        if (["Wso2ModelProvider", "Wso2EmbeddingProvider"].includes(codedata.object)) {
            return true;
        }
        if (["getDefaultModelProvider", "getDefaultEmbeddingProvider"].includes(codedata.symbol)) {
            return true;
        }
    }
    return false;
}
