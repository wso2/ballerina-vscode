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

import { RefObject } from 'react';
import { FormExpressionEditorRef, HelperPane, HelperPaneHeight } from '@wso2/ui-toolkit';
import { ConfigurablePage } from './ConfigurablePage';
import { FunctionsPage } from './FunctionsPage';
import { SuggestionsPage } from './SuggestionsPage';
import { ConfigureRecordPage } from './ConfigureRecordPage';
import { CompletionInsertText, LineRange } from '@wso2/ballerina-core';
import { RecordTypeField } from '@wso2/ballerina-core';

export type HelperPaneProps = {
    fieldKey: string;
    fileName: string;
    targetLineRange: LineRange;
    exprRef: RefObject<FormExpressionEditorRef>;
    anchorRef: RefObject<HTMLDivElement>;
    onClose: () => void;
    defaultValue: string;
    currentValue: string;
    onChange: (value: string, updatedCursorPosition: number) => void;
    helperPaneHeight: HelperPaneHeight;
    recordTypeField?: RecordTypeField;
    updateImports: (key: string, imports: {[key: string]: string}) => void;
    isAssignIdentifier?: boolean;
};

const HelperPaneEl = ({
    fieldKey,
    fileName,
    targetLineRange,
    exprRef,
    anchorRef,
    onClose,
    defaultValue,
    currentValue,
    onChange,
    helperPaneHeight,
    recordTypeField,
    updateImports,
    isAssignIdentifier
}: HelperPaneProps) => {
    const getInsertText = (insertText: string | CompletionInsertText): string => {
        if (typeof insertText === 'string') {
            return insertText;
        }
        return insertText.value;
    };

    const getCursorOffset = (insertText: string | CompletionInsertText): number => {
        if (typeof insertText === 'string') {
            return 0;
        }
        return insertText.cursorOffset ?? 0;
    };

    const handleChange = (insertText: string | CompletionInsertText, isRecordConfigureChange?: boolean) => {
        const value = getInsertText(insertText);
        const cursorOffset = getCursorOffset(insertText);
        const cursorPosition = exprRef.current?.shadowRoot?.querySelector('textarea')?.selectionStart;
        const updatedCursorPosition = cursorPosition + value.length + cursorOffset;
        let updatedValue = value;

        if (!isRecordConfigureChange) {
            updatedValue = currentValue.slice(0, cursorPosition) + value + currentValue.slice(cursorPosition);
        }

        // Update the value in the expression editor
        onChange(updatedValue, updatedCursorPosition);
        // Focus the expression editor
        exprRef.current?.focus();
        // Set the cursor
        exprRef.current?.setCursor(updatedValue, updatedCursorPosition);
        if (!isRecordConfigureChange) {
            // Close the helper pane
            onClose();
        }
    };

    return (
        <HelperPane helperPaneHeight={helperPaneHeight} sx={recordTypeField ? { width: 400 } : undefined}>
            <HelperPane.Header title="Expression Helper" titleSx={{ fontFamily: "GilmerRegular" }} onClose={onClose} />
            <HelperPane.Body>
                <HelperPane.Panels sx={recordTypeField ? { gap: "15px" } : undefined}>
                    {/* Tabs for the helper pane */}
                    {!isAssignIdentifier && recordTypeField && (
                        <HelperPane.PanelTab id={0} title="Construct Record" />
                    )}
                    <HelperPane.PanelTab id={isAssignIdentifier ? 0 : (recordTypeField ? 1 : 0)} title="Suggestions" />
                    {!isAssignIdentifier && (
                        <HelperPane.PanelTab id={recordTypeField ? 2 : 1} title="Functions" />
                    )}
                    
                    {!isAssignIdentifier && (
                        <HelperPane.PanelTab id={recordTypeField ? 3 : 2} title="Configurables" />
                    )}

                    {/* Panels for the helper pane */}
                    {!isAssignIdentifier && recordTypeField && (
                        <HelperPane.PanelView id={0}>
                            <ConfigureRecordPage
                                fileName={fileName}
                                targetLineRange={targetLineRange}
                                onChange={handleChange}
                                currentValue={currentValue}
                                recordTypeField={recordTypeField}
                                onClose={onClose}
                            />
                        </HelperPane.PanelView>
                    )}
                    <HelperPane.PanelView id={isAssignIdentifier ? 0 : (recordTypeField ? 1 : 0)}>
                        <SuggestionsPage
                            fileName={fileName}
                            targetLineRange={targetLineRange}
                            defaultValue={defaultValue}
                            onChange={handleChange}
                        />
                    </HelperPane.PanelView>
                    {!isAssignIdentifier && (
                        <HelperPane.PanelView id={recordTypeField ? 2 : 1}>
                            <FunctionsPage
                                fieldKey={fieldKey}
                                anchorRef={anchorRef}
                                fileName={fileName}
                                targetLineRange={targetLineRange}
                                onClose={onClose}
                                onChange={handleChange}
                                updateImports={updateImports}
                            />
                        </HelperPane.PanelView>
                    )}
                    {!isAssignIdentifier && (
                        <HelperPane.PanelView id={recordTypeField ? 3 : 2}>
                            <ConfigurablePage
                                onChange={handleChange}
                            />
                        </HelperPane.PanelView>
                    )}
                </HelperPane.Panels>
            </HelperPane.Body>
        </HelperPane>
    );
};

/**
 * Function to render the helper pane for the expression editor
 * 
 * @param fieldKey Key of the field
 * @param fileName File name of the expression editor
 * @param targetLineRange Modified line range of the expression editor
 * @param exprRef Ref object of the expression editor
 * @param anchorRef Ref object of the library browser
 * @param onClose Function to close the helper pane
 * @param defaultValue Default value for the expression editor
 * @param currentValue Current value of the expression editor
 * @param onChange Function to handle changes in the expression editor
 * @param helperPaneHeight Height of the helper pane
 * @param recordTypeField Record type field
 * @param updateImports Function to update the import statements of the expression editor
 * @param isAssignIdentifier Boolean indicating whether the expression is an assignment LV_EXPRESSION
 * @returns JSX.Element Helper pane element
 */
export const getHelperPane = (props: HelperPaneProps) => {
    const {
        fieldKey,
        fileName,
        targetLineRange,
        exprRef,
        anchorRef,
        onClose,
        defaultValue,
        currentValue,
        onChange,
        helperPaneHeight,
        recordTypeField,
        updateImports,
        isAssignIdentifier
    } = props;

    return (
        <HelperPaneEl
            fieldKey={fieldKey}
            fileName={fileName}
            targetLineRange={targetLineRange}
            exprRef={exprRef}
            anchorRef={anchorRef}
            onClose={onClose}
            defaultValue={defaultValue}
            currentValue={currentValue}
            onChange={onChange}
            helperPaneHeight={helperPaneHeight}
            recordTypeField={recordTypeField}
            updateImports={updateImports}
            isAssignIdentifier={isAssignIdentifier}
        />
    );
};
