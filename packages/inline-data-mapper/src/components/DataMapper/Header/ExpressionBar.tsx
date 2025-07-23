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

import { Button, Codicon, HeaderExpressionEditor, HeaderExpressionEditorRef, Icon, InputProps } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';

import { useDMExpressionBarStore } from '../../../store/store';
import { buildInputAccessExpr } from '../../../components/Diagram/utils/modification-utils';
import { View } from '../Views/DataMapperView';
import { useExpressionContext } from '../../../context/ExpressionContext';
import { useMutation } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { DataMapperNodeModel } from '../../../components/Diagram/Node/commons/DataMapperNode';
import { InputOutputPortModel } from '../../../components/Diagram/Port';

const useStyles = () => ({
    exprBarContainer: css({
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--vscode-input-background)',
        marginBottom: '16px',
        borderBottom: '1px solid var(--dropdown-border)'
    }),
    field: css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingInline: '16px',
        fontFamily: 'GilmerBold',
        fontSize: '12px',
        width: '150px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    }),
    divider: css({
        height: '20px',
        width: '1px',
        backgroundColor: 'var(--dropdown-border)'
    }),
    textField: css({
        '&::part(control)': {
            fontFamily: 'monospace',
            fontSize: '12px'
        },
        '&::part(root)': {
            border: 'none'
        }
    })
});

export interface ExpressionBarProps {
    views: View[];
}

