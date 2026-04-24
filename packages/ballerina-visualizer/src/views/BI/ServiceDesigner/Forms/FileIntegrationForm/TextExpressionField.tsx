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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

class TextEditorConfig extends StringTemplateEditorConfig {
}

class ExpressionEditorConfig extends ChipExpressionEditorDefaultConfiguration {
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

const removeLiteralWrapping = (value: string): string => {
    const trimmed = getTrimmed(value);
    if (!trimmed) {
        return "";
    }
    if (isStringTemplateLiteral(trimmed)) {
        return getStringTemplateLiteralContent(trimmed) ?? "";
    }
    return unquoteStringLiteral(trimmed);
};

const toExpressionProperty = (propertyModel: PropertyModel | undefined, value: string): ExpressionProperty => ({
    metadata: {
        label: propertyModel?.metadata?.label || "",
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

const toDiagnosticsExpressionProperty = (propertyModel: PropertyModel | undefined, value: string): ExpressionProperty => {
    const baseProperty = toExpressionProperty(propertyModel, value);
    const inputTypes = baseProperty.types;
    if (!inputTypes || inputTypes.length === 0) {
        return {
            ...baseProperty,
            types: [{ fieldType: "EXPRESSION", selected: true } as any],
        };
    }

    const hasExpressionType = inputTypes.some((type) => type.fieldType === "EXPRESSION");
    if (!hasExpressionType) {
        return {
            ...baseProperty,
            types: [{ fieldType: "EXPRESSION", selected: true } as any],
        };
    }

    return {
        ...baseProperty,
        types: inputTypes.map((type) => ({ ...type, selected: type.fieldType === "EXPRESSION" })) as any,
    };
};

export interface TextExpressionFieldProps {
    id?: string;
    value: string;
    property?: PropertyModel;
    filePath?: string;
    targetLineRange?: LineRange;
    required?: boolean;
    disabled?: boolean;
    onChange: (value: string) => void;
    onDiagnosticsChange?: (diagnostics: Diagnostic[]) => void;
    onValidationStateChange?: (state: { isValidating: boolean }) => void;
}

export function TextExpressionField(props: TextExpressionFieldProps) {
    const { id, value, property, filePath, targetLineRange, required, disabled, onChange, onDiagnosticsChange, onValidationStateChange } = props;
    const { rpcClient } = useRpcContext();

    const fieldLabel = property?.metadata?.label || "";
    const fieldDescription = property?.metadata?.description || "";

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
    const [isValidating, setIsValidating] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [completions, setCompletions] = useState<CompletionItem[]>([]);
    const [filteredCompletions, setFilteredCompletions] = useState<CompletionItem[]>([]);

    const onDiagnosticsChangeRef = useRef(onDiagnosticsChange);
    const onValidationStateChangeRef = useRef(onValidationStateChange);
    const propertyRef = useRef(property);
    const prevCompletionFetchText = useRef<string>("");
    const helperPaneAnchorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onDiagnosticsChangeRef.current = onDiagnosticsChange;
    }, [onDiagnosticsChange]);

    useEffect(() => {
        onValidationStateChangeRef.current = onValidationStateChange;
    }, [onValidationStateChange]);

    useEffect(() => {
        onValidationStateChangeRef.current?.({ isValidating });
    }, [isValidating]);

    useEffect(() => {
        propertyRef.current = property;
    }, [property]);

    const resetValidationState = useCallback(() => {
        setIsValidating(false);
    }, []);

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
                    resetValidationState();
                    return;
                }

                const startLine = targetLineRange?.startLine ?? { line: 0, offset: 0 };
                const expressionForDiagnostics = inputMode === InputMode.TEXT
                    && !isQuotedStringLiteral(expression)
                    && !isStringTemplateLiteral(expression)
                    ? JSON.stringify(expression)
                    : expression;
                const prop = toDiagnosticsExpressionProperty(propertyRef.current, expressionForDiagnostics);

                try {
                    const response = await rpcClient.getBIDiagramRpcClient().getExpressionDiagnostics({
                        filePath,
                        context: {
                            expression: expressionForDiagnostics,
                            startLine,
                            lineOffset: 0,
                            offset: 0,
                            codedata: prop.codedata,
                            property: prop,
                        } as any,
                    });

                    const uniqueDiagnostics = removeDuplicateDiagnostics(response.diagnostics || []);
                    setDiagnostics(uniqueDiagnostics);
                    onDiagnosticsChangeRef.current?.(uniqueDiagnostics);
                } catch (error) {
                    // Silently ignore LS failures during fast textarea validation; the save path
                    // revalidates the generated source and surfaces any real errors there.
                    console.error(">>> Error getting expression diagnostics", error);
                    setDiagnostics([]);
                    onDiagnosticsChangeRef.current?.([]);
                } finally {
                    setIsValidating(false);
                }
            }, 250),
        [rpcClient, filePath, targetLineRange, inputMode, resetValidationState]
    );

    const retrieveCompletions = useMemo(
        () =>
            debounce(async (expression: string, prop: ExpressionProperty, offset: number, triggerCharacter?: string) => {
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
                                property: prop,
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
                    console.error(">>> Error getting expression completions", error);
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
            resetValidationState();
            setDiagnostics([]);
            onDiagnosticsChangeRef.current?.([]);
            return;
        }
        setIsValidating(true);
        validateExpression(value);
    }, [inputMode, value, validateExpression]);

    useEffect(() => {
        return () => {
            onDiagnosticsChange?.([]);
            onValidationStateChange?.({ isValidating: false });
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
            if (isQuotedStringLiteral(trimmed) || isStringTemplateLiteral(trimmed)) {
                return removeLiteralWrapping(trimmed);
            }
        }
        return value;
    }, [inputMode, value]);

    const handleRetrieveCompletions = useMemo(
        () => async (expression: string, prop: ExpressionProperty, offset: number, triggerCharacter?: string) => {
            await retrieveCompletions(expression, prop, offset, triggerCharacter);
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
                    key: id ?? "textExpressionField",
                    label: property?.metadata?.label || "",
                    type: "EXPRESSION",
                    optional: property?.optional ?? false,
                    editable: property?.editable ?? true,
                    documentation: property?.metadata?.description || "",
                    value: currentValue,
                    types: property?.types || [{ fieldType: "STRING", selected: true }],
                    enabled: true,
                    advanced: property?.advanced,
                    hidden: property?.hidden,
                    placeholder: property?.placeholder,
                    metadata: property?.metadata,
                    codedata: property?.codedata as any,
                    imports: property?.imports,
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
                            types: property?.types,
                            handleRetrieveCompletions: handleRetrieveCompletions,
                            inputMode: inputMode,
                        })}
                    </FieldProvider>
                );
            },
        [
            id,
            filePath,
            property,
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
                    <Typography variant="body3">{fieldLabel}</Typography>
                    {fieldDescription && <FieldDescription>{fieldDescription}</FieldDescription>}
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
                            resetValidationState();
                            setDiagnostics([]);
                            onDiagnosticsChange?.([]);
                            return;
                        }
                        setIsValidating(true);
                        validateExpression(updated);
                    }}
                    value={editorValue}
                    placeholder={inputMode === InputMode.TEXT ? "/path/to/dir" : '"/path/to/dir"'}
                    fileName={filePath}
                    targetLineRange={effectiveTargetLineRange}
                    isExpandedVersion={false}
                    disabled={disabled}
                    configuration={inputMode === InputMode.TEXT ? new TextEditorConfig() : new ExpressionEditorConfig()}
                    hideFxButton={inputMode === InputMode.TEXT}
                />
            </FormContextProvider>

            {required && isEmptyValue && (
                <Typography variant="body3" sx={{ marginTop: 4, color: "var(--vscode-errorForeground)" }}>
                    {fieldLabel} is required
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
