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

import React, { useEffect, useState } from "react";
import { FlowNode, Branch, LinePosition } from "../../utils/types";
import { useDiagramContext } from "../DiagramContext";
import styled from "@emotion/styled";
import { POPUP_BOX_WIDTH } from "../../resources/constants";
import { TextArea, ThemeColors, Codicon, ProgressRing } from "@wso2/ui-toolkit";
import { PopupOverlay } from "../PopupOverlay";

export namespace PopupStyles {
    export const Container = styled.div`
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        width: ${POPUP_BOX_WIDTH}px;
        padding: 8px;
        border-radius: 6px;
        background-color: ${ThemeColors.SURFACE};
        color: ${ThemeColors.ON_SURFACE};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2);
        z-index: 1001;
    `;

    export const Header = styled.div`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    `;

    export const Title = styled.div`
        font-size: 14px;
        font-family: "GilmerMedium";
        margin-bottom: 2px;
        margin-left: 2px;
    `;

    export const CloseButton = styled.div`
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 3px;
        opacity: 0.7;
        transition: opacity 0.2s, background-color 0.2s;

        &:hover {
            opacity: 1;
            background-color: ${ThemeColors.ON_SURFACE}10;
        }
    `;

    export const InfoText = styled.div`
        font-size: 11px;
        font-family: monospace;
        color: ${ThemeColors.ON_SURFACE};
        opacity: 0.7;
    `;

    export const GeneratingContainer = styled.div`
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: ${ThemeColors.ON_SURFACE};
        opacity: 0.8;
    `;
}

interface AddPromptPopupProps {
    node: FlowNode | Branch;
    target: LinePosition;
    onClose: () => void;
}

export function AddPromptPopup(props: AddPromptPopupProps) {
    const { node, target, onClose } = props;
    const { onAddNodePrompt, suggestions } = useDiagramContext();

    const [prompt, setPrompt] = useState("");
    const isGenerating = suggestions?.fetching || false;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            } else if (event.key === "Enter" && !event.shiftKey && !isGenerating) {
                // Enter to generate, Shift+Enter for new line
                event.preventDefault();
                handleAddPrompt();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [prompt, isGenerating]);

    const handleAddPrompt = () => {
        if (!prompt.trim()) {
            return;
        }

        if (!target) {
            console.error(">>> AddPromptPopup: AddPromptPopup: target not found");
            return;
        }

        onAddNodePrompt(node, { startLine: target, endLine: target }, prompt);
        // No need to close - diagram will rerender and popup will disappear
    };

    const handleOnPromptChange = (value: string) => {
        setPrompt(value);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // Prevent mouse events from propagating to the canvas
        e.stopPropagation();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        // Prevent mouse move events from propagating to the canvas
        e.stopPropagation();
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        // Prevent mouse up events from propagating to the canvas
        e.stopPropagation();
    };

    const handleWheel = (e: React.WheelEvent) => {
        // Prevent wheel events from propagating to the canvas
        e.stopPropagation();
    };

    return (
        <>
            <PopupOverlay onClose={onClose} />
            <PopupStyles.Container
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
            >
                <PopupStyles.Header>
                    <PopupStyles.Title>Generate Node</PopupStyles.Title>
                    <PopupStyles.CloseButton onClick={onClose} title="Close (Esc)">
                        <Codicon name="close" />
                    </PopupStyles.CloseButton>
                </PopupStyles.Header>

                <TextArea
                    placeholder="Enter a prompt to generate next node"
                    value={prompt}
                    onTextChange={handleOnPromptChange}
                    rows={4}
                    resize="vertical"
                    autoFocus
                    disabled={isGenerating}
                    sx={{ width: "100%" }}
                />

                {!isGenerating ? (
                    <PopupStyles.InfoText>Press Enter to generate node. Press Esc to cancel.</PopupStyles.InfoText>
                ) : (
                    <PopupStyles.GeneratingContainer>
                        <ProgressRing sx={{ width: 14, height: 14 }} />
                        <span>Generating nodes...</span>
                    </PopupStyles.GeneratingContainer>
                )}
            </PopupStyles.Container>
        </>
    );
}

export default AddPromptPopup;
