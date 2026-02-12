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
} from "../Connection/styles";

// Form styled components
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

const FieldInput = styled.input<{ hasError: boolean }>`
    padding: 10px 12px;
    background-color: ${ThemeColors.SURFACE_DIM};
    color: ${ThemeColors.ON_SURFACE};
    border: 1px solid ${(props: { hasError: boolean }) =>
        props.hasError ? ThemeColors.ERROR : ThemeColors.OUTLINE_VARIANT};
    border-radius: 6px;
    font-size: 13px;

    &:focus {
        outline: none;
        border-color: ${ThemeColors.PRIMARY};
    }

    &::placeholder {
        color: ${ThemeColors.ON_SURFACE_VARIANT};
    }
`;

const FieldError = styled.div`
    font-size: 12px;
    color: ${ThemeColors.ERROR};
`;

const ActionButton = styled(Button)`
    min-width: 100px;
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
`;

interface ConfigurationCollectorProps {
    data?: ConfigurationCollectorMetadata;
    onClose: (parent?: ParentPopupData) => void;
}

export const ConfigurationCollector: React.FC<ConfigurationCollectorProps> = ({ data, onClose }) => {
    const { rpcClient } = useRpcContext();
    const [configValues, setConfigValues] = useState<Record<string, string>>(data?.existingValues || {});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);

    // Initialize configuration values when data prop changes
    useEffect(() => {
        if (data?.existingValues) {
            setConfigValues(data.existingValues);
        }
    }, [data]);

    const handleInputChange = (variableName: string, value: string) => {
        setConfigValues((prev) => ({ ...prev, [variableName]: value }));
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[variableName];
            return newErrors;
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
            const value = configValues[variable.name];
            if (!value || !value.trim()) {
                newErrors[variable.name] = "This field is required";
            } else if (variable.type === "int") {
                const intValue = parseInt(value, 10);
                if (isNaN(intValue)) {
                    newErrors[variable.name] = "Please enter a valid number";
                }
            }
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
    const handleClose = () => {
        onClose();
    };

    // Prevent overlay clicks from closing the popup
    const handleOverlayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

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
                            <ConfigurationField key={variable.name}>
                                <FieldLabel>
                                    {variable.name}
                                    {variable.description && (
                                        <FieldDescription>- {variable.description}</FieldDescription>
                                    )}
                                </FieldLabel>
                                <FieldInput
                                    type={variable.type === "int" ? "number" : "text"}
                                    placeholder={
                                        variable.type === "int" ? "Enter number" : "Enter value"
                                    }
                                    value={configValues[variable.name] || ""}
                                    onChange={(e) => handleInputChange(variable.name, e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    hasError={!!errors[variable.name]}
                                />
                                {errors[variable.name] && <FieldError>{errors[variable.name]}</FieldError>}
                            </ConfigurationField>
                        ))}
                    </FormSection>
                </PopupContent>
                <PopupFooter>
                    <ActionButton appearance="secondary" onClick={handleCancel} disabled={isProcessing}>
                        Cancel
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
