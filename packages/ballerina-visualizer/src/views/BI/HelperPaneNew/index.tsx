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
import { CompletionInsertText, ExpressionProperty, FlowNode, GetRecordConfigResponse, LineRange, PropertyTypeMemberInfo, RecordSourceGenRequest, RecordSourceGenResponse, RecordTypeField, TypeField } from '@wso2/ballerina-core';
import { Codicon, COMPLETION_ITEM_KIND, CompletionItem, FormExpressionEditorRef, getIcon, HELPER_PANE_EX_BTN_OFFSET, HELPER_PANE_WIDTH, HelperPaneCustom, HelperPaneHeight, ThemeColors, Typography } from '@wso2/ui-toolkit';
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
import styled from '@emotion/styled';
import { RecordConfig } from './Views/RecordConfigView';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { RecordConfigModal } from './Views/RecordConfigModal';

const MAX_MENU_ITEM_COUNT = 4;

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
    selectedType?: CompletionItem;
    filteredCompletions?: CompletionItem[];
    isInModal?: boolean;
    valueTypeConstraint?: string | string[];
    handleRetrieveCompletions: (value: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => Promise<void>;
};

const TitleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

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
    selectedType,
    filteredCompletions,
    isInModal,
    valueTypeConstraint,
    handleRetrieveCompletions
}: HelperPaneNewProps) => {
    const [position, setPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
    const paneRef = useRef<HTMLDivElement>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [paneWidth, setPaneWidth] = useState<number>(0);
    const [selectedItem, setSelectedItem] = useState<number>();
    const currentMenuItemCount = valueTypeConstraint ? 4 : 3
    const selectedItemRef = useRef<HTMLDivElement>(null);
    // Create refs array for all menu items
    const menuItemRefs = useRef<(HTMLDivElement | null)[]>([]);

    const rect = exprRef.current?.parentElement?.getBoundingClientRect();

    const { rpcClient } = useRpcContext();

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

    const ifCTRLandUP = (e: KeyboardEvent) => {
        return (
            (e.ctrlKey || e.metaKey) && e.key === "ArrowUp"
        );
    };

    const ifCTRLandDown = (e: KeyboardEvent) => {
        return (
            (e.ctrlKey || e.metaKey) && e.key === "ArrowDown"
        );
    };

    const ifCTRLandENTER = (e: KeyboardEvent) => {
        return (
            (e.ctrlKey || e.metaKey) && e.key === "Enter"
        );
    };

    const handleKeyPress = (event: KeyboardEvent) => {
        if (ifCTRLandUP(event)) {
            setSelectedItem((prev) => {
                const current = prev ?? 0; // if prev is undefined, use 0
                return current > 0 ? current - 1 : current;
            });
        } else if (ifCTRLandENTER(event)) {
            const selectedMenuRef = menuItemRefs.current[selectedItem ?? 0]; // fallback to 0
            if (selectedMenuRef) {
                selectedMenuRef.click();
                event.preventDefault();
            }
        } else if (ifCTRLandDown(event)) {
            setSelectedItem((prev) => {
                const current = prev ?? 0;
                return current < currentMenuItemCount - 1 ? current + 1 : current;
            });
        }
    };


    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            event?.key && handleKeyPress(event);
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

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

    const handleChange = (insertText: string | CompletionInsertText, isRecordConfigureChange?: boolean, shouldKeepHelper?: boolean) => {
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
        if (!shouldKeepHelper && !isRecordConfigureChange) {
            onClose();
        }
    };

    const isItemSelected = (currentCount: number, itemIndex: number) => {
        const trueItemIndex = currentCount - MAX_MENU_ITEM_COUNT + itemIndex;
        return (trueItemIndex >= 0) && (selectedItem === trueItemIndex);
    }

    const getMenuItemColor = (currentCount: number, itemIndex: number) => {
        return isItemSelected(currentCount, itemIndex) ? ThemeColors.SURFACE_DIM_2 : "transparent";
    }

    const handleModalChange = async (updatedModel: TypeField[]) => {
        const request: RecordSourceGenRequest = {
            filePath: fileName,
            type: updatedModel[0]
        }
        const recordSourceResponse: RecordSourceGenResponse = await rpcClient.getBIDiagramRpcClient().getRecordSource(request);
        console.log(">>> recordSourceResponse", recordSourceResponse);

        if (recordSourceResponse.recordValue !== undefined) {
            const content = recordSourceResponse.recordValue;
            handleChange(content, true);
        }
    }

    // Scroll selected item into view when selection changes
    useEffect(() => {
        if (menuItemRefs.current[selectedItem]) {
            menuItemRefs.current[selectedItem]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [selectedItem]);

    return (
        <HelperPaneCustom anchorRef={anchorRef}>
            <HelperPaneCustom.Body>
                <SlidingWindow>
                    <SlidingPane name="PAGE1" paneWidth={rect.width} paneHeight='170px'>
                        <ExpandableList >
                            {valueTypeConstraint && (
                                recordTypeField ?
                                    <SlidingPaneNavContainer onClick={() => setIsModalOpen(true)}>
                                          <ExpandableList.Item>
                                            {getIcon(COMPLETION_ITEM_KIND.Value)}
                                            <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                                 Create value
                                            </Typography>
                                        </ExpandableList.Item>
                                    </SlidingPaneNavContainer> :
                                    <SlidingPaneNavContainer
                                        ref={el => menuItemRefs.current[0] = el}
                                        to="CREATE_VALUE"
                                        data={recordTypeField}
                                        sx={{ backgroundColor: getMenuItemColor(currentMenuItemCount, 0) }}
                                    >
                                        <ExpandableList.Item>
                                            {getIcon(COMPLETION_ITEM_KIND.Value)}
                                            <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                                Create Value
                                            </Typography>
                                        </ExpandableList.Item>
                                    </SlidingPaneNavContainer>
                            )}
                            <SlidingPaneNavContainer
                                ref={el => menuItemRefs.current[1] = el}
                                to="VARIABLES"
                                sx={{ backgroundColor: getMenuItemColor(currentMenuItemCount, 1) }}
                            >
                                <ExpandableList.Item>
                                    {getIcon(COMPLETION_ITEM_KIND.Variable)}
                                    <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                        Variables
                                    </Typography>
                                </ExpandableList.Item>
                            </SlidingPaneNavContainer>
                            <SlidingPaneNavContainer
                                ref={el => menuItemRefs.current[2] = el}
                                to="CONFIGURABLES"
                                sx={{ backgroundColor: getMenuItemColor(currentMenuItemCount, 2) }}
                            >
                                <ExpandableList.Item>
                                    <TitleContainer>
                                        {getIcon(COMPLETION_ITEM_KIND.Constant)}
                                        <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                            Configurables
                                        </Typography>
                                    </TitleContainer>
                                </ExpandableList.Item>
                            </SlidingPaneNavContainer>
                            {/* <SlidingPaneNavContainer to="ENVS">
                                <ExpandableList.Item>
                                    <TitleContainer>
                                        {getIcon(COMPLETION_ITEM_KIND.EnumMember)}
                                        <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                            Environment Variables
                                        </Typography>
                                    </TitleContainer>
                                </ExpandableList.Item>
                            </SlidingPaneNavContainer> */}
                            <SlidingPaneNavContainer
                                ref={el => menuItemRefs.current[3] = el}
                                to="FUNCTIONS"
                                sx={{ backgroundColor: getMenuItemColor(currentMenuItemCount, 3) }}
                            >
                                <ExpandableList.Item>
                                    {getIcon(COMPLETION_ITEM_KIND.Function)}
                                    <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                        Functions
                                    </Typography>
                                </ExpandableList.Item>
                            </SlidingPaneNavContainer>
                        </ExpandableList>

                        {/* <div style={{ marginTop: "auto", gap: '10px' }}>
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

                        </div> */}
                    </SlidingPane>

                    {/* Variables Page */}
                    <SlidingPane name="VARIABLES" paneWidth={rect.width}>
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
                            recordTypeField={recordTypeField}
                            isInModal={isInModal}
                            handleRetrieveCompletions={handleRetrieveCompletions}
                        />
                    </SlidingPane>

                    <SlidingPane name="CREATE_VALUE" paneWidth={rect.width}>
                        <SlidingPaneHeader> Create Value</SlidingPaneHeader>
                        <CreateValue
                            fileName={fileName}
                            onChange={handleChange}
                            currentValue={currentValue}
                            selectedType={valueTypeConstraint}
                            recordTypeField={recordTypeField}
                            anchorRef={anchorRef} />
                    </SlidingPane>

                    <SlidingPane name="FUNCTIONS" paneWidth={rect.width}>
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
                            updateImports={updateImports}
                            selectedType={selectedType} />
                    </SlidingPane>

                    <SlidingPane name="CONFIGURABLES" paneWidth={rect.width }>
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

                <DynamicModal
                    width={500}
                    height={600}
                    anchorRef={anchorRef}
                    title="Record Configuration"
                    openState={isModalOpen}
                    setOpenState={setIsModalOpen}>
                    <RecordConfigModal
                        valueTypeConstraint={valueTypeConstraint}
                        fileName={fileName}
                        recordTypeField={recordTypeField}
                        handleModalChange={handleModalChange}
                    />
                </DynamicModal>
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
        selectedType,
        filteredCompletions,
        isInModal,
        valueTypeConstraint
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
            selectedType={selectedType}
            filteredCompletions={filteredCompletions}
            isInModal={isInModal}
            valueTypeConstraint={valueTypeConstraint}
            handleRetrieveCompletions={props.handleRetrieveCompletions}
        />
    );
};