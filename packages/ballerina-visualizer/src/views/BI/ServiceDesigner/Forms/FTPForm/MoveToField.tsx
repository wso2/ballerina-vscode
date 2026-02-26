/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "@emotion/styled";
import { debounce } from "lodash";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Diagnostic, ExpressionProperty, LineRange, PropertyModel, TriggerCharacter, TRIGGER_CHARACTERS } from "@wso2/ballerina-core";
import { ChipExpressionEditorComponent, FieldProvider, FormField, InputMode, Provider as FormContextProvider, StringTemplateEditorConfig } from "@wso2/ballerina-side-panel";
import { ChipExpressionEditorDefaultConfiguration } from "@wso2/ballerina-side-panel/lib/components/editors/MultiModeExpressionEditor/ChipExpressionEditor/ChipExpressionDefaultConfig";
import WarningPopup from "@wso2/ballerina-side-panel/lib/components/WarningPopup";
import { CompletionItem, ErrorBanner, ThemeColors, Typography } from "@wso2/ui-toolkit";
import { getHelperPaneNew } from "../../../HelperPaneNew";
import { EXPRESSION_EXTRACTION_REGEX } from "../../../../../constants";
import { calculateExpressionOffsets, convertBalCompletion, removeDuplicateDiagnostics } from "../../../../../utils/bi";

class MoveToTextEditorConfig extends StringTemplateEditorConfig {
}

class MoveToExpressionEditorConfig extends ChipExpressionEditorDefaultConfiguration {
}

const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
`;

const FieldDescription = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
`;

interface LabelProps {
    active: boolean;
}

const ModeLabel = styled.span<LabelProps>`
    position: absolute;
    text-align: center;
    font-size: 10px;
    z-index: 1;
    transition: all 0.2s ease;
    color: ${(props: LabelProps) => (props.active ? ThemeColors.ON_SURFACE : ThemeColors.ON_SURFACE_VARIANT)};
    font-weight: ${(props: LabelProps) => (props.active ? "600" : "500")};
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;

    &:first-of-type {
        left: 0;
        width: 40%;
    }

    &:last-of-type {
        left: 40%;
        width: 60%;
    }
`;

interface ModeSliderProps {
    checked: boolean;
}

const ModeSlider = styled.div<ModeSliderProps>`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${ThemeColors.SURFACE_CONTAINER};
    color: ${ThemeColors.ON_SURFACE};
    font-weight: 500;
    border-radius: 2px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 2px;
    transition: all 0.2s ease;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};

    &:before {
        content: "";
        position: absolute;
        height: calc(100% - 4px);
        width: ${(props: ModeSliderProps) => (props.checked ? "calc(60% - 4px)" : "calc(40% - 2px)")};
        left: ${(props: ModeSliderProps) => (props.checked ? "calc(40% + 2px)" : "2px")};
        border-radius: 1px;
        background: ${ThemeColors.SURFACE_DIM};
        transition: all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
        z-index: 0;
        border: 1px solid ${ThemeColors.OUTLINE};
    }
`;

interface ModeSwitchWrapperProps {
    disabled: boolean;
}

const ModeSwitchWrapper = styled.div<ModeSwitchWrapperProps>`
    font-size: 12px;
    position: relative;
    display: inline-flex;
    align-items: center;
    min-width: 112px;
    width: max-content;
    height: 24px;
    margin-top: 2px;
    user-select: none;
    opacity: ${(props: ModeSwitchWrapperProps) => (props.disabled ? 0.6 : 1)};
    pointer-events: ${(props: ModeSwitchWrapperProps) => (props.disabled ? "none" : "auto")};
`;

const getTrimmed = (value: string | undefined) => (value ?? "").trim();

const isStringTemplateLiteral = (value: string): boolean => {
    const trimmed = getTrimmed(value);
    if (!trimmed) return false;
    return /^string\s*`[\s\S]*`$/.test(trimmed);
};

const getStringTemplateLiteralContent = (value: string): string | null => {
    const trimmed = getTrimmed(value);
    if (!trimmed) return null;
    const match = trimmed.match(/^string\s*`([\s\S]*)`$/);
    return match ? match[1] : null;
};

const isQuotedStringLiteral = (value: string): boolean => {
    const trimmed = getTrimmed(value);
    if (!trimmed) return true;
    const startsWithDouble = trimmed.startsWith('"') && trimmed.endsWith('"');
    const startsWithSingle = trimmed.startsWith("'") && trimmed.endsWith("'");
    return startsWithDouble || startsWithSingle;
};

const unquoteStringLiteral = (value: string): string => {
    const trimmed = getTrimmed(value);
    if (!trimmed) return "";
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return trimmed.slice(1, -1);
        }
    }
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        return trimmed.slice(1, -1);
    }
    return "";
};

