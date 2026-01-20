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

import { useEffect, useState, useCallback } from "react";
import { HelperPaneState } from "../types";
import { calculateHelperPanePosition } from "../utils";

export interface UseHelperPaneClickOutsideConfig {
    enabled: boolean;
    refs: {
        editor: React.RefObject<HTMLElement>;
        helperPane: React.RefObject<HTMLElement>;
        toggleButton: React.RefObject<HTMLElement>;
        toolbar?: React.RefObject<HTMLElement>;
    };
    onClickOutside: () => void;
    onEscapeKey: () => void;
}

// Hook to handle click outside and escape key press
export const useHelperPaneClickOutside = (config: UseHelperPaneClickOutsideConfig): void => {
    const { enabled, refs, onClickOutside, onEscapeKey } = config;

    useEffect(() => {
        if (!enabled) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            const isClickInsideEditor = refs.editor.current?.contains(target);
            const isClickInsideHelperPane = refs.helperPane.current?.contains(target);
            const isClickOnToggleButton = refs.toggleButton.current?.contains(target);
            const isClickInsideToolbar = refs.toolbar?.current?.contains(target);

            if (!isClickInsideEditor && !isClickInsideHelperPane && !isClickOnToggleButton && !isClickInsideToolbar) {
                onClickOutside();
            }
        };

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onEscapeKey();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [enabled, refs.editor, refs.helperPane, refs.toggleButton, refs.toolbar, onClickOutside, onEscapeKey]);
};

export interface HelperPaneStateChangeCallback {
    isOpen: boolean;
    ref: React.RefObject<HTMLButtonElement>;
    toggle: () => void;
}

export interface UseHelperPaneConfig {
    editorRef: React.RefObject<HTMLDivElement>;
    toggleButtonRef: React.RefObject<HTMLButtonElement>;
    helperPaneWidth: number;
    onStateChange?: (state: HelperPaneStateChangeCallback) => void;
    customManualToggle?: (setHelperPaneState: React.Dispatch<React.SetStateAction<HelperPaneState>>) => void;
}

export interface UseHelperPaneReturn {
    helperPaneState: HelperPaneState;
    setHelperPaneState: React.Dispatch<React.SetStateAction<HelperPaneState>>;
    handleManualToggle: () => void;
    handleKeyboardToggle: () => boolean;
}

// Function to get cursor coordinates - abstracts over CodeMirror vs ProseMirror
export type GetCursorCoords = () => { bottom: number; left: number } | null;

// Hook to manage helper pane state and toggle handlers
export const useHelperPane = (
    config: UseHelperPaneConfig,
    getCursorCoords: GetCursorCoords
): UseHelperPaneReturn => {
    const { editorRef, toggleButtonRef, helperPaneWidth, onStateChange, customManualToggle } = config;

    const [helperPaneState, setHelperPaneState] = useState<HelperPaneState>({
        isOpen: false,
        top: 0,
        left: 0
    });

    const handleManualToggle = useCallback(() => {
        if (customManualToggle) {
            customManualToggle(setHelperPaneState);
            return;
        }

        if (!toggleButtonRef?.current || !editorRef?.current) return;

        setHelperPaneState(prev => {
            if (prev.isOpen) {
                return { ...prev, isOpen: false };
            }

            const buttonRect = toggleButtonRef.current!.getBoundingClientRect();
            const editorRect = editorRef.current!.getBoundingClientRect();
            const scrollTop = editorRef.current!.scrollTop || 0;
            const position = calculateHelperPanePosition(buttonRect, editorRect, helperPaneWidth, scrollTop);

            return { ...prev, ...position, isOpen: true };
        });
    }, [customManualToggle, toggleButtonRef, editorRef, helperPaneWidth]);

    const handleKeyboardToggle = useCallback((): boolean => {
        if (!editorRef?.current) return false;

        setHelperPaneState(prev => {
            if (prev.isOpen) {
                return { ...prev, isOpen: false };
            }

            const cursorCoords = getCursorCoords();
            if (cursorCoords) {
                const editorRect = editorRef.current!.getBoundingClientRect();
                const scrollTop = editorRef.current!.scrollTop || 0;
                const position = calculateHelperPanePosition(cursorCoords, editorRect, helperPaneWidth, scrollTop);
                return { isOpen: true, ...position };
            }

            const scrollTop = editorRef.current!.scrollTop || 0;
            return { isOpen: true, top: scrollTop, left: 10 };
        });

        return true;
    }, [editorRef, getCursorCoords, helperPaneWidth]);

    useEffect(() => {
        if (onStateChange) {
            onStateChange({
                isOpen: helperPaneState.isOpen,
                ref: toggleButtonRef,
                toggle: handleManualToggle
            });
        }
    }, [helperPaneState.isOpen]);

    return {
        helperPaneState,
        setHelperPaneState,
        handleManualToggle,
        handleKeyboardToggle
    };
};
