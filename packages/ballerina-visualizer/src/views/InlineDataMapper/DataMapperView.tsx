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


import React, { useEffect, useState, useRef, useCallback } from "react";
import debounce from "lodash/debounce";

import {
    AddArrayElementRequest,
    ConvertToQueryRequest,
    ExpandedDMModel,
    IDMFormProps,
    DMModel,
    ModelState,
    AddClausesRequest,
    IDMViewState,
    IntermediateClause,
    TriggerCharacter,
    TRIGGER_CHARACTERS,
    Mapping,
    CodeData,
    CustomFnMetadata,
    NodePosition,
    EVENT_TYPE,
    LineRange,
    ResultClauseType
} from "@wso2/ballerina-core";
import { CompletionItem, ProgressIndicator } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { DataMapperView } from "@wso2/ballerina-inline-data-mapper";

import { useInlineDataMapperModel } from "../../Hooks";
import { expandDMModel } from "./modelProcessor";
import FormGeneratorNew from "../BI/Forms/FormGeneratorNew";
import { InlineDataMapperProps } from ".";
import { EXPRESSION_EXTRACTION_REGEX } from "../../constants";
import { calculateExpressionOffsets, convertBalCompletion, updateLineRange } from "../../utils/bi";
import { createAddSubMappingRequest } from "./utils";
import { URI, Utils } from "vscode-uri";

// Types for model comparison
interface ModelSignature {
    inputs: string[];
    output: string;
    subMappings: string[];
    types: string;
}

