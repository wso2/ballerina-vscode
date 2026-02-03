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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { Button, CheckBox, Codicon, TextField, ThemeColors, Typography } from "@wso2/ui-toolkit";
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ConfigVariable, NodePosition, ParentPopupData } from "@wso2/ballerina-core";
import { DeleteDevantTempConfigReq, DevantTempConfig } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ActionButton, FooterContainer } from "../styles";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    height: 100%;
    min-height: 0;
`;

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
`;

const HeaderSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Title = styled(Typography)`
    font-size: 16px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const Subtitle = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;

    flex: 1;
    min-height: 0;
    overflow-y: auto;
`;

const FormField = styled.div`
    position: relative;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    width: 100%;

    padding: 16px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};

    .delete-button {
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
    }

    &:hover .delete-button {
        opacity: 1;
    }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    justify-content: center;
    align-items: center;
    padding: 10px 24px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-size: 14px;
`;

const FieldWrapper = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
`;

const CheckboxWrapper = styled.div`
    display: flex;
    align-items: end;
    height: 100%;
    padding-bottom: 2px;
`;

const RemoveButton = styled(Button)`
    position: absolute;
    top: 6px;
    right: 6px;
`;

const AddConfigButton = styled(Button)`
    width: 100%;
    margin-top: 8px;
