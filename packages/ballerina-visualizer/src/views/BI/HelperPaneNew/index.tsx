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

import { RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ExpandableList } from './Components/ExpandableList';
import { Variables } from './Views/Variables';
import { CompletionInsertText, DataMapperDisplayMode, ExpressionProperty, FlowNode, LineRange, RecordSourceGenRequest, RecordSourceGenResponse, RecordTypeField, TypeField } from '@wso2/ballerina-core';
import { COMPLETION_ITEM_KIND, CompletionItem, FormExpressionEditorRef, getIcon, HelperPaneCustom, HelperPaneHeight, ThemeColors, Typography } from '@wso2/ui-toolkit';
import { SlidingPane, SlidingPaneHeader, SlidingPaneNavContainer, SlidingWindow } from '@wso2/ui-toolkit';
import { CreateValue } from './Views/CreateValue';
import { FunctionsPage } from './Views/Functions';
import { FormSubmitOptions } from '../FlowDiagram';
import { Configurables } from './Views/Configurables';
import styled from '@emotion/styled';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { ConfigureRecordPage } from './Views/RecordConfigModal';
import { POPUP_IDS, useModalStack } from '../../../Context';
import { getDefaultValue } from './Utils/types';
import { EXPR_ICON_WIDTH } from '@wso2/ui-toolkit';

const MAX_MENU_ITEM_COUNT = 4;

export type ValueCreationOption = {
    typeCheck: string | null;
    value: string;
    label: string;
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
    handleOnFormSubmit?: (updatedNode?: FlowNode, dataMapperMode?: DataMapperDisplayMode, options?: FormSubmitOptions) => void
    selectedType?: CompletionItem;
    filteredCompletions?: CompletionItem[];
    isInModal?: boolean;
    valueTypeConstraint?: string;
    forcedValueTypeConstraint?: string;
    handleRetrieveCompletions: (value: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => Promise<void>;
    handleValueTypeConstChange: (valueTypeConstraint: string) => void;
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
    currentValue,
    onChange,
    recordTypeField,
    updateImports,
    handleOnFormSubmit,
    selectedType,
    filteredCompletions,
    isInModal,
    valueTypeConstraint,
    handleRetrieveCompletions,
    forcedValueTypeConstraint,
    handleValueTypeConstChange
}: HelperPaneNewProps) => {
    const [position, setPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
    const paneRef = useRef<HTMLDivElement>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [paneWidth, setPaneWidth] = useState<number>(0);
    const [selectedItem, setSelectedItem] = useState<number>();
    const currentMenuItemCount = valueTypeConstraint ? 4 : 3

    const { addModal, closeModal } = useModalStack()

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

    useEffect(() => {
        if (valueTypeConstraint?.length > 0) {
            handleValueTypeConstChange(valueTypeConstraint)
        }
    }, [valueTypeConstraint, forcedValueTypeConstraint])

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

    const isSelectedTypeContainsType = (selectedType: string | string[], searchType: string) => {
        if (Array.isArray(selectedType)) {
            return selectedType.some(type => type.includes(searchType));
        }
        const unionTypes = selectedType.split("|").map(type => type.trim());
        return unionTypes.includes(searchType);
    };

    const defaultValue = getDefaultValue(Array.isArray(selectedType) ? selectedType[0] : selectedType);

    const allValueCreationOptions = [
        {
            typeCheck: "string",
            value: "\"TEXT_HERE\"",
            label: "Create a string value"
        },
        {
            typeCheck: "log:PrintableRawTemplate",
            value: "string `TEXT_HERE`",
            label: "Create a printable template"
        },
        {
            typeCheck: "error",
            value: "error(\"ERROR_MESSAGE_HERE\")",
            label: "Create an error"
        },
        {
            typeCheck: "json",
            value: "{}",
            label: "Create an empty json"
        },
        {
            typeCheck: "xml",
            value: "xml ``",
            label: "Create an xml template"
        },
        {
            typeCheck: "anydata",
            value: "{}",
            label: "Create an empty object"
        }
    ];

    // Filter options based on type matching, and add default value if it exists
    const valueCreationOptions = [
        ...(defaultValue ? [{
            typeCheck: null, // Special case for default value (if type is primitive)
            value: defaultValue,
            label: `Initialize to ${defaultValue}`
        }] : []),
        ...allValueCreationOptions.filter(option => 
            forcedValueTypeConstraint && 
            isSelectedTypeContainsType(forcedValueTypeConstraint, option.typeCheck)
        )
    ];

    const openRecordConfigView = () => {
        addModal(
            <div style={{ padding: '0px 10px' }}>
                <ConfigureRecordPage
                    fileName={fileName}
                    targetLineRange={targetLineRange}
                    onChange={handleChange}
                    currentValue={currentValue}
                    recordTypeField={recordTypeField}
                    onClose={onClose}
                />
            </div>
            , POPUP_IDS.RECORD_CONFIG, "Record Configuration", 600, 500);
            onClose();
    }

    return (
        <HelperPaneCustom anchorRef={anchorRef}>
            <HelperPaneCustom.Body>
                <SlidingWindow>
                    <SlidingPane name="PAGE1" paneWidth={rect.width} paneHeight='170px'>
                        <div style={{ padding: '8px 0px' }}>
                            <ExpandableList >

                                {((forcedValueTypeConstraint && forcedValueTypeConstraint.length > 0)) && (
                                    recordTypeField ?
                                        <SlidingPaneNavContainer onClick={openRecordConfigView}>
                                            <ExpandableList.Item>
                                                {getIcon(COMPLETION_ITEM_KIND.Value)}
                                                <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                                    Create value
                                                </Typography>
                                            </ExpandableList.Item>
                                        </SlidingPaneNavContainer> :
                                        <>
                                            {valueCreationOptions.length > 0 && (
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
                                            )}</>
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

                        </div>
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
                            onClose={onClose}
                        />
                    </SlidingPane>

                    <SlidingPane name="CREATE_VALUE" paneWidth={rect.width}>
                        <SlidingPaneHeader> Create Value</SlidingPaneHeader>
                        <CreateValue
                            fileName={fileName}
                            onChange={handleChange}
                            currentValue={currentValue}
                            selectedType={valueTypeConstraint || forcedValueTypeConstraint || ''}
                            recordTypeField={recordTypeField}
                            valueCreationOptions={valueCreationOptions}
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

                    <SlidingPane name="CONFIGURABLES" paneWidth={rect.width}>
                        <SlidingPaneHeader>
                            Configurables
                        </SlidingPaneHeader>
                        <Configurables
                            anchorRef={anchorRef}
                            fileName={fileName}
                            onChange={handleChange}
                            targetLineRange={targetLineRange}
                            isInModal={isInModal}
                            onClose={onClose}
                        />
                    </SlidingPane>
                </SlidingWindow>
            </HelperPaneCustom.Body>
        </HelperPaneCustom >
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
        valueTypeConstraint,
        forcedValueTypeConstraint,
        handleValueTypeConstChange,
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
            forcedValueTypeConstraint={forcedValueTypeConstraint}
            handleValueTypeConstChange={handleValueTypeConstChange}
        />
    );
};
