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

import React, { CSSProperties } from "react";
import { Icon } from "@wso2/ui-toolkit";
import { ApiIcon } from "../../resources";
import OpenAiIcon from "../../resources/icons/OpenAiIcon";
import AzureOpenAiIcon from "../../resources/icons/AzureOpenAiIcon";
import AnthropicIcon from "../../resources/icons/AnthropicIcon";
import OllamaIcon from "../../resources/icons/OllamaIcon";
import MistralAIIcon from "../../resources/icons/MistralAIIcon";
import DeepseekIcon from "../../resources/icons/DeepseekIcon";
import DefaultLlmIcon from "../../resources/icons/DefaultLlmIcon";
import { CodeData } from "@wso2/ballerina-core";
import { isWso2Module } from "../AIModelIcon";

interface ConnectorIconProps {
    url?: string;
    fallbackIcon?: React.ReactNode;
    style?: CSSProperties; // Custom style for images
    className?: string;
    codedata?: CodeData;
    connectorType?: string;
}

export function ConnectorIcon(props: ConnectorIconProps): React.ReactElement {
    const { url, fallbackIcon, className, style, codedata, connectorType } = props;
    const [imageError, setImageError] = React.useState(false);

    // use custom icon for persist connections (database)
    if (connectorType === "persist") {
        return <Icon name="bi-db" className={className} sx={{ width: 24, height: 24, fontSize: 24, ...style }} />;
    }

    // use custom icon for http
    if (url?.includes("ballerina_http_")) {
        return <Icon name="bi-globe" className={className} sx={{ width: 24, height: 24, fontSize: 24, ...style }} />;
    }

    // use custom icon for ai model providers
    const aiModules = ["ai.openai", "ai.azure", "ai.anthropic", "ai.ollama", "ai.mistral", "ai.deepseek"];
    if (aiModules.some((module) => url?.includes(module))) {
        const selectedModule = aiModules.find((module) => url?.includes(module));
        return getLlmModelIcons(selectedModule);
    }

    // use custom icon for mcp
    if (url?.includes("mcp")) {
        return <Icon name="bi-mcp" className={className} sx={{ width: 24, height: 24, fontSize: 24, ...style }} />;
    }

    // use custom icon for wso2 module
    if (codedata && isWso2Module(codedata) || url?.includes("wso2_icon")) {
        return <Icon name="bi-wso2" className={className} sx={{ width: 24, height: 24, fontSize: 24, ...style }} />;
    }

    // use custom icon for ai module
    if (url?.includes("ballerinax_ai_") || url?.includes("ballerina_ai")) {
        return <Icon name="bi-ai-model" className={className} sx={{ width: 24, height: 24, fontSize: 24, ...style }} />;
    }

    if (url && isValidUrl(url) && !imageError) {
        return <img src={url} className={className} onError={() => setImageError(true)} style={{ ...style }} />;
    }

    if (codedata && (codedata.node === "AGENT_CALL" || codedata.node === "AGENT_RUN")) {
        return <Icon name="bi-ai-agent" className={className} sx={{ width: 24, height: 24, fontSize: 24, ...style }} />;
    }

    if (fallbackIcon) {
        return <div className={className}>{fallbackIcon}</div>;
    }

    return (
        <div style={style} className={className}>
            <ApiIcon />
        </div>
    );
}

function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

// get llm model icons
// this should replace with CDN icons
export function getLlmModelIcons(modelType: string) {
    switch (modelType) {
        case "OpenAiProvider":
        case "ai.openai":
            return <OpenAiIcon />;
        case "AzureOpenAiProvider":
        case "OpenAiModelProvider":
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
        case "Wso2ModelProvider":
            return <Icon name="bi-wso2" sx={{ width: 24, height: 24, fontSize: 24 }} />;
        default:
            return <DefaultLlmIcon />;
    }
}

export default ConnectorIcon;