const toExpressionProperty = (propertyModel: PropertyModel | undefined, value: string): ExpressionProperty => ({
    metadata: {
        label: propertyModel?.metadata?.label || "Move To",
        description: propertyModel?.metadata?.description || "",
    },
    value,
    optional: propertyModel?.optional ?? false,
    editable: propertyModel?.editable ?? true,
    advanced: propertyModel?.advanced,
    hidden: propertyModel?.hidden,
    placeholder: propertyModel?.placeholder,
    types: propertyModel?.types,
    codedata: propertyModel?.codedata as any,
    imports: propertyModel?.imports,
});

export interface MoveToFieldProps {
    id?: string;
    value: string;
    moveToProperty?: PropertyModel;
    filePath?: string;
    targetLineRange?: LineRange;
    required?: boolean;
    disabled?: boolean;
    onChange: (value: string) => void;
    onDiagnosticsChange?: (diagnostics: Diagnostic[]) => void;
}

export function MoveToField(props: MoveToFieldProps) {
    const { id, value, moveToProperty, filePath, targetLineRange, required, disabled, onChange, onDiagnosticsChange } = props;
    const { rpcClient } = useRpcContext();

    const formContext = useMemo(() => {
        const noop = () => { };
        return {
            form: {
                control: undefined as any,
                getValues: (() => ({})) as any,
                setValue: noop as any,
                watch: noop as any,
                register: (() => ({})) as any,
                unregister: noop as any,
                setError: noop as any,
                clearErrors: noop as any,
                formState: { isValidating: false, errors: {} }
            },
            expressionEditor: {
                rpcManager: {
                    getExpressionTokens: (expression: string, filePath: string, position: any) =>
                        rpcClient.getBIDiagramRpcClient().getExpressionTokens({ expression, filePath, position })
                }
            },
            targetLineRange: targetLineRange ?? {
                startLine: { line: 0, offset: 0 },
                endLine: { line: 0, offset: 0 },
            },
            fileName: filePath ?? "",
            popupManager: {
                addPopup: noop,
                removeLastPopup: noop,
                closePopup: noop,
            },
            nodeInfo: { kind: "FUNCTION" as any }
        };
    }, [rpcClient, filePath, targetLineRange]);

    const [inputMode, setInputMode] = useState<InputMode>(() => {
        const trimmed = getTrimmed(value);
        if (!trimmed) return InputMode.TEXT;
        return isQuotedStringLiteral(trimmed) || isStringTemplateLiteral(trimmed) ? InputMode.TEXT : InputMode.EXP;
    });
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
    const [showWarning, setShowWarning] = useState(false);
    const [completions, setCompletions] = useState<CompletionItem[]>([]);
    const [filteredCompletions, setFilteredCompletions] = useState<CompletionItem[]>([]);

    const onDiagnosticsChangeRef = useRef(onDiagnosticsChange);
    const moveToPropertyRef = useRef(moveToProperty);
    const prevCompletionFetchText = useRef<string>("");
    const helperPaneAnchorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onDiagnosticsChangeRef.current = onDiagnosticsChange;
    }, [onDiagnosticsChange]);

    useEffect(() => {
        moveToPropertyRef.current = moveToProperty;
    }, [moveToProperty]);

    const canSwitchToText = useMemo(() => {
        const trimmed = getTrimmed(value);
        return !trimmed || isQuotedStringLiteral(trimmed) || isStringTemplateLiteral(trimmed);
    }, [value]);

    const isEmptyValue = useMemo(() => {
        const trimmed = getTrimmed(value);
        if (!trimmed || trimmed === '""' || trimmed === "''") {
            return true;
        }
        const templateContent = getStringTemplateLiteralContent(trimmed);
        return templateContent !== null && templateContent.trim() === "";
    }, [value]);

    const validateExpression = useMemo(
        () =>
            debounce(async (expression: string) => {
                if (!rpcClient || !filePath) {
                    return;
                }

                const startLine = targetLineRange?.startLine ?? { line: 0, offset: 0 };
                const property = toExpressionProperty(moveToPropertyRef.current, expression);

                try {
                    const response = await rpcClient.getBIDiagramRpcClient().getExpressionDiagnostics({
                        filePath,
                        context: {
                            expression,
                            startLine,
                            lineOffset: 0,
                            offset: 0,
                            codedata: undefined,
                            property,
                        } as any,
                    });

                    const uniqueDiagnostics = removeDuplicateDiagnostics(response.diagnostics || []);
                    setDiagnostics(uniqueDiagnostics);
                    onDiagnosticsChangeRef.current?.(uniqueDiagnostics);
                } catch (e) {
                    // Ignore diagnostics failures to avoid blocking the form UI.
                    setDiagnostics([]);
                    onDiagnosticsChangeRef.current?.([]);
                }
            }, 250),
        [rpcClient, filePath, targetLineRange]
    );

    const retrieveCompletions = useMemo(
        () =>
            debounce(async (expression: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => {
                if (!rpcClient || !filePath) {
                    setCompletions([]);
                    setFilteredCompletions([]);
                    return;
                }

                try {
                    let expressionCompletions: CompletionItem[] = [];
                    const { parentContent, currentContent } = expression
                        .slice(0, offset)
                        .match(EXPRESSION_EXTRACTION_REGEX)?.groups ?? {};
                    const currentContentLower = (currentContent ?? "").toLowerCase();

                    if (completions.length > 0 && !triggerCharacter && parentContent === prevCompletionFetchText.current) {
                        expressionCompletions = completions
                            .filter((completion) => completion.label.toLowerCase().includes(currentContentLower))
                            .sort((a, b) => a.sortText.localeCompare(b.sortText));
                    } else {
                        const startLine = targetLineRange?.startLine ?? { line: 0, offset: 0 };
                        const { lineOffset, charOffset } = calculateExpressionOffsets(expression, offset);

                        const completionResponse = await rpcClient.getBIDiagramRpcClient().getExpressionCompletions({
                            filePath,
                            context: {
                                expression,
                                startLine,
                                lineOffset,
                                offset: charOffset,
                                codedata: undefined,
                                property,
                            },
                            completionContext: {
                                triggerKind: triggerCharacter ? 2 : 1,
                                triggerCharacter: triggerCharacter as TriggerCharacter,
                            },
                        } as any);

                        const convertedCompletions: CompletionItem[] = [];
                        completionResponse?.forEach((completion: any) => {
                            if (completion.detail) {
                                convertedCompletions.push(convertBalCompletion(completion));
                            }
                        });
                        setCompletions(convertedCompletions);

                        if (triggerCharacter) {
                            expressionCompletions = convertedCompletions;
                        } else {
                            expressionCompletions = convertedCompletions
                                .filter((completion) => completion.label.toLowerCase().includes(currentContentLower))
                                .sort((a, b) => a.sortText.localeCompare(b.sortText));
                        }
                    }

                    prevCompletionFetchText.current = parentContent ?? "";
                    setFilteredCompletions(expressionCompletions);
                } catch (error) {
                    console.error(">>> Error getting moveTo completions", error);
                    setCompletions([]);
                    setFilteredCompletions([]);
                }
            }, 250),
        [rpcClient, completions, filePath, targetLineRange]
    );

    useEffect(() => {
        return () => {
            validateExpression.cancel();
        };
    }, [validateExpression]);

    useEffect(() => {
        return () => {
            retrieveCompletions.cancel();
        };
    }, [retrieveCompletions]);

    useEffect(() => {
        // Validate when switching modes / when value changes (covers initial load and programmatic updates).
        const trimmed = getTrimmed(value);
        if (!trimmed) {
            setDiagnostics([]);
            onDiagnosticsChangeRef.current?.([]);
            return;
        }
        validateExpression(value);
    }, [inputMode, value, validateExpression]);

    useEffect(() => {
        return () => {
            onDiagnosticsChange?.([]);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const errorDiagnostics = useMemo(() => diagnostics.filter((d) => d.severity === 1), [diagnostics]);
    const errorMessage = useMemo(() => errorDiagnostics.map((d) => d.message).join("\n"), [errorDiagnostics]);

    const isModeSwitchDisabled = !!disabled;

    const modeSwitch = (
        <ModeSwitchWrapper disabled={isModeSwitchDisabled}>
            <ModeSlider checked={inputMode === InputMode.EXP} />
            <ModeLabel
                active={inputMode === InputMode.TEXT}
                onClick={() => {
                    if (isModeSwitchDisabled) return;
                    if (inputMode === InputMode.TEXT) return;
                    if (!canSwitchToText) {
                        setShowWarning(true);
                        return;
                    }
                    setInputMode(InputMode.TEXT);
                }}
            >
                Text
            </ModeLabel>
            <ModeLabel
                active={inputMode === InputMode.EXP}
                onClick={() => {
                    if (isModeSwitchDisabled) return;
                    setInputMode(InputMode.EXP);
                }}
            >
                Expression
            </ModeLabel>
        </ModeSwitchWrapper>
    );

    const effectiveTargetLineRange: LineRange = useMemo(
        () =>
            targetLineRange ?? {
                startLine: { line: 0, offset: 0 },
                endLine: { line: 0, offset: 0 },
            },
        [targetLineRange]
    );

    const editorValue = useMemo(() => {
        if (inputMode === InputMode.TEXT) {
            const trimmed = getTrimmed(value);
            if (isQuotedStringLiteral(trimmed)) {
                return unquoteStringLiteral(trimmed);
            }
        }
        return value;
    }, [inputMode, value]);

    const handleRetrieveCompletions = useMemo(
        () => async (expression: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => {
            await retrieveCompletions(expression, property, offset, triggerCharacter);
            if (triggerCharacter) {
                await retrieveCompletions.flush();
            }
        },
        [retrieveCompletions]
    );

    const helperPane = useMemo(
        () =>
            (currentValue: string, helperOnChange: (value: string, options?: any) => void, helperPaneHeight: any) => {
                if (!filePath) {
                    return null;
                }

                const helperField: FormField = {
                    key: id ?? "moveTo",
                    label: moveToProperty?.metadata?.label || "Move To",
                    type: "EXPRESSION",
                    optional: moveToProperty?.optional ?? false,
                    editable: moveToProperty?.editable ?? true,
                    documentation: moveToProperty?.metadata?.description || "",
                    value: currentValue,
                    types: moveToProperty?.types || [{ fieldType: "STRING", selected: true }],
                    enabled: true,
                    advanced: moveToProperty?.advanced,
                    hidden: moveToProperty?.hidden,
                    placeholder: moveToProperty?.placeholder,
                    metadata: moveToProperty?.metadata,
                    codedata: moveToProperty?.codedata as any,
                    imports: moveToProperty?.imports,
                };

                return (
                    <FieldProvider initialField={helperField} triggerCharacters={TRIGGER_CHARACTERS}>
                        {getHelperPaneNew({
                            fieldKey: helperField.key,
                            fileName: filePath,
                            targetLineRange: effectiveTargetLineRange,
                            anchorRef: helperPaneAnchorRef,
                            onClose: () => { },
                            defaultValue: "",
                            currentValue: currentValue,
                            onChange: helperOnChange,
                            helperPaneHeight: helperPaneHeight,
                            recordTypeField: undefined,
                            updateImports: () => { },
                            completions: filteredCompletions,
                            filteredCompletions: filteredCompletions,
                            isInModal: true,
                            types: moveToProperty?.types,
                            handleRetrieveCompletions: handleRetrieveCompletions,
                            forcedValueTypeConstraint: "string",
                            handleValueTypeConstChange: () => { },
                            inputMode: inputMode,
                        })}
                    </FieldProvider>
                );
            },
        [
            id,
            filePath,
            moveToProperty,
            effectiveTargetLineRange,
            filteredCompletions,
            handleRetrieveCompletions,
            inputMode,
        ]
    );

    return (
        <div>
            <HeaderRow>
                <HeaderLeft>
                    <Typography variant="body3">Move To</Typography>
                    <FieldDescription>Destination path</FieldDescription>
                </HeaderLeft>
                {modeSwitch}
            </HeaderRow>

            <FormContextProvider {...(formContext as any)}>
                <ChipExpressionEditorComponent
                    key={inputMode}
                    completions={[]}
                    getHelperPane={helperPane}
                    onChange={(updated) => {
                        onChange(updated);
                        const trimmed = getTrimmed(updated);
                        if (!trimmed) {
                            setDiagnostics([]);
                            onDiagnosticsChange?.([]);
                            return;
                        }
                        validateExpression(updated);
                    }}
                    value={editorValue}
                    placeholder={inputMode === InputMode.TEXT ? "/path/to/dir" : '"/path/to/dir"'}
                    fileName={filePath}
                    targetLineRange={effectiveTargetLineRange}
                    isExpandedVersion={false}
                    disabled={disabled}
                    configuration={inputMode === InputMode.TEXT ? new MoveToTextEditorConfig() : new MoveToExpressionEditorConfig()}
                    hideFxButton={inputMode === InputMode.TEXT}
                />
            </FormContextProvider>

            {required && isEmptyValue && (
                <Typography variant="body3" sx={{ marginTop: 4, color: "var(--vscode-errorForeground)" }}>
                    Move To is required
                </Typography>
            )}

            {errorDiagnostics.length > 0 && (
                <ErrorBanner errorMsg={errorMessage} />
            )}

            <WarningPopup
                isOpen={showWarning}
                onContinue={() => {
                    setShowWarning(false);
                    setInputMode(InputMode.TEXT);
                    onChange("");
                    setDiagnostics([]);
                    onDiagnosticsChange?.([]);
                }}
                onCancel={() => setShowWarning(false)}
            />
        </div>
    );
}
