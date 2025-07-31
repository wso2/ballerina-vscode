/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ExpandableList } from './Components/ExpandableList';
import { Variables } from './Views/Variables';
import { CompletionInsertText, ExpressionProperty, FlowNode, LineRange, RecordTypeField } from '@wso2/ballerina-core';
import { Codicon, COMPLETION_ITEM_KIND, CompletionItem, FormExpressionEditorRef, getIcon, HelperPaneCustom, HelperPaneHeight, Modal } from '@wso2/ui-toolkit';
import { CopilotFooter, SlidingPane, SlidingPaneHeader, SlidingPaneNavContainer, SlidingWindow } from '@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane';
import { CreateValue } from './Views/CreateValue';
import DynamicModal from './Components/Modal';
import FooterButtons from './Components/FooterButtons';
import { FunctionsPage } from './Views/Functions';
import { Divider } from '@wso2/ui-toolkit';
import { GenerateBICopilot } from './Views/GenerateBICopilot';
import { FormSubmitOptions } from '../FlowDiagram';
import { EXPR_ICON_WIDTH } from '@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Form';
import { Configurables } from './Views/Configurables';
const getRecordType = (recordTypeField: RecordTypeField) => {
    return recordTypeField;
}

export type HelperPaneNewProps = {
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
    updateImports: (key: string, imports: { [key: string]: string }) => void;
    isAssignIdentifier?: boolean;
    completions: CompletionItem[],
    projectPath?: string,
    handleOnFormSubmit?: (updatedNode?: FlowNode, isDataMapperFormUpdate?: boolean, options?: FormSubmitOptions) => void
    helperPaneZIndex?: number;
    selectedType?: CompletionItem;
    filteredCompletions?: CompletionItem[];
    variables: CompletionItem[];
    isInModal?: boolean;
};

