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
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { CompletionItem } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';
import { useRpcContext } from '@wso2/ballerina-rpc-client';

import { useDMExpressionBarStore } from '../../../store/store';
import { buildInputAccessExpr } from '../../../components/Diagram/utils/modification-utils';
import { View } from '../Views/DataMapperView';
import { useShallow } from 'zustand/react/shallow';

const useStyles = () => ({
    exprBarContainer: css({
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: "var(--vscode-input-background)",
    }),
    textField: css({
        '&::part(control)': {
            fontFamily: 'monospace',
            fontSize: '12px'
        },
    })
});

export interface ExpressionBarProps {
    views: View[];
    filePath: string;
    applyModifications: (fileContent: string) => Promise<void>;
}

export default function ExpressionBarWrapper(props: ExpressionBarProps) {
    const { views, filePath, applyModifications } = props;
    const { rpcClient } = useRpcContext();
    const classes = useStyles();
    const textFieldRef = useRef<HTMLInputElement>(null);
    const savedTextFieldValue = useRef<string>("");
    const [textFieldValue, setTextFieldValue] = useState<string>("");
    const [placeholder, setPlaceholder] = useState<string>();

    const { focusedPort, focusedFilter, inputPort, resetInputPort } = useDMExpressionBarStore(
        useShallow(state => ({
            focusedPort: state.focusedPort,
            focusedFilter: state.focusedFilter,
            inputPort: state.inputPort,
            resetInputPort: state.resetInputPort
        }))
    );

    const getCompletions = async (): Promise<CompletionItem[]> => {
        // if (!focusedPort && !focusedFilter) {
        //     return [];
        // }

        // let nodeForSuggestions: Node;
        // if (focusedPort) {
        //     nodeForSuggestions = focusedPort.typeWithValue.value ||
        //     (focusedPort.getNode() as DataMapperNodeModel)?.context.functionST;
        // } else {
        //     nodeForSuggestions = focusedFilter;
        // }

        // if (nodeForSuggestions && !nodeForSuggestions.wasForgotten()) {
        //     const fileContent = nodeForSuggestions.getSourceFile().getText();
        //     const cursorPosition = nodeForSuggestions.getEnd();
        //     // const response = await rpcClient.getInlineDataMapperRpcClient().getCompletions({
        //     //     filePath,
        //     //     fileContent,
        //     //     cursorPosition
        //     // });

        //     // if (!response.completions) {
        //     //     return [];
        //     // }

        //     // const completions = response.completions as { entry: ts.CompletionEntry, details: ts.CompletionEntryDetails }[];

        //     const localFunctionNames = nodeForSuggestions
        //         .getSourceFile()
        //         .getFunctions()
        //         .map(fn => fn.getName())
        //         .filter(name => name !== READONLY_MAPPING_FUNCTION_NAME);

        //     const filteredCompletions: CompletionItem[] = [];
        //     // for (const completion of completions) {
        //     //     const details = filterCompletions(completion.entry, completion.details, localFunctionNames);
        //     //     if (details) {
        //     //         filteredCompletions.push(details);
        //     //     }
        //     // }
            
        //     return filteredCompletions;
        // }

        return [];
    }

    useEffect(() => {
        (async () => {
            if (inputPort) {
                // Keep the text field focused when an input port is selected
                if (textFieldRef.current) {
                    const inputElement = textFieldRef.current.shadowRoot.querySelector('textarea');
                    if (focusedPort || focusedFilter) {
                        inputElement.focus();
                    } else {
                        inputElement.blur();
                    }
                    // Update the expression text when an input port is selected
                    const cursorPosition = textFieldRef.current.shadowRoot.querySelector('textarea').selectionStart;
                    const inputAccessExpr = buildInputAccessExpr(inputPort.fieldFQN);
                    const updatedText =
                        textFieldValue.substring(0, cursorPosition) +
                        inputAccessExpr +
                        textFieldValue.substring(cursorPosition);
                    await onChangeTextField(updatedText);
                    resetInputPort();
                }
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputPort]);

    const disabled = useMemo(() => {
        // let value = "";
        let disabled;
    
        // if (focusedPort) {
        //     setPlaceholder('Insert a value for the selected port.');
        //     const focusedNode = focusedPort.typeWithValue.value;
        //     if (focusedNode && !focusedNode.wasForgotten()) {
        //         if (Node.isPropertyAssignment(focusedNode)) {
        //             value = focusedNode.getInitializer()?.getText();
        //         } else {
        //             value = focusedNode ? focusedNode.getText() : "";
        //         }
        //     }

        //     if (textFieldRef.current) {
        //         textFieldRef.current.focus();
        //     }

        //     disabled = focusedPort.isDisabled();
        // } else if (focusedFilter) {
        //     value = focusedFilter.getText();

        //     if (textFieldRef.current) {
        //         textFieldRef.current.focus();
        //     }

        //     disabled = false;
        // } else if (textFieldRef.current) {
        //     // If displaying a focused view
        //     if (views.length > 1 && !views[views.length - 1].subMappingInfo) {
        //         setPlaceholder('Click on an output field or a filter to add/edit expressions.');
        //     } else {
        //         setPlaceholder('Click on an output field to add/edit expressions.');
        //     }

        //     textFieldRef.current.blur();
        // }
    
        // savedTextFieldValue.current = textFieldValue;
        // setTextFieldValue(value);
        return disabled;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textFieldRef.current, focusedPort, focusedFilter, views]);

    const onChangeTextField = async (text: string) => {
    };

    const handleExpressionSave = async (value: string) => {
        if (savedTextFieldValue.current === value) {
            return;
        }
        savedTextFieldValue.current = value;
        await applyChanges(value);
    }

    const handleCompletionSelect = async (value: string) => {
        if (savedTextFieldValue.current === value) {
            return;
        }
        savedTextFieldValue.current = value;
        await applyChanges(value);
    }

    const applyChanges = async (value: string) => {
        if (focusedPort) {
            await applyChangesOnFocusedPort(value);
        } else if (focusedFilter) {
            await applyChangesOnFocusedFilter();
        }
    };

    const applyChangesOnFocusedPort = async (value: string) => {
    };

    const applyChangesOnFocusedFilter = async () => {
        // await applyModifications(focusedFilter.getSourceFile().getFullText());
    };

    return (
        <div className={classes.exprBarContainer}>
            {/* <ExpressionBar
                id='expression-bar'
                ref={textFieldRef}
                disabled={disabled ?? false}
                value={textFieldValue}
                placeholder={placeholder}
                onChange={onChangeTextField}
                onCompletionSelect={handleCompletionSelect}
                onSave={handleExpressionSave}
                getCompletions={getCompletions}
                sx={{ display: 'flex', alignItems: 'center' }}
            /> */}
        </div>
    );
}

