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
// tslint:disable: jsx-no-multiline-js
import React, { ReactNode, useContext, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { ModulePart, STKindChecker, STNode, TypeDefinition } from "@wso2/syntax-tree";

import { updatePropertyStatement } from "../utils";
import { UndoRedoManager } from "../components/UndoRedoManager";
import { RecordItemModel } from "../types";
import {
    extractImportedRecordNames,
    getActualRecordST,
    getAvailableCreatedRecords,
    getRemoveCreatedRecordRange,
} from "../utils";

import { RecordItem } from "./RecordItem";
import { cx } from "@emotion/css";
import { Button, Codicon, Icon, SidePanelTitleContainer, Tooltip, Typography } from "@wso2/ui-toolkit";
import { Context } from "../Context";
import { InputLabel, InputLabelDetail, InputWrapper, RecordFormWrapper, RecordList, useStyles } from "../style";
import { RecordEditorC } from "../RecordEditor/RecordEditorC";

export interface RecordOverviewProps {
    definitions: TypeDefinition | ModulePart;
    prevST?: STNode;
    type: "XML" | "JSON";
    undoRedoManager?: UndoRedoManager;
    onComplete: () => void;
    onCancel: () => void;
}

export function RecordOverview(overviewProps: RecordOverviewProps) {
    const classes = useStyles();
    const { definitions, prevST, undoRedoManager, type, onComplete, onCancel } = overviewProps;

    const {
        props: {
            currentFile,
            fullST,
        },
        api: { applyModifications },
    } = useContext(Context);

    const intl = useIntl();
    const doneButtonText = intl.formatMessage({
        id: "lowcode.develop.configForms.recordEditor.overview.doneBtnText",
        defaultMessage: "Finish",
    });

    const successMsgText = intl.formatMessage({
        id: "lowcode.develop.configForms.recordEditor.overview.doneBtnText",
        defaultMessage: `${type} Import Successful!`,
    });

    const successMsgTextDetail = intl.formatMessage({
        id: "lowcode.develop.configForms.recordEditor.overview.doneBtnText",
        defaultMessage: "Proceed to the section below to make further edits.",
    });

    const overviewSelectAll = intl.formatMessage({
        id: "lowcode.develop.configForms.recordEditor.overview.overviewSelectAll",
        defaultMessage: "Select All",
    });

    const deleteSelected = intl.formatMessage({
        id: "lowcode.develop.configForms.recordEditor.overview.deleteSelected",
        defaultMessage: "Delete Selected",
    });

    const [selectedRecord, setSelectedRecord] = useState<string>();
    const createdDefinitions = extractImportedRecordNames(definitions);
    const [recordNames, setRecordNames] = useState<RecordItemModel[]>(createdDefinitions);
    const [originalSource] = useState<STNode>(prevST);

    const onEditClick = (record: string) => {
        setSelectedRecord(record);
    };

    const handleOnCheck = () => {
        setRecordNames(recordNames);
    };

    const renderRecords = () => {
        const records: ReactNode[] = [];
        if (STKindChecker.isModulePart(definitions)) {
            recordNames.forEach((typeDef) => {
                records.push(<RecordItem record={typeDef} onEditClick={onEditClick} handleOnCheck={handleOnCheck} />);
            });
        } else if (STKindChecker.isTypeDefinition(definitions) && recordNames.length > 0) {
            records.push(
                <RecordItem record={recordNames[0]} onEditClick={onEditClick} handleOnCheck={handleOnCheck} />
            );
        }
        setListRecords(records);
    };

    useEffect(() => {
        renderRecords();
    }, [recordNames]);

    useEffect(() => {
        if (fullST && fullST.source !== originalSource.source) {
            const createdRecords = getAvailableCreatedRecords(createdDefinitions, fullST);
            setRecordNames(getAvailableCreatedRecords(createdDefinitions, fullST));
            if (createdRecords.length === 0) {
                onCancel();
            }
        }
    }, [fullST]);

    const [listRecords, setListRecords] = useState<ReactNode[]>([]);
    const actualSelectedRecordSt = selectedRecord ? getActualRecordST(fullST, selectedRecord) : undefined;

    const onCancelEdit = () => {
        setSelectedRecord("");
    };

    const onDeleteSelected = () => {
        const selectedRecords: string[] = [];
        const recordNameClone = [...recordNames];
        recordNames.forEach((record) => {
            if (record.checked) {
                selectedRecords.push(record.name);
                const index = recordNameClone.findIndex((item) => item.name === record.name);
                if (index !== -1) {
                    recordNameClone.splice(index, 1);
                }
            }
        });
        setRecordNames(recordNameClone);
        undoRedoManager.updateContent(currentFile.path, currentFile.content);
        undoRedoManager.addModification(currentFile.content);
        applyModifications(getRemoveCreatedRecordRange(selectedRecords, fullST));
        if (recordNameClone.length === 0) {
            onCancel();
        }
    };

    const onSelectAll = () => {
        let checkAll = true;
        if (recordNames.every((value) => value.checked)) {
            checkAll = false;
        }
        recordNames.forEach((record) => {
            record.checked = checkAll;
        });
        setRecordNames(recordNames);
        renderRecords();
    };

    const handleUndo = () => {
        const lastUpdateSource = undoRedoManager.undo();
        applyModifications([updatePropertyStatement(lastUpdateSource, fullST.position)]);
        if (lastUpdateSource === originalSource.source) {
            // If original source matches to last updated source we assume there are no newly created record.
            // Hence, we are closing the form.
            onCancel();
        }
    };

    return (
        <>
            {!selectedRecord ? (
                <>
                    <SidePanelTitleContainer sx={{ paddingLeft: 20 }}>
                        <Typography variant="h3" sx={{ margin: 0 }}>Record Overview</Typography>
                        <Button onClick={onCancel} appearance="icon"><Codicon name="close" /></Button>
                    </SidePanelTitleContainer>
                    {listRecords?.length > 0 && (
                        <InputWrapper>
                            <InputLabel>
                                <Codicon name="check" sx={{marginTop: 2, marginRight: 5 }} className={classes.inputSuccessTick} /> {successMsgText}
                            </InputLabel>
                            <InputLabelDetail>{successMsgTextDetail}</InputLabelDetail>
                        </InputWrapper>
                    )}
                    <RecordList>{listRecords}</RecordList>
                    <div className={classes.recordOptions}>
                        <Button appearance="secondary" key={"select-all"} onClick={onSelectAll} className={classes.marginSpace}>
                            {overviewSelectAll}
                        </Button>

                        <div className={cx(classes.deleteRecord, classes.marginSpace)} onClick={onDeleteSelected}>
                            {/* Add a space betweeen Codicon and deleteSelected */}
                            <Codicon name="trash" /> &nbsp; &nbsp; {deleteSelected}
                        </div>

                        <Tooltip content="Undo" position="bottom-end">
                            <Button
                                onClick={handleUndo}
                                className={cx(classes.undoButton, classes.marginSpace)}
                                data-testid="overview-undo"
                                appearance="icon"
                            >
                                <Codicon name="discard" />
                            </Button>
                        </Tooltip>
                    </div>
                    <div className={classes.doneButtonWrapper}>
                        <Button appearance="primary" onClick={onComplete} data-testId="done-btn">
                           {doneButtonText}
                        </Button>
                    </div>
                </>
            ) : (
                <RecordEditorC model={actualSelectedRecordSt} onCancel={onCancelEdit} />
            )}
        </>
    );
}
