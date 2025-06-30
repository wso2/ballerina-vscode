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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */

import styled from "@emotion/styled";
import { Icon } from "@wso2/ui-toolkit";
import { useState, useEffect } from "react";

export const PreviewContainerDefault = styled.div`
    font-size: 0.6em;
    padding: 2px 5px;
    border-radius: 3px;
    display: inline-block;
    position: relative;
    right: 0;
    top: 10px;
    margin-right: -20px;
`;

export const PreviewContainer = styled.div`
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    font-size: 0.8em; 
    padding: 2px 5px; 
    border-radius: 3px; 
    display: inline-block; 
    margin-left: 2px; 
`;

interface RoleContainerProps {
    icon: string;
    title: string;
    showPreview: boolean;
    isLoading: boolean;
}

const RoleContainer: React.FC<RoleContainerProps> = ({ icon, title, showPreview, isLoading }) => {
    const [generatingText, setGeneratingText] = useState("Generating.");

    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setGeneratingText((prev) => {
                    if (prev === "Generating...") return "Generating.";
                    return prev + ".";
                });
            }, 500);

            return () => clearInterval(interval);
        }
    }, [isLoading]);

    return (
        <div style={{ display: "flex", flexDirection: "row", gap: "6px" }}>
            <Icon
                name={icon}
                sx={{ width: 24, height: 24 }}
                iconSx={{ fontSize: "18px", color: "var(--vscode-foreground)", cursor: "default" }}
            />
            <h3 style={{ margin: 0 }}>{title}</h3>
            {showPreview && <PreviewContainer>Preview</PreviewContainer>}
            {isLoading && <span style={{ color: "var(--vscode-input-placeholderForeground)" }}>{generatingText}</span>}
        </div>
    );
};

export default RoleContainer;
