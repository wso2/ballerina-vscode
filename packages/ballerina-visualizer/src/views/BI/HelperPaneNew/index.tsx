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
import { Inputs } from './Views/Inputs';
import { Documents } from './Views/Documents';
import { DocumentConfig } from './Views/DocumentConfig';
import { CompletionInsertText, DataMapperDisplayMode, ExpressionProperty, FlowNode, LineRange, RecordTypeField } from '@wso2/ballerina-core';
import { CompletionItem, FormExpressionEditorRef, HelperPaneCustom, HelperPaneHeight, Typography } from '@wso2/ui-toolkit';
import { SlidingPane, SlidingPaneHeader, SlidingPaneNavContainer, SlidingWindow } from '@wso2/ui-toolkit';
import { CreateValue } from './Views/CreateValue';
import { FunctionsPage } from './Views/Functions';
import { FormSubmitOptions } from '../FlowDiagram';
import { Configurables } from './Views/Configurables';
import styled from '@emotion/styled';
import { ConfigureRecordPage } from './Views/RecordConfigModal';
import { POPUP_IDS, useModalStack } from '../../../Context';
import { getDefaultValue } from './utils/types';
import { EXPR_ICON_WIDTH } from '@wso2/ui-toolkit';
import { HelperPaneIconType, getHelperPaneIcon } from './utils/iconUtils';
import { HelperpaneOnChangeOptions } from '@wso2/ballerina-side-panel';


export type ValueCreationOption = {
    typeCheck: string | null;
    value: string;
    label: string;
}

export type HelperPaneNewProps = {
    fieldKey: string;
    fileName: string;
    targetLineRange: LineRange;
    anchorRef: RefObject<HTMLDivElement>;
    onClose: () => void;
    defaultValue: string;
    currentValue: string;
    onChange: (value: string, options?: HelperpaneOnChangeOptions) => void;
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
    const [selectedItem, setSelectedItem] = useState<number>();
    const currentMenuItemCount = valueTypeConstraint ? 6 : 5

    const { addModal } = useModalStack()

    // Create refs array for all menu items
    const menuItemRefs = useRef<(HTMLDivElement | null)[]>([]);

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
        if (typeof insertText === 'string') {
            onChange(insertText, {
                closeHelperPane: !shouldKeepHelper,
                replaceFullText: isRecordConfigureChange || false
            });
        }
        else {
            const textToInsert = getInsertText(insertText);
            onChange(textToInsert, {
                closeHelperPane: !shouldKeepHelper,
                replaceFullText: isRecordConfigureChange || false
            });
        }
    };

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

    const defaultValue = getDefaultValue(selectedType?.label);

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

    return (
        <HelperPaneCustom anchorRef={anchorRef}>
            <HelperPaneCustom.Body>
                <SlidingWindow>
                    <SlidingPane name="PAGE1" paneWidth={300} paneHeight='170px'>
                        <div style={{ padding: '8px 0px' }}>
                            <ExpandableList >

                                {((forcedValueTypeConstraint && forcedValueTypeConstraint.length > 0)) && (
                                        <>
                                            {valueCreationOptions.length > 0 && (
                                                <SlidingPaneNavContainer
                                                    ref={el => menuItemRefs.current[0] = el}
                                                    to="CREATE_VALUE"
                                                    data={recordTypeField}
                                                >
                                                    <ExpandableList.Item>
                                                        {getHelperPaneIcon(HelperPaneIconType.VALUE)}
                                                        <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                                            Create Value
                                                        </Typography>
                                                    </ExpandableList.Item>
                                                </SlidingPaneNavContainer>
                                            )}</>
                                )}
                                <SlidingPaneNavContainer
                                    ref={el => menuItemRefs.current[2] = el}
                                    to="INPUTS"
                                >
                                    <ExpandableList.Item>
                                        {getHelperPaneIcon(HelperPaneIconType.INPUT)}
                                        <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                            Inputs
                                        </Typography>
                                    </ExpandableList.Item>
                                </SlidingPaneNavContainer>
                                <SlidingPaneNavContainer
                                    ref={el => menuItemRefs.current[1] = el}
                                    to="VARIABLES"
                                >
                                    <ExpandableList.Item>
                                        {getHelperPaneIcon(HelperPaneIconType.VARIABLE)}
                                        <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                            Variables
                                        </Typography>
                                    </ExpandableList.Item>
                                </SlidingPaneNavContainer>
                                <SlidingPaneNavContainer
                                    ref={el => menuItemRefs.current[3] = el}
                                    to="CONFIGURABLES"
                                >
                                    <ExpandableList.Item>
                                        <TitleContainer>
                                            {getHelperPaneIcon(HelperPaneIconType.CONFIGURABLE)}
                                            <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                                Configurables
                                            </Typography>
                                        </TitleContainer>
                                    </ExpandableList.Item>
                                </SlidingPaneNavContainer>
                                <SlidingPaneNavContainer
                                    ref={el => menuItemRefs.current[4] = el}
                                    to="FUNCTIONS"
                                >
                                    <ExpandableList.Item>
                                        {getHelperPaneIcon(HelperPaneIconType.FUNCTION)}
                                        <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                            Functions
                                        </Typography>
                                    </ExpandableList.Item>
                                </SlidingPaneNavContainer>
                                <SlidingPaneNavContainer
                                    ref={el => menuItemRefs.current[5] = el}
                                    to="DOCUMENTS"
                                >
                                    <ExpandableList.Item>
                                        {getHelperPaneIcon(HelperPaneIconType.DOCUMENT)}
                                        <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                            Documents
                                        </Typography>
                                    </ExpandableList.Item>
                                </SlidingPaneNavContainer>
                            </ExpandableList>

                        </div>
                    </SlidingPane>

                    {/* Variables Page */}
                    <SlidingPane name="VARIABLES" paneWidth={300}>
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

                    {/* Inputs Page */}
                    <SlidingPane name="INPUTS" paneWidth={300}>
                        <SlidingPaneHeader>
                            Inputs
                        </SlidingPaneHeader>
                        <Inputs
                            anchorRef={anchorRef}
                            fileName={fileName}
                            onChange={handleChange}
                            targetLineRange={targetLineRange}
                            filteredCompletions={filteredCompletions}
                            currentValue={currentValue}
                            handleRetrieveCompletions={handleRetrieveCompletions}
                        />
                    </SlidingPane>

                    <SlidingPane name="CREATE_VALUE" paneWidth={300}>
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

                    <SlidingPane name="FUNCTIONS" paneWidth={300}>
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

                    <SlidingPane name="CONFIGURABLES" paneWidth={300}>
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

                    {/* Documents Page */}
                    <SlidingPane name="DOCUMENTS" paneWidth={300}>
                        <SlidingPaneHeader>
                            Documents
                        </SlidingPaneHeader>
                        <Documents />
                    </SlidingPane>

                    {/* Single Document Configuration Page - handles all document types */}
                    <SlidingPane name="DOCUMENT_CONFIG" paneWidth={300}>
                        <SlidingPaneHeader>
                            Documents
                        </SlidingPaneHeader>
                        <DocumentConfig
                            onChange={handleChange}
                            onClose={onClose}
                            targetLineRange={targetLineRange}
                            filteredCompletions={filteredCompletions || []}
                            currentValue={currentValue}
                            handleRetrieveCompletions={handleRetrieveCompletions}
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
