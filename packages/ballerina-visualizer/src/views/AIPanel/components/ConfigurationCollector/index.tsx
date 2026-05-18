/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import { Button, Codicon, ThemeColors } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ConfigurationCollectorMetadata, ParentPopupData } from "@wso2/ballerina-core";
import {
    PopupOverlay,
    PopupContainer,
    PopupHeader,
    HeaderTitleContainer,
    PopupTitle,
    PopupSubtitle,
    CloseButton,
    PopupContent,
    PopupFooter,
} from "../../../BI/Connection/styles";

// ─── Styled components ────────────────────────────────────────────────────────

const FormSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const ConfigurationField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const FieldLabel = styled.label`
    font-size: 13px;
    font-weight: 500;
    color: ${ThemeColors.ON_SURFACE};
    display: flex;
    align-items: center;
    gap: 4px;
`;

const FieldDescription = styled.span`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-style: italic;
    font-weight: normal;
`;

const FieldInputWrapper = styled.div`
    position: relative;
    display: flex;
    align-items: center;
`;

const FieldInput = styled.input<{ hasError: boolean; hasToggle?: boolean }>`
    width: 100%;
    padding: 10px ${(props: { hasError: boolean; hasToggle?: boolean }) => props.hasToggle ? "36px" : "12px"} 10px 12px;
    background-color: ${ThemeColors.SURFACE_DIM};
    color: ${ThemeColors.ON_SURFACE};
    border: 1px solid ${(props: { hasError: boolean; hasToggle?: boolean }) =>
        props.hasError ? ThemeColors.ERROR : ThemeColors.OUTLINE_VARIANT};
    border-radius: 6px;
    font-size: 13px;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${ThemeColors.PRIMARY};
    }

    &::placeholder {
        color: ${ThemeColors.ON_SURFACE_VARIANT};
    }
`;

const FieldSelect = styled.select<{ hasError: boolean }>`
    width: 100%;
    padding: 10px 12px;
    background-color: ${ThemeColors.SURFACE_DIM};
    color: ${ThemeColors.ON_SURFACE};
    border: 1px solid ${(props: { hasError: boolean }) =>
        props.hasError ? ThemeColors.ERROR : ThemeColors.OUTLINE_VARIANT};
    border-radius: 6px;
    font-size: 13px;
    box-sizing: border-box;
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: ${ThemeColors.PRIMARY};
    }
`;

const ToggleVisibilityButton = styled.button`
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    display: flex;
    align-items: center;

    &:hover {
        color: ${ThemeColors.ON_SURFACE};
    }
`;

const FieldError = styled.div`
    font-size: 12px;
    color: ${ThemeColors.ERROR};
`;

