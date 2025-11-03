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

import { FormExpressionEditor } from "@wso2/ui-toolkit";
import { ExpressionField } from "../../ExpressionField";
import React from "react";
import { getValueForTextModeEditor } from "../../utils";
import styled from "@emotion/styled";
import { FloatingToggleButton } from "../ChipExpressionEditor/components/FloatingToggleButton";
import { ExpandButton } from "../ChipExpressionEditor/components/FloatingButtonIcons";

const EditorContainer = styled.div`
    width: 100%;
    position: relative;

    #text-mode-editor-expand {
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
    }

    &:hover #text-mode-editor-expand {
        opacity: 1;
    }
`;

type TextModeEditorProps = Pick<ExpressionField, 'name' | 'value' | 'autoFocus' | 'ariaLabel' | 'placeholder' | 'onChange' | 'onFocus' | 'onBlur' | 'onSave' | 'onCancel' | 'onRemove' | 'growRange' | 'exprRef' | 'anchorRef' | 'onOpenExpandedMode' | 'isInExpandedMode'>;

export const TextModeEditor: React.FC<TextModeEditorProps> = ({
    name,
    value,
    autoFocus,
    ariaLabel,
    placeholder,
    onChange,
    onFocus,
    onBlur,
    onSave,
    onCancel,
    onRemove,
    growRange,
    exprRef,
    anchorRef,
    onOpenExpandedMode,
    isInExpandedMode,
}) => {

    const handleOnChange = async (value: string, updatedCursorPosition: number) => {
        const newValue = "\"" + value + "\"";
        onChange(newValue, updatedCursorPosition);
    }

    return (
        <EditorContainer>
            <FormExpressionEditor
                ref={exprRef}
                anchorRef={anchorRef}
                name={name}
                completions={[]}
                value={getValueForTextModeEditor(value)}
                autoFocus={autoFocus}
                startAdornment={<></>}
                ariaLabel={ariaLabel}
                onChange={handleOnChange}
                onFocus={onFocus}
                onBlur={onBlur}
                onSave={onSave}
                onCancel={onCancel}
                onRemove={onRemove}
                enableExIcon={false}
                growRange={growRange}
                sx={{ paddingInline: '0' }}
                placeholder={placeholder}
            />
            {onOpenExpandedMode && !isInExpandedMode && (
                <div id="text-mode-editor-expand" style={{ position: 'absolute', bottom: '9px', right: '8px' }}>
                    <FloatingToggleButton onClick={onOpenExpandedMode} title="Expand Editor">
                        <ExpandButton />
                    </FloatingToggleButton>
                </div>
            )}
        </EditorContainer>
    );
};

export default TextModeEditor