`;



export interface EnvValueMap {
    [key: string]: string;
}

interface ConnectorDevantEnvValuesProps {
    configs: DevantTempConfig[];
    onConfigsChange: (configs: DevantTempConfig[]) => void;
    onSave?: (parent?: ParentPopupData) => void;
    isCreating: boolean;
    existingConfigVariables: string[]
}

export const ConnectorDevantCreateConfigs: React.FC<ConnectorDevantEnvValuesProps> = ({
    existingConfigVariables,
    configs,
    onConfigsChange,
    onSave,
    isCreating,
}) => {
    const [errors, setErrors] = useState<{ [id: string]: { name?: string; value?: string } }>({});
    const { platformRpcClient } = usePlatformExtContext();

    const { mutate: deleteTempConfig } = useMutation({
        mutationFn: (params: DeleteDevantTempConfigReq) => {
            return platformRpcClient?.deleteDevantTempConfigs(params);
        },
    });

    const handleConfigChange = (id: string, field: "name" | "value", value: string) => {
        const updatedConfigs = configs.map((config) => (config.id === id ? { ...config, [field]: value } : config));
        onConfigsChange(updatedConfigs);

        // Clear error when user starts typing
        if (errors[id]?.[field]) {
            setErrors((prevErrors) => {
                const newErrors = { ...prevErrors };
                if (newErrors[id]) {
                    delete newErrors[id][field];
                    if (Object.keys(newErrors[id]).length === 0) {
                        delete newErrors[id];
                    }
                }
                return newErrors;
            });
        }
    };

    const handleSecretToggle = (id: string, isSecret: boolean) => {
        const updatedConfigs: DevantTempConfig[] = configs.map((config) => (config.id === id ? { ...config, isSecret } : config));
        onConfigsChange(updatedConfigs);
    };

    const addConfig = () => {
        const updatedConfigs: DevantTempConfig[] = [...configs, { id: crypto.randomUUID(), name: "", value: "", isSecret: false }];
        onConfigsChange(updatedConfigs);
    };

    const removeConfig = (id: string) => {
        const matchingConfig = configs.find((config) => config.id === id);
        if (matchingConfig?.nodePosition) {
            // Call mutation to delete temp config from config file
            deleteTempConfig({ nodePosition: matchingConfig.nodePosition });
        }
        const updatedConfigs = configs.filter((config) => config.id !== id);
        onConfigsChange(updatedConfigs);

        // Remove errors for this config
        setErrors((prevErrors) => {
            const newErrors = { ...prevErrors };
            delete newErrors[id];
            return newErrors;
        });
    };

    const handleSave = () => {
        // Check if there are any configs
        if (configs.length === 0) {
            onSave();
            return;
        }

        // Validate all fields
        const newErrors: { [id: string]: { name?: string; value?: string } } = {};
        let hasErrors = false;

        configs.forEach((config) => {
            const configErrors: { name?: string; value?: string } = {};

            if (!config.name.trim()) {
                configErrors.name = "Name is required";
                hasErrors = true;
            } else {
                // Check if name starts with a number
                if (/^\d/.test(config.name)) {
                    configErrors.name = "Name cannot start with a number";
                    hasErrors = true;
                }
                // Check for spaces or special characters (only allow alphanumeric and underscore)
                else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.name)) {
                    configErrors.name = "Name can only contain letters, numbers, and underscores";
                    hasErrors = true;
                }
            }

            if (!config.value.trim()) {
                configErrors.value = "Value is required";
                hasErrors = true;
            }

            // Check for duplicate names
            const duplicates = configs.filter((c) => c.name.trim() && c.name.trim() === config.name.trim());
            if (duplicates.length > 1) {
                configErrors.name = "Duplicate configuration name";
                hasErrors = true;
            }

            const duplicatesWithExisting = existingConfigVariables.filter((c) => c.trim() === config.name.trim());
            if (duplicatesWithExisting.length > 0) {
                configErrors.name = "Configuration name already exists";
                hasErrors = true;
            }

            if (Object.keys(configErrors).length > 0) {
                newErrors[config.id] = configErrors;
            }
        });

        setErrors(newErrors);

        if (!hasErrors) {
            onSave();
        }
    };

    return (
        <Container>
            <ContentWrapper>
                <HeaderSection>
                    <Title>Devant Runtime Configurations</Title>
                    <Subtitle>
                        These configurations will be injected as environment variables when your integration runs in the
                        Devant Development environment
                    </Subtitle>
                </HeaderSection>
                <FormContainer>
                    {configs.length === 0 ? (
                        <EmptyState>
                            No configurations added yet. Click "Add Devant Configuration" to get started.
                            <AddConfigButton appearance="secondary" onClick={addConfig}>
                                Add Devant Configuration
                            </AddConfigButton>
                        </EmptyState>
                    ) : (
                        <>
                            {configs.map((config, index) => (
                                <FormField key={config.id}>
                                    <FieldWrapper>
                                        <TextField
                                            label="Configuration Name"
                                            name={`config-name-${config.id}`}
                                            placeholder="e.g., ServiceUrl, Host, Port, ApiKey, etc"
                                            value={config.name}
                                            onChange={(e) => handleConfigChange(config.id, "name", e.target.value)}
                                            sx={{ width: "100%" }}
                                            errorMsg={errors[config.id]?.name}
                                        />
                                    </FieldWrapper>
                                    <FieldWrapper>
                                        <TextField
                                            label="Configuration Value"
                                            name={`config-value-${config.id}`}
                                            type={config.isSecret ? "password" : "text"}
                                            placeholder="Enter value"
                                            value={config.value}
                                            onChange={(e) => handleConfigChange(config.id, "value", e.target.value)}
                                            sx={{ width: "100%" }}
                                            errorMsg={errors[config.id]?.value}
                                        />
                                    </FieldWrapper>
                                    <CheckboxWrapper>
                                        <CheckBox
                                            label="Secret"
                                            checked={config.isSecret}
                                            onChange={(checked: boolean) => handleSecretToggle(config.id, checked)}
                                        />
                                    </CheckboxWrapper>
                                    <RemoveButton
                                        className="delete-button"
                                        appearance="icon"
                                        onClick={() => removeConfig(config.id)}
                                    >
                                        <Codicon name="trash" sx={{ color: ThemeColors.ERROR }} />
                                    </RemoveButton>
                                </FormField>
                            ))}
                            <AddConfigButton appearance="secondary" onClick={addConfig} sx={{ alignSelf: "end" }}>
                                Add Devant Configuration
                            </AddConfigButton>
                        </>
                    )}
                </FormContainer>
            </ContentWrapper>
            <FooterContainer>
                <ActionButton
                    appearance="primary"
                    onClick={handleSave}
                    disabled={isCreating}
                    buttonSx={{ width: "100%", height: "35px" }}
                >
                    {isCreating ? "Saving..." : "Continue"}
                </ActionButton>
            </FooterContainer>
        </Container>
    );
};