const HelperPaneNewEl = ({
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
    isAssignIdentifier,
    completions,
    projectPath,
    handleOnFormSubmit,
    helperPaneZIndex,
    selectedType,
    filteredCompletions,
    variables,
    isInModal
}: HelperPaneNewProps) => {
    const [position, setPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
    const paneRef = useRef<HTMLDivElement>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [paneWidth, setPaneWidth] = useState<number>(0);

    useLayoutEffect(() => {
        const trySetWidth = () => {
            const inputEl = exprRef.current?.parentElement;
            if (inputEl) {
                const rect = inputEl.getBoundingClientRect();
                setPaneWidth(rect.width + EXPR_ICON_WIDTH - 6);
            } else {
                // Try again on next frame if it's not ready yet
                requestAnimationFrame(trySetWidth);
            }
        };

        trySetWidth();
    }, []);

    useLayoutEffect(() => {
        if (anchorRef.current) {
            const host = anchorRef.current.shadowRoot?.host as HTMLElement | undefined;
            const target = host || (anchorRef.current as unknown as HTMLElement);
            if (target && target.getBoundingClientRect) {
                const rect = target.getBoundingClientRect();
                setPosition({
                    top: rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX,
                });
            }
        }
    }, [anchorRef]);

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
        <HelperPaneCustom sx={{ zIndex: helperPaneZIndex }} anchorRef={anchorRef}>
            <HelperPaneCustom.Body>
                <SlidingWindow>
                    <SlidingPane name="PAGE1" paneWidth={paneWidth}>
                        <ExpandableList sx={{ paddingTop: '10px' }}>
                            {(selectedType || recordTypeField) && (
                                <SlidingPaneNavContainer to="CREATE_VALUE" data={recordTypeField}>
                                    <ExpandableList.Item>
                                        {getIcon(COMPLETION_ITEM_KIND.Value)}
                                        <span>Create Value</span>
                                    </ExpandableList.Item>
                                </SlidingPaneNavContainer>
                            )}
                            <SlidingPaneNavContainer to="VARIABLES">
                                <ExpandableList.Item>
                                    {getIcon(COMPLETION_ITEM_KIND.Variable)}
                                    <span>Variables</span>
                                </ExpandableList.Item>
                            </SlidingPaneNavContainer>
                            <SlidingPaneNavContainer to="CONFIGURABLES">
                                <ExpandableList.Item>
                                    {getIcon(COMPLETION_ITEM_KIND.Constant)}
                                    <span>Configurables</span>
                                </ExpandableList.Item>
                            </SlidingPaneNavContainer>
                            <SlidingPaneNavContainer to="FUNCTIONS">
                                <ExpandableList.Item>
                                    {getIcon(COMPLETION_ITEM_KIND.Function)}
                                    <span>Functions</span>
                                </ExpandableList.Item>
                            </SlidingPaneNavContainer>
                        </ExpandableList>

                        <div style={{ marginTop: "auto", gap: '10px' }}>
                            <Divider />
                            <DynamicModal width={600} height={400} anchorRef={anchorRef} title="Build Expression with BI Copilot" openState={isModalOpen} setOpenState={setIsModalOpen}>
                                <DynamicModal.Trigger>
                                    <FooterButtons
                                        sx={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}
                                        startIcon='copilot'
                                        title="Generate with BI Copilot" />
                                </DynamicModal.Trigger>
                                <GenerateBICopilot />
                            </DynamicModal>

                        </div>
                    </SlidingPane>

                    {/* Variables Page */}
                    <SlidingPane name="VARIABLES" paneWidth={paneWidth}>
                        <SlidingPaneHeader>
                            Variables
                        </SlidingPaneHeader>
                        <Variables
                            anchorRef={anchorRef}
                            fileName={fileName}
                            onChange={handleChange}
                            targetLineRange={targetLineRange}
                            handleOnFormSubmit={handleOnFormSubmit}
                            selectedType={selectedType}
                            filteredCompletions={filteredCompletions}
                            currentValue={currentValue}
                            variables={variables}
                            recordTypeField={recordTypeField}
                            isInModal={isInModal}
                        />
                    </SlidingPane>

                    <SlidingPane name="CREATE_VALUE" paneHeight='400px' paneWidth={paneWidth}>
                        <SlidingPaneHeader> Create Value</SlidingPaneHeader>
                        <CreateValue
                            fileName={fileName}
                            onChange={handleChange}
                            currentValue={currentValue}
                            selectedType={selectedType}
                            recordTypeField={recordTypeField} />
                    </SlidingPane>

                    <SlidingPane name="FUNCTIONS" paneHeight='400px' paneWidth={paneWidth}>
                        <SlidingPaneHeader>
                            Functions
                        </SlidingPaneHeader>
                        <FunctionsPage
                            fieldKey={fieldKey}
                            anchorRef={anchorRef}
                            fileName={fileName}
                            targetLineRange={targetLineRange}
                            onClose={onClose}
                            onChange={handleChange}
                            updateImports={updateImports} />
                    </SlidingPane>

                    <SlidingPane name="CONFIGURABLES" paneHeight='400px' paneWidth={paneWidth}>
                        <SlidingPaneHeader>
                            Configurables
                        </SlidingPaneHeader>
                        <Configurables
                            anchorRef={anchorRef}
                            fileName={fileName}
                            onChange={handleChange}
                            targetLineRange={targetLineRange}
                            isInModal={isInModal}
                        />
                    </SlidingPane>
                </SlidingWindow>
            </HelperPaneCustom.Body>
        </HelperPaneCustom>
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
 * @param projectPath Project path of the expression editor
 * @param handleOnFormSubmit Function to handle form submission
 * @param updateImports Function to update the import statements of the expression editor
 * @param isAssignIdentifier Boolean indicating whether the expression is an assignment LV_EXPRESSION
 * @returns JSX.Element Helper pane element
 */
export const getHelperPaneNew = (props: HelperPaneNewProps) => {
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
        isAssignIdentifier,
        completions,
        projectPath,
        handleOnFormSubmit,
        helperPaneZIndex,
        selectedType,
        filteredCompletions,
        variables,
        isInModal
    } = props;

    return (
        <HelperPaneNewEl
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
            completions={completions}
            projectPath={projectPath}
            handleOnFormSubmit={handleOnFormSubmit}
            helperPaneZIndex={helperPaneZIndex}
            selectedType={selectedType}
            filteredCompletions={filteredCompletions}
            variables={variables}
            isInModal={isInModal}
        />
    );
};