export default function ExpressionBarWrapper({ views }: ExpressionBarProps) {
    const classes = useStyles();
    const { completions, triggerCompletions, onCompletionSelect, onSave, onCancel } = useExpressionContext();
    const textFieldRef = useRef<HeaderExpressionEditorRef>();
    const savedTextFieldValue = useRef<string>('');
    const [textFieldValue, setTextFieldValue] = useState<string>('');
    const [placeholder, setPlaceholder] = useState<string>();

    const { focusedPort, focusedFilter, lastFocusedPort, inputPort, resetInputPort, setLastFocusedPort, resetExprBarFocus } =
        useDMExpressionBarStore(
            useShallow((state) => ({
                focusedPort: state.focusedPort,
                focusedFilter: state.focusedFilter,
                lastFocusedPort: state.lastFocusedPort,
                inputPort: state.inputPort,
                resetInputPort: state.resetInputPort,
                setLastFocusedPort: state.setLastFocusedPort,
                resetExprBarFocus: state.resetFocus
            }))
        );

    const portChanged = !!(focusedPort || lastFocusedPort)
        && lastFocusedPort?.attributes.fieldFQN !== focusedPort?.attributes.fieldFQN;

    useEffect(() => {
        (async () => {
            if (inputPort) {
                // Keep the text field focused when an input port is selected
                if (textFieldRef.current) {
                    if (focusedPort || focusedFilter) {
                        textFieldRef.current.focus(true);
                    } else {
                        textFieldRef.current.blur();
                    }

                    // Update the expression text when an input port is selected
                    const cursorPosition = textFieldRef.current.shadowRoot.querySelector('input').selectionStart;
                    const inputAccessExpr = buildInputAccessExpr(inputPort.attributes.fieldFQN);
                    const updatedText =
                        textFieldValue.substring(0, cursorPosition) +
                        inputAccessExpr +
                        textFieldValue.substring(cursorPosition);
                    await handleChange(updatedText);
                    resetInputPort();
                }
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputPort]);

    const disabled = useMemo(() => {
        let disabled;

        if (focusedPort) {
            setPlaceholder('Insert a value for the selected port.');

            if (textFieldRef.current) {
                textFieldRef.current.focus();
            }

            disabled = focusedPort.isDisabled();
        } else if (focusedFilter) {
            if (textFieldRef.current) {
                textFieldRef.current.focus();
            }

            disabled = false;
        } else if (textFieldRef.current) {
            // If displaying a focused view
            if (views.length > 1) {
                setPlaceholder('Click on an output field or a filter to add/edit expressions.');
            } else {
                setPlaceholder('Click on an output field to add/edit expressions.');
            }

            textFieldRef.current.blur();
        }

        return disabled;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textFieldRef.current, focusedPort, focusedFilter, views]);

    const handleChange = async (text: string, cursorPosition?: number) => {
        if (textFieldValue === text) {
            return;
        }

        /* Update the text field value */
        setTextFieldValue(text);

        /* Trigger completions */
        const outputId = focusedPort.attributes.fieldFQN;
        const views = (focusedPort.getNode() as DataMapperNodeModel).context.views;
        const viewId = views[views.length - 1]?.targetField;
        triggerCompletions(outputId, viewId, text, cursorPosition);
    };

    const gotoSource = () => {};

    const saveSource = async (port: InputOutputPortModel, value: string) => {
        const valueChanged = savedTextFieldValue.current !== value;
        if (!port || !valueChanged) {
            return;
        }

        const outputId = port.attributes.fieldFQN;
        const views = (port.getNode() as DataMapperNodeModel).context.views;
        const viewId = views[views.length - 1]?.targetField;
        const name = views[0]?.targetField;
        await onSave(outputId, value, viewId, name);
    };

    const handleExpressionSave = async (value: string) => {
        await saveSource(focusedPort, value);
    };

    const handleManualCompletionRequest = () => {
        const outputId = focusedPort.attributes.fieldFQN;
        const views = (focusedPort.getNode() as DataMapperNodeModel).context.views;
        const viewId = views[views.length - 1]?.targetField;
        const cursorPosition = textFieldRef.current.shadowRoot.querySelector('input').selectionStart;
        triggerCompletions(outputId, viewId, textFieldValue, cursorPosition);
    };

    const handleBlur = async (e: any) => {
        if (e.target.closest('[id^="recordfield-"]')) {
            return;
        }
        await saveSource(focusedPort, textFieldValue);
        setTextFieldValue("");
        resetExprBarFocus();
    };

    const inputProps: InputProps = {
        endAdornment: (
            <Button appearance="icon" tooltip="Goto source" onClick={gotoSource}>
                <Codicon name="code" />
            </Button>
        )
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useDisableOnChange = (fn: (...args: any[]) => Promise<any>) => {
        return useMutation({
            mutationFn: fn,
            networkMode: 'always'
        });
    };

    const saveOnPortChange = async () => {
        if (portChanged) {
            if (lastFocusedPort) {
                await saveSource(lastFocusedPort, textFieldValue);
                setLastFocusedPort(undefined);
            }

            /* Set the value to the text field */
            const value = focusedPort?.attributes.value?.expression ?? focusedFilter?.textContent ?? '';
            savedTextFieldValue.current = value;
            setTextFieldValue(value);
        }
    };

    useEffect(() => {
        saveOnPortChange();
    }, [focusedPort, focusedFilter, lastFocusedPort]);

    const fieldTitle = useMemo(() => {
        if (focusedPort?.attributes.fieldFQN) {
            return focusedPort?.attributes.fieldFQN;
        }
        return undefined;
    }, [focusedPort]);

    const partialFieldTitle = useMemo(() => {
        if (fieldTitle) {
            return focusedPort?.attributes.fieldFQN.split('.').pop();
        }
        return 'No field selected';
    }, [fieldTitle]);

    return (
        <div className={classes.exprBarContainer}>
            <div className={classes.field} {...(fieldTitle && { title: fieldTitle })}>
                {partialFieldTitle}
            </div>
            <div className={classes.divider} />
            <Icon name="bi-function" iconSx={{ fontSize: '20px' }} sx={{ height: '20px', width: '20px' }} />
            <HeaderExpressionEditor
                id="expression-bar"
                className={classes.textField}
                ref={textFieldRef}
                disabled={disabled}
                value={textFieldValue}
                placeholder={placeholder}
                inputProps={inputProps}
                autoSelectFirstItem={true}
                completions={completions}
                onChange={handleChange}
                onCompletionSelect={onCompletionSelect}
                onSave={handleExpressionSave}
                onCancel={onCancel}
                onClose={onCancel}
                onBlur={handleBlur}
                useTransaction={useDisableOnChange}
                onManualCompletionRequest={handleManualCompletionRequest}
                sx={{ display: 'flex', alignItems: 'center' }}
            />
        </div>
    );
}