export function InlineDataMapperView(props: InlineDataMapperProps) {
    const { filePath, codedata, varName } = props;

    const [isFileUpdateError, setIsFileUpdateError] = useState(false);
    const [modelState, setModelState] = useState<ModelState>({
        model: null,
        hasInputsOutputsChanged: false
    });
    const [viewState, setViewState] = useState<IDMViewState>({
        viewId: varName,
        codedata: codedata
    });

    /* Completions related */
    const [completions, setCompletions] = useState<CompletionItem[]>([]);
    const prevCompletionFetchText = useRef<string>("");
    const [filteredCompletions, setFilteredCompletions] = useState<CompletionItem[]>([]);
    const expressionOffsetRef = useRef<number>(0); // To track the expression offset on adding import statements
    const [isUpdatingSource ,setIsUpdatingSource] = useState<boolean>(false);

    // Keep track of previous inputs/outputs and sub mappings for comparison
    const prevSignatureRef = useRef<string>(null);

    const { rpcClient } = useRpcContext();
    const {
        model,
        isFetching,
        isError
    } = useInlineDataMapperModel(filePath, viewState);

    useEffect(() => {
        setViewState(prev => ({
            ...prev,
            codedata
        }));
    }, [varName, codedata]);

    useEffect(() => {
        if (!model) return;

        const currentSignature = JSON.stringify(getModelSignature(model));
        const prevSignature = prevSignatureRef.current;

        const hasInputsChanged = hasSignatureChanged(currentSignature, prevSignature, 'inputs');
        const hasOutputChanged = hasSignatureChanged(currentSignature, prevSignature, 'output');
        const hasSubMappingsChanged = hasSignatureChanged(currentSignature, prevSignature, 'subMappings');
        const hasTypesChanged = hasSignatureChanged(currentSignature, prevSignature, 'types');

        // Check if it's already an ExpandedDMModel
        const isExpandedModel = !('types' in model);
        if (isExpandedModel) {
            setModelState({
                model: model as ExpandedDMModel,
                hasInputsOutputsChanged: hasInputsChanged || hasOutputChanged,
                hasSubMappingsChanged: hasSubMappingsChanged
            });
            prevSignatureRef.current = currentSignature;
            return;
        }

        // If types changed, we need to reprocess everything
        if (hasTypesChanged || hasInputsChanged || hasOutputChanged || hasSubMappingsChanged) {
            const expandedModel = expandDMModel(model as DMModel, {
                processInputs: hasInputsChanged || hasTypesChanged,
                processOutput: hasOutputChanged || hasTypesChanged,
                processSubMappings: hasSubMappingsChanged || hasTypesChanged,
                previousModel: modelState.model as ExpandedDMModel
            });
            setModelState({
                model: expandedModel,
                hasInputsOutputsChanged: hasInputsChanged || hasOutputChanged || hasTypesChanged,
                hasSubMappingsChanged: hasSubMappingsChanged || hasTypesChanged
            });
        } else {
            setModelState(prev => ({
                model: {
                    ...prev.model!,
                    mappings: (model as DMModel).mappings
                }
            }));
        }

        prevSignatureRef.current = currentSignature;
    }, [model]);

    const onClose = () => {
        rpcClient.getVisualizerRpcClient()?.goBack();
    }

    const updateExpression = async (outputId: string, expression: string, viewId: string, name: string) => {
        try {
            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .getDataMapperSource({
                    filePath,
                    codedata: viewState.codedata,
                    varName: name,
                    targetField: viewId,
                    mapping: {
                        output: outputId,
                        expression: expression
                    },
                    withinSubMapping: viewState.isSubMapping
                });
            console.log(">>> [Inline Data Mapper] getSource response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const updateExprFromExprBar = async (outputId: string, expression: string, viewId: string, name: string) => {
        setIsUpdatingSource(true);
        await updateExpression(outputId, expression, viewId, name);
        setIsUpdatingSource(false);
    }

    const addArrayElement = async (outputId: string, viewId: string, name: string) => {
        try {
            const addElementRequest: AddArrayElementRequest = {
                filePath,
                codedata: viewState.codedata,
                varName: name,
                targetField: outputId,
                propertyKey: "expression" // TODO: Remove this once the API is updated
            };
            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .addNewArrayElement(addElementRequest);
            console.log(">>> [Inline Data Mapper] addArrayElement response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const handleView = async (viewId: string, isSubMapping?: boolean) => {
        if (isSubMapping) {
            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .getSubMappingCodedata({
                    filePath,
                    codedata: viewState.codedata,
                    view: viewId
                });
            console.log(">>> [Inline Data Mapper] getSubMappingCodedata response:", resp);
            setViewState({ viewId, codedata: resp.codedata, isSubMapping: true });
        } else {
            if (viewState.isSubMapping) {
                // If the view is a sub mapping, we need to get the codedata of the parent mapping
                const res = await rpcClient
                    .getInlineDataMapperRpcClient()
                    .getDataMapperCodedata({
                        filePath,
                        codedata: viewState.codedata,
                        name: viewId
                    });
                setViewState({ viewId, codedata: res.codedata, isSubMapping: false });
            } else {
                setViewState(prev => ({
                    ...prev,
                    viewId
                }));
            }
        }
    };

    const generateForm = (formProps: IDMFormProps) => {
        return (
            <FormGeneratorNew
                fileName={filePath}
                preserveFieldOrder={true}
                helperPaneSide="left"
                {...formProps}
            />
        )
    }

    const convertToQuery = async (mapping: Mapping, clauseType: ResultClauseType, viewId: string, name: string) => {
        try {
            const a = viewId.split(".");
            const b = mapping.output.split(".");
            const targetField = [...a, ...b.slice(1)].join(".");
            console.log(">>> [Inline Data Mapper] targetField:", targetField);
            const convertToQueryRequest: ConvertToQueryRequest = {
                filePath,
                codedata: viewState.codedata,
                mapping,
                clauseType,
                varName: name,
                targetField: viewId,
                propertyKey: "expression" // TODO: Remove this once the API is updated
            };
            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .convertToQuery(convertToQueryRequest);
            console.log(">>> [Inline Data Mapper] convertToQuery response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    }

    const addClauses = async (clause: IntermediateClause, targetField: string, isNew: boolean, index?: number) => {
        try {
            const addClausesRequest: AddClausesRequest = {
                filePath,
                codedata: {
                    ...viewState.codedata,
                    isNew
                },
                index,
                clause,
                targetField,
                varName
            };
            console.log(">>> [Inline Data Mapper] addClauses request:", addClausesRequest);

            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .addClauses(addClausesRequest);
            console.log(">>> [Inline Data Mapper] addClauses response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    }

    const addSubMapping = async (
        subMappingName: string,
        type: string,
        index: number,
        targetField: string,
        importsCodedata?: CodeData
    ) => {
        try {
            const visualizableResponse = await rpcClient
                .getInlineDataMapperRpcClient()
                .getVisualizableFields({
                    filePath,
                    codedata: importsCodedata || { symbol: type }
                });
            console.log(">>> [Inline Data Mapper] getVisualizableFields response:", visualizableResponse);

            const defaultValue = visualizableResponse.visualizableProperties.defaultValue;
            const request = createAddSubMappingRequest(
                filePath,
                viewState.codedata,
                index,
                targetField,
                subMappingName,
                type,
                varName,
                defaultValue
            );

            console.log(">>> [Inline Data Mapper] addSubMapping request:", request);

            const response = await rpcClient
                .getInlineDataMapperRpcClient()
                .addSubMapping(request);
            console.log(">>> [Inline Data Mapper] addSubMapping response:", response);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const deleteMapping = async (mapping: Mapping, viewId: string) => {
        try {
            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .deleteMapping({
                    filePath,
                    codedata: viewState.codedata,
                    mapping,
                    varName,
                    targetField: viewId,
                });
            console.log(">>> [Inline Data Mapper] deleteMapping response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const mapWithCustomFn = async (mapping: Mapping, metadata: CustomFnMetadata, viewId: string) => {
        try {
            const resp = await rpcClient
                .getInlineDataMapperRpcClient()
                .mapWithCustomFn({
                    filePath,
                    codedata,
                    mapping,
                    functionMetadata: metadata,
                    varName,
                    targetField: viewId,
                });
            console.log(">>> [Inline Data Mapper] mapWithCustomFn response:", resp);
        } catch (error) {
            console.error(error);
            setIsFileUpdateError(true);
        }
    };

    const goToFunction = async (functionRange: LineRange) => {
        const documentUri: string = await rpcClient.getVisualizerRpcClient().joinProjectPath(functionRange.fileName);
        const position: NodePosition = {
            startLine: functionRange.startLine.line,
            startColumn: functionRange.startLine.offset,
            endLine: functionRange.endLine.line,
            endColumn: functionRange.endLine.offset
        };
        rpcClient
            .getVisualizerRpcClient()
            .openView({ type: EVENT_TYPE.OPEN_VIEW, location: { documentUri, position } });
    };

    useEffect(() => {
        // Hack to hit the error boundary
        if (isError) {
            throw new Error("Error while fetching input/output types");
        } else if (isFileUpdateError) {
            throw new Error("Error while updating file content");
        }
    }, [isError]);

    const retrieveCompeletions = useCallback(
        debounce(async (outputId: string, viewId: string, value: string, cursorPosition?: number) => {
            let expressionCompletions: CompletionItem[] = [];
            const { parentContent, lastCompletionTrigger, currentContent } =
                value.slice(0, cursorPosition).match(EXPRESSION_EXTRACTION_REGEX)?.groups ?? {};
            const lastTriggerCharacter = TRIGGER_CHARACTERS.find(c => c === lastCompletionTrigger);
            const triggerCharacter = lastTriggerCharacter && parentContent !== prevCompletionFetchText.current ?
                lastTriggerCharacter : undefined;
            if (completions.length > 0 && parentContent === prevCompletionFetchText.current) {
                expressionCompletions = completions
                    .filter((completion) => {
                        const lowerCaseText = currentContent.toLowerCase();
                        const lowerCaseLabel = completion.value.toLowerCase();

                        return lowerCaseLabel.startsWith(lowerCaseText);
                    })
                    .sort((a, b) => a.sortText.localeCompare(b.sortText));
            } else {
                const { property } = await rpcClient.getInlineDataMapperRpcClient().getProperty({
                    filePath: filePath,
                    codedata: viewState.codedata,
                    propertyKey: "expression", // TODO: Remove this once the API is updated
                    targetField: viewId,
                    fieldId: outputId,
                })
                const { lineOffset, charOffset } = calculateExpressionOffsets(value, cursorPosition);
                let completions = await rpcClient.getBIDiagramRpcClient().getExpressionCompletions({
                    filePath,
                    context: {
                        expression: value,
                        startLine: updateLineRange(codedata.lineRange, expressionOffsetRef.current).startLine,
                        lineOffset: lineOffset,
                        offset: charOffset,
                        codedata: viewState.codedata,
                        property: property,
                    },
                    completionContext: {
                        triggerKind: triggerCharacter ? 2 : 1,
                        triggerCharacter: triggerCharacter as TriggerCharacter
                    }
                });

                // Convert completions to the ExpressionEditor format
                let convertedCompletions: CompletionItem[] = [];
                completions?.forEach((completion) => {
                    if (completion.detail) {
                        // HACK: Currently, completion with additional edits apart from imports are not supported
                        // Completions that modify the expression itself (ex: member access)
                        convertedCompletions.push(convertBalCompletion(completion));
                    }
                });
                setCompletions(convertedCompletions);

                if (triggerCharacter) {
                    expressionCompletions = convertedCompletions;
                } else {
                    expressionCompletions = convertedCompletions
                        .filter((completion) => {
                            const lowerCaseText = currentContent.toLowerCase();
                            const lowerCaseLabel = completion.value.toLowerCase();

                            return lowerCaseLabel.startsWith(lowerCaseText);
                        })
                        .sort((a, b) => a.sortText.localeCompare(b.sortText));
                }
                prevCompletionFetchText.current = parentContent ?? "";
            }
            setFilteredCompletions(expressionCompletions);
        }, 150),
        [filePath, codedata, varName, completions]
    );

    const handleCompletionSelect = (value: string) => {
        // TODO: Implement handling imports
    };

    const handleExpressionCancel = () => {
        retrieveCompeletions.cancel();
        setCompletions([]);
        setFilteredCompletions([]);
    }

    return (
        <>
            {isFetching && (
                <ProgressIndicator />
            )}
            {modelState.model && (
                <DataMapperView
                    modelState={modelState}
                    name={varName}
                    onClose={onClose}
                    applyModifications={updateExpression}
                    addArrayElement={addArrayElement}
                    handleView={handleView}
                    generateForm={generateForm}
                    convertToQuery={convertToQuery}
                    addClauses={addClauses}
                    addSubMapping={addSubMapping}
                    deleteMapping={deleteMapping}
                    mapWithCustomFn={mapWithCustomFn}
                    goToFunction={goToFunction}
                    expressionBar={{
                        completions: filteredCompletions,
                        isUpdatingSource,
                        triggerCompletions: retrieveCompeletions,
                        onCompletionSelect: handleCompletionSelect,
                        onSave: updateExprFromExprBar,
                        onCancel: handleExpressionCancel,
                    }}
                />
            )}
        </>
    );
};

const getModelSignature = (model: DMModel | ExpandedDMModel): ModelSignature => ({
    inputs: model.inputs.map(i => i.id),
    output: model.output.id,
    subMappings: model.subMappings?.map(s => s.id) || [],
    types: 'types' in model ? JSON.stringify(model.types) : ''
});

const hasSignatureChanged = (
    current: string,
    previous: string | null,
    field: keyof ModelSignature
): boolean => {
    if (!previous) return true;
    const currentObj = JSON.parse(current);
    const previousObj = JSON.parse(previous);
    return JSON.stringify(currentObj[field]) !== JSON.stringify(previousObj[field]);
};