const ActionButton = styled(Button)``;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
`;

// ─── Field type config (single source of truth) ───────────────────────────────
//
// To add a new Ballerina type: add an entry here. No other code needs to change.

type InputKind = "text" | "number" | "select";

interface SelectOption {
    label: string;
    value: string;
}

interface FieldConfig {
    inputKind: InputKind;
    placeholder?: string;
    selectOptions?: SelectOption[];
    defaultValue?: string;
    validate: (value: string) => string | null;
}

const NUMERIC_INT_TYPES = new Set(["int", "byte"]);
const NUMERIC_FLOAT_TYPES = new Set(["decimal", "float"]);

function getFieldConfig(type: string | undefined): FieldConfig {
    if (NUMERIC_INT_TYPES.has(type ?? "")) {
        return {
            inputKind: "number",
            placeholder: "Enter integer",
            validate: (v) => {
                if (!v.trim()) return "This field is required";
                if (isNaN(parseInt(v, 10)) || !Number.isInteger(parseFloat(v))) return "Enter a valid integer";
                return null;
            },
        };
    }
    if (NUMERIC_FLOAT_TYPES.has(type ?? "")) {
        return {
            inputKind: "number",
            placeholder: "Enter number",
            validate: (v) => {
                if (!v.trim()) return "This field is required";
                if (isNaN(parseFloat(v))) return "Enter a valid number";
                return null;
            },
        };
    }
    if (type === "boolean") {
        return {
            inputKind: "select",
            defaultValue: "true",
            selectOptions: [
                { label: "true", value: "true" },
                { label: "false", value: "false" },
            ],
            validate: () => null, // select always holds a valid option
        };
    }
    // Default: string, records, arrays, maps, or any unknown LS type
    return {
        inputKind: "text",
        placeholder: "Enter value",
        validate: (v) => (!v || !v.trim() ? "This field is required" : null),
    };
}

// ─── ConfigField sub-component ────────────────────────────────────────────────

interface ConfigFieldProps {
    variable: { name: string; description?: string; type?: string; secret?: boolean };
    value: string;
    error?: string;
    isVisible: boolean;
    onToggleVisibility: () => void;
    onChange: (name: string, value: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}

const ConfigField: React.FC<ConfigFieldProps> = ({
    variable, value, error, isVisible, onToggleVisibility, onChange, onKeyDown,
}) => {
    const config = getFieldConfig(variable.type);
    const isSecret = variable.secret === true;

    const renderInput = () => {
        if (!isSecret && config.inputKind === "select") {
            return (
                <FieldSelect
                    hasError={!!error}
                    value={value}
                    onChange={(e) => onChange(variable.name, e.target.value)}
                >
                    {config.selectOptions!.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </FieldSelect>
            );
        }

        const htmlInputType = isSecret
            ? (isVisible ? "text" : "password")
            : config.inputKind;

        return (
            <FieldInputWrapper>
                <FieldInput
                    type={htmlInputType}
                    placeholder={config.placeholder}
                    value={value}
                    onChange={(e) => onChange(variable.name, e.target.value)}
                    onKeyDown={onKeyDown}
                    hasError={!!error}
                    hasToggle={isSecret}
                />
                {isSecret && (
                    <ToggleVisibilityButton
                        type="button"
                        onClick={onToggleVisibility}
                        title={isVisible ? "Hide value" : "Show value"}
                    >
                        <Codicon name={isVisible ? "eye-closed" : "eye"} />
                    </ToggleVisibilityButton>
                )}
            </FieldInputWrapper>
        );
    };

    return (
        <ConfigurationField>
            <FieldLabel>
                {variable.name}
                {variable.description && (
                    <FieldDescription>- {variable.description}</FieldDescription>
                )}
            </FieldLabel>
            {renderInput()}
            {error && <FieldError>{error}</FieldError>}
        </ConfigurationField>
    );
};

// ─── ConfigurationCollector ───────────────────────────────────────────────────

interface ConfigurationCollectorProps {
    data?: ConfigurationCollectorMetadata;
    onClose: (parent?: ParentPopupData) => void;
}

function buildInitialValues(data: ConfigurationCollectorMetadata | undefined): Record<string, string> {
    const values: Record<string, string> = { ...(data?.existingValues ?? {}) };
    data?.variables?.forEach((v) => {
        const config = getFieldConfig(v.type);
        if (!(v.name in values) && config.defaultValue !== undefined) {
            values[v.name] = config.defaultValue;
        }
    });
    return values;
}

export const ConfigurationCollector: React.FC<ConfigurationCollectorProps> = ({ data, onClose }) => {
    const { rpcClient } = useRpcContext();
    const [configValues, setConfigValues] = useState<Record<string, string>>(buildInitialValues(data));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setConfigValues(buildInitialValues(data));
        setVisibleFields({});
    }, [data]);

    const handleInputChange = (variableName: string, value: string) => {
        setConfigValues((prev) => ({ ...prev, [variableName]: value }));
        setErrors((prev) => {
            const next = { ...prev };
            delete next[variableName];
            return next;
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !isProcessing) {
            handleSubmit();
        }
    };

    const validateConfiguration = (): boolean => {
        const newErrors: Record<string, string> = {};
        data?.variables?.forEach((variable) => {
            const error = getFieldConfig(variable.type).validate(configValues[variable.name] ?? "");
            if (error) newErrors[variable.name] = error;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!data) return;

        console.log("[ConfigurationCollector] handleSubmit called", {
            requestId: data.requestId,
            configurationCount: Object.keys(configValues).length,
        });

        if (!validateConfiguration()) {
            console.log("[ConfigurationCollector] Validation failed");
            return;
        }

        setIsProcessing(true);

        try {
            console.log("[ConfigurationCollector] Calling provideConfiguration RPC");
            await rpcClient.getAiPanelRpcClient().provideConfiguration({
                requestId: data.requestId,
                configValues: configValues,
            });
            console.log("[ConfigurationCollector] RPC call successful");
            onClose();
        } catch (error: any) {
            console.error("[ConfigurationCollector] Error in handleSubmit:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!data) {
            onClose();
            return;
        }
        try {
            await rpcClient.getAiPanelRpcClient().cancelConfiguration({
                requestId: data.requestId,
            });
        } catch (error: any) {
            console.error("[ConfigurationCollector] Error in handleCancel:", error);
        }
        onClose();
    };

    // Close button (X) just closes the popup without canceling configuration collection
    // User can reopen via the Configure button in the chat segment
    const handleClose = () => onClose();

    // Prevent overlay clicks from closing the popup
    const handleOverlayClick = (e: React.MouseEvent) => e.stopPropagation();

    if (!data) {
        return (
            <>
                <PopupOverlay
                    sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.5` }}
                    onClose={handleOverlayClick}
                />
                <PopupContainer>
                    <LoadingContainer>Loading...</LoadingContainer>
                </PopupContainer>
            </>
        );
    }

    return (
        <>
            <PopupOverlay
                sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.5` }}
                onClose={handleOverlayClick}
            />
            <PopupContainer>
                <PopupHeader>
                    <HeaderTitleContainer>
                        <PopupTitle variant="h2">
                            {data.isTestConfig ? "Configure Test Environment" : "Configure Application"}
                        </PopupTitle>
                        {data.message && <PopupSubtitle variant="body2">{data.message}</PopupSubtitle>}
                    </HeaderTitleContainer>
                    <CloseButton appearance="icon" onClick={handleClose}>
                        <Codicon name="close" />
                    </CloseButton>
                </PopupHeader>
                <PopupContent>
                    <FormSection>
                        {data.variables?.map((variable) => (
                            <ConfigField
                                key={variable.name}
                                variable={variable}
                                value={configValues[variable.name] ?? ""}
                                error={errors[variable.name]}
                                isVisible={visibleFields[variable.name] ?? false}
                                onToggleVisibility={() => setVisibleFields((prev) => ({ ...prev, [variable.name]: !prev[variable.name] }))}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                            />
                        ))}
                    </FormSection>
                </PopupContent>
                <PopupFooter>
                    <ActionButton appearance="secondary" onClick={handleCancel} disabled={isProcessing}>
                        Skip
                    </ActionButton>
                    <ActionButton
                        appearance="primary"
                        onClick={handleSubmit}
                        disabled={isProcessing || !data.variables || data.variables.length === 0}
                    >
                        {isProcessing ? "Saving..." : "Save Configuration"}
                    </ActionButton>
                </PopupFooter>
            </PopupContainer>
        </>
    );
};

export default ConfigurationCollector;
