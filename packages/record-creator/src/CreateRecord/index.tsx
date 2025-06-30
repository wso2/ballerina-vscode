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
import React, { useContext, useState } from "react";

import { NodePosition } from "@wso2/syntax-tree";
import { RecordConfigTypeSelector } from "../RecordConfigTypeSelector";
import { RecordFromJson } from "../RecordFromJson";
import { RecordFromXml } from "../RecordFromXml";
import { Context } from "../Context";
import { UndoRedoManager } from "../components/UndoRedoManager";
import { isSupportedSLVersion } from "../components/FormComponents/Utils";
import { FormContainer } from "../style";

enum ConfigState {
    STATE_SELECTOR,
    EDIT_CREATED,
    IMPORT_FROM_JSON,
    IMPORT_FROM_XML,
}

export interface CreateRecordProps {
    isDataMapper?: boolean;
    undoRedoManager?: UndoRedoManager;
    onCancel: (createdNewRecord?: string) => void;
    onSave: (recordString: string, modifiedPosition: NodePosition) => void;
    showHeader?: boolean;
    onUpdate?: (updated: boolean) => void;
}

export function CreateRecord(props: CreateRecordProps) {
    const { isDataMapper, undoRedoManager, showHeader, onSave, onCancel, onUpdate } = props;
    const {
        props: { targetPosition, ballerinaVersion },
    } = useContext(Context);

    const [editorState, setEditorState] = useState<ConfigState>(ConfigState.STATE_SELECTOR);

    const handleImportJSONClick = () => {
        setEditorState(ConfigState.IMPORT_FROM_JSON);
    };

    const handleImportXMLClick = () => {
        setEditorState(ConfigState.IMPORT_FROM_XML);
    };

    const handleImportJsonSave = (value: string, pos: NodePosition) => {
        onSave(value, pos);
    };

    const handleImportXmlSave = (value: string, pos: NodePosition) => {
        onSave(value, pos);
    };

    const checkBallerinVersion = () => {
        if (ballerinaVersion) {
            return isSupportedSLVersion(ballerinaVersion, 220172);
        }
        return false;
    };

    return (
        <FormContainer data-testid="record-form">
            <>
                {editorState === ConfigState.STATE_SELECTOR && (
                    <RecordConfigTypeSelector
                        onImportFromJson={handleImportJSONClick}
                        onImportFromXml={checkBallerinVersion() ? handleImportXMLClick : null}
                        onCancel={onCancel}
                        isDataMapper={isDataMapper}
                    />
                )}
                {editorState === ConfigState.IMPORT_FROM_JSON && (
                    <RecordFromJson
                        undoRedoManager={undoRedoManager}
                        onCancel={onCancel}
                        onSave={handleImportJsonSave}
                        isHeaderHidden={showHeader ? false : isDataMapper}
                        onUpdate={onUpdate}
                    />
                )}
                {editorState === ConfigState.IMPORT_FROM_XML && (
                    <RecordFromXml
                        undoRedoManager={undoRedoManager}
                        onCancel={onCancel}
                        onSave={handleImportXmlSave}
                        isHeaderHidden={showHeader ? false : isDataMapper}
                        onUpdate={onUpdate}
                    />
                )}
            </>
        </FormContainer>
    );
}
