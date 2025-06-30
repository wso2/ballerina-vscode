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

import React, { useEffect, useState } from "react";

import {
    AddArrayElementRequest,
    FlowNode,
    IDMModel,
    InlineDataMapperSourceRequest,
    LinePosition,
    Mapping,
    SubPanel,
    SubPanelView
} from "@wso2/ballerina-core";
import { DataMapperView } from "@wso2/ballerina-inline-data-mapper";
import { ProgressIndicator } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ExpressionFormField } from "@wso2/ballerina-side-panel";

import { useInlineDataMapperModel } from "../../Hooks";

interface InlineDataMapperProps {
    filePath: string;
    flowNode: FlowNode;
    propertyKey: string;
    editorKey: string;
    position: LinePosition;
    onClosePanel: (subPanel: SubPanel) => void;
    updateFormField: (data: ExpressionFormField) => void;
}

export function InlineDataMapper(props: InlineDataMapperProps) {
    const { filePath, flowNode, propertyKey, editorKey, position, onClosePanel, updateFormField } = props;

    const [isFileUpdateError, setIsFileUpdateError] = useState(false);
    const [model, setModel] = useState<IDMModel>(null);

    const { rpcClient } = useRpcContext();
    const {
        model: initialModel,
        isFetching,
        isError
    } = useInlineDataMapperModel(filePath, flowNode, propertyKey, position);

    useEffect(() => {
        if (initialModel) {
            setModel(initialModel);
        }
    }, [initialModel]);

    const onClose = () => {
        onClosePanel({ view: SubPanelView.UNDEFINED });
    }

    const updateExpression = async (mappings: Mapping[]) => {
        try {
            const updateSrcRequest: InlineDataMapperSourceRequest = {
                filePath,
                flowNode,
                propertyKey,
                position,
                mappings
            };
            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .getDataMapperSource(updateSrcRequest);
            console.log(">>> [Inline Data Mapper] getSource response:", resp);
            const updateData: ExpressionFormField = {
                value: resp.source,
                key: editorKey,
                cursorPosition: position
            }
            updateFormField(updateData);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const addArrayElement = async (targetField: string) => {
        try {
            const addElementRequest: AddArrayElementRequest = {
                filePath,
                flowNode,
                propertyKey,
                position,
                targetField
            };
            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .addNewArrayElement(addElementRequest);
            console.log(">>> [Inline Data Mapper] addArrayElement response:", resp);
            const updateData: ExpressionFormField = {
                value: resp.source,
                key: editorKey,
                cursorPosition: position
            }
            updateFormField(updateData);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    useEffect(() => {
        // Hack to hit the error boundary
        if (isError) {
            throw new Error("Error while fetching input/output types");
        } else if (isFileUpdateError) {
            throw new Error("Error while updating file content");
        } 
    }, [isError]);

    return (
        <>
            {isFetching && (
                 <ProgressIndicator /> 
            )}
            {model && (
                <DataMapperView 
                    model={model || initialModel}
                    onClose={onClose} 
                    applyModifications={updateExpression}
                    addArrayElement={addArrayElement}
                />
            )}
        </>
    );
};

