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

import { FormField } from "../../../Form/types";

/**
 * Base props that all editor mode components must implement
 */
export interface EditorModeProps {
    /** Current value of the editor */
    value: string;
    /** Callback when value changes */
    onChange: (value: string) => void;
    /** Field metadata (for accessing field properties if needed) */
    field: FormField;
}

/**
 * Extended props for modes that support preview functionality (e.g., Prompt mode)
 */
export interface EditorModeWithPreviewProps extends EditorModeProps {
    /** Whether preview mode is active */
    isPreviewMode: boolean;
    /** Callback to toggle preview mode */
    onTogglePreview: (enabled: boolean) => void;
}

/**
 * Mode type identifier
 */
export type EditorMode = "text" | "prompt";

/**
 * Map of mode identifiers to their display labels
 */
export const MODE_LABELS: Record<EditorMode, string> = {
    text: "Text",
    prompt: "Prompt"
};
