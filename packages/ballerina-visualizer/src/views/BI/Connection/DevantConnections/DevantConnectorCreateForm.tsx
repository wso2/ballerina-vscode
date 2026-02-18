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

import {
    type MarketplaceItem,
    type MarketplaceItemSchema,
    type Project,
    ServiceInfoVisibilityEnum,
    capitalizeFirstLetter,
    getTypeForDisplayType,
} from "@wso2/wso2-platform-core";
import React, { ReactNode, useEffect, useState, type FC } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { FormStyles } from "../../Forms/styles";
import { Dropdown, TextField, Codicon, LinkButton, ThemeColors, CheckBox, CheckBoxGroup } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";
import { useMutation } from "@tanstack/react-query";
import { ActionButton, ConnectorContentContainer, ConnectorInfoContainer, FooterContainer } from "../styles";
import { DevantConnectionFlow, DevantTempConfig } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { generateInitialConnectionName, isValidDevantConnName } from "./utils";

const Row = styled.div<{}>`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

export const ButtonContainer = styled.div<{}>`
    display: flex;
    flex-direction: row;
    flex-grow: 1;
    justify-content: flex-end;
`;

const BoxGroup = styled.div`
    display: flex;
    width: 100%;
    flex-wrap: wrap;
`;

const RowTitle = styled.div`
    display: flex;
    gap: 2px;
    align-items: center;
`;

export const getPossibleVisibilities = (marketplaceItem: MarketplaceItem, project: Project) => {
    const { connectionSchemas = [], visibility: visibilities = [] } = marketplaceItem ?? {};
    const filteredVisibilities = visibilities.filter((item) => {
        if (item === ServiceInfoVisibilityEnum.Project) {
            return marketplaceItem.projectId === project.id;
        }
        return item;
    });
    /**
     *
     * There can be services with multiple visibilities but only with one schema.
     * [PROJECT, ORGANIZATION] => Default OAuth Connection - Organization
     *
     * In this case, the visibilities should be filtered to only include the one that mathces the schema.
     *
     * If the schema is Unsecured, the visibilities should be filtered to include only Organization and Public
     * else, the visibilities should be filtered to include only the visibilities that match the schema name.
     */
    if (connectionSchemas.length === 1 && filteredVisibilities.length > 1) {
        return filteredVisibilities.filter((v) => {
            const connectionSchemaName = connectionSchemas[0].name.toLowerCase();
            if (connectionSchemaName.includes("Unsecured".toLowerCase())) {
                return v === ServiceInfoVisibilityEnum.Organization || v === ServiceInfoVisibilityEnum.Public;
            }
            return connectionSchemaName.includes(v.toLowerCase());
        });
    }
    return filteredVisibilities;
};

export const getInitialVisibility = (item: MarketplaceItem, visibilities: string[] = []) => {
    if (item?.isThirdParty) {
        return ServiceInfoVisibilityEnum.Public;
    }
    if (visibilities.includes(ServiceInfoVisibilityEnum.Project)) {
        return ServiceInfoVisibilityEnum.Project;
    }
    if (visibilities.includes(ServiceInfoVisibilityEnum.Organization)) {
        return ServiceInfoVisibilityEnum.Organization;
    }
    return ServiceInfoVisibilityEnum.Public;
};

const getPossibleSchemas = (
    item: MarketplaceItem,
    selectedVisibility: string,
    connectionSchemas: MarketplaceItemSchema[] = [],
) => {
    if (!item) {
        return [];
    }
    // If third party, return schemas without filtering
    if (item.isThirdParty) {
        return item.connectionSchemas;
    }
    // Set the filtered schemas based on the selected visibility
    // organization and public visibilities can have
    // Oauth2, api key or unauthenaticated
    // project visibility can have only project
    const schemasFiltered = connectionSchemas.filter((schema) => {
        if (
            selectedVisibility.toLowerCase().includes("organization") ||
            selectedVisibility.toLowerCase().includes("public")
        ) {
            return (
                schema.name.toLowerCase().includes(selectedVisibility.toLowerCase()) ||
                schema.name.toLowerCase().includes("unsecured")
            );
        }
        return schema.name.toLowerCase().includes("project");
    });
    return schemasFiltered;
};

interface CreateConnectionForm {
    name?: string;
    visibility?: string;
    schemaId?: string;
    isProjectLevel?: boolean;
    envKeys?: string[];
}

interface DevantConnectorCreateFormProps {
    marketplaceItem: MarketplaceItem | undefined;
    projectPath: string;
    devantConfigs: DevantTempConfig[];
    devantFlow: DevantConnectionFlow;
    existingDevantConnNames?: string[];
    biConnectionNames?: string[];
    onSuccess?: (data: { connectionNode?: any; connectionName?: string }) => void;
}

export const DevantConnectorCreateForm: FC<DevantConnectorCreateFormProps> = ({
    biConnectionNames,
    marketplaceItem,
    existingDevantConnNames = [],
    projectPath,
    onSuccess,
    devantConfigs = [],
}) => {
    const { platformExtState, platformRpcClient } = usePlatformExtContext();
    const [showAdvancedSection, setShowAdvancedSection] = useState(false);

    const visibilities = getPossibleVisibilities(marketplaceItem, platformExtState?.selectedContext?.project);

    const form = useForm<CreateConnectionForm>({
        mode: "all",
        defaultValues: {
            name: generateInitialConnectionName(
                biConnectionNames,
                existingDevantConnNames,
                marketplaceItem?.name || "",
            ),
            visibility: getInitialVisibility(marketplaceItem, visibilities),
            schemaId: "",
            isProjectLevel: false,
            envKeys: [],
        },
    });

    useEffect(() => {
        form.reset({
            name: generateInitialConnectionName(
                biConnectionNames,
                existingDevantConnNames,
                marketplaceItem?.name || "",
            ),
            visibility: getInitialVisibility(marketplaceItem, visibilities),
            schemaId: "",
            isProjectLevel: false,
        });
    }, [marketplaceItem]);

    const { mutate: createConnection, isPending: isCreatingConnection } = useMutation({
        mutationFn: async (data: CreateConnectionForm) => {
            const createdConnection = await platformRpcClient?.createInternalConnection({
                componentId: isProjectLevel ? "" : platformExtState.selectedComponent?.metadata?.id,
                name: data.name,
                orgId: platformExtState.selectedContext?.org.id?.toString(),
                orgUuid: platformExtState.selectedContext?.org?.uuid,
                projectId: platformExtState.selectedContext?.project.id,
                serviceSchemaId: marketplaceItem?.connectionSchemas[0]?.id || "",
                serviceId: marketplaceItem?.serviceId,
                serviceVisibility: getInitialVisibility(marketplaceItem, visibilities),
                componentType: isProjectLevel
                    ? "non-component"
                    : getTypeForDisplayType(platformExtState.selectedComponent?.spec?.type),
                componentPath: projectPath,
                generateCreds: true,
            });

            const securityType = createdConnection?.schemaName?.toLowerCase()?.includes("oauth") ? "oauth" : "apikey";

            const initializeResp = await platformRpcClient?.initializeDevantOASConnection({
                devantConfigs,
                marketplaceItem: marketplaceItem!,
                configurations: createdConnection.configurations,
                name: data.name,
                securityType,
                visibility: data.visibility,
            });

            await platformRpcClient.createConnectionConfig({
                marketplaceItem: marketplaceItem,
                name: createdConnection.name,
                visibility: data.visibility,
                componentDir: projectPath,
            });

            return initializeResp;
        },
        onSuccess: (data) => {
            platformRpcClient.refreshConnectionList();
            if (onSuccess) {
                onSuccess(data);
            }
        },
    });

    const createDevantConnection: SubmitHandler<CreateConnectionForm> = (data) => createConnection(data);

    const selectedVisibility = form.watch("visibility");

    const schemas = getPossibleSchemas(marketplaceItem, selectedVisibility, marketplaceItem?.connectionSchemas);

    useEffect(() => {
        if (!schemas.some((item) => item.id === form.getValues("schemaId")) && schemas.length > 0) {
            form.setValue("schemaId", schemas[0].id);
        }
    }, [schemas]);

    const isProjectLevel = form.watch("isProjectLevel");
    const selectedSchemaId = form.watch("schemaId");
    const selectedKeys = form.watch("envKeys");
    const selectedSchema = schemas?.find((schema) => schema.id === selectedSchemaId);

    useEffect(() => {
        form.setValue("envKeys", selectedSchema?.entries?.map((entry) => entry.name) || []);
    }, [selectedSchema]);

    const advancedConfigItems: ReactNode[] = [];
    if (!marketplaceItem.isThirdParty) {
        advancedConfigItems.push(
            <FormStyles.Row>
                <Dropdown
                    id="visibility"
                    label="Access Mode"
                    containerSx={{ width: "100%" }}
                    items={visibilities?.map((item) => ({
                        value: item,
                        content: capitalizeFirstLetter(item.toLowerCase()),
                    }))}
                    {...form.register("visibility", {
                        validate: (value) => {
                            if (!value) {
                                return "Required";
                            }
                        },
                    })}
                    required
                    disabled={visibilities?.length === 0}
                    errorMsg={form.formState.errors.visibility?.message}
                />
            </FormStyles.Row>,
            <FormStyles.Row>
                <Dropdown
                    id="schemaId"
                    label="Authentication Scheme"
                    containerSx={{ width: "100%" }}
                    items={schemas.map((item) => ({ value: item.id, content: item.name }))}
                    {...form.register("schemaId", {
                        validate: (value) => {
                            if (!value) {
                                return "Required";
                            }
                        },
                    })}
                    required
                    disabled={schemas?.length === 0}
                    errorMsg={form.formState.errors.schemaId?.message}
                />
            </FormStyles.Row>,
        );
    }

    if (platformExtState.selectedComponent) {
        advancedConfigItems.push(
            <FormStyles.Row>
                <CheckBox
                    label="Connection available to all integrations within your Devant project"
                    checked={isProjectLevel}
                    onChange={(checked: boolean) => {
                        form.setValue("isProjectLevel", checked);
                    }}
                />
            </FormStyles.Row>,
        );
    }

    return (
        <ConnectorInfoContainer>
            <ConnectorContentContainer hasFooterButton>
                <FormStyles.Container style={{ padding: 0 }}>
                    <FormStyles.Row>
                        <TextField
                            label="Name"
                            required
                            name="name"
                            placeholder="connection-name"
                            sx={{ width: "100%" }}
                            {...form.register("name", {
                                validate: (value) =>
                                    isValidDevantConnName(value, existingDevantConnNames, biConnectionNames),
                            })}
                            errorMsg={form.formState.errors.name?.message}
                        />
                    </FormStyles.Row>

                    {advancedConfigItems.length > 0 && (
                        <Row>
                            Advanced Configurations
                            <ButtonContainer>
                                {!showAdvancedSection && (
                                    <LinkButton
                                        onClick={() => setShowAdvancedSection(true)}
                                        sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4 }}
                                    >
                                        <Codicon name={"chevron-down"} iconSx={{ fontSize: 12 }} sx={{ height: 12 }} />
                                        Expand
                                    </LinkButton>
                                )}
                                {showAdvancedSection && (
                                    <LinkButton
                                        onClick={() => setShowAdvancedSection(false)}
                                        sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4 }}
                                    >
                                        <Codicon name={"chevron-up"} iconSx={{ fontSize: 12 }} sx={{ height: 12 }} />
                                        Collapsed
                                    </LinkButton>
                                )}
                            </ButtonContainer>
                        </Row>
                    )}

                    {showAdvancedSection && advancedConfigItems}

                    {marketplaceItem?.isThirdParty && selectedSchema && (
                        <FormStyles.Row>
                            <CheckBoxGroup>
                                <RowTitle>
                                    Environment Variables{" "}
                                    <Codicon
                                        name="info"
                                        tooltip="Following variables will need to be used when initializing the connector."
                                    />
                                </RowTitle>
                                <BoxGroup>
                                    {selectedSchema?.entries?.map((entry) => (
                                        <CheckBox
                                            key={entry.name}
                                            label={entry.name}
                                            checked={selectedKeys?.includes(entry.name)}
                                            onChange={(checked: boolean) => {
                                                form.setValue(
                                                    "envKeys",
                                                    checked
                                                        ? [...selectedKeys, entry.name]
                                                        : selectedKeys.filter((key) => key !== entry.name),
                                                );
                                            }}
                                        />
                                    ))}
                                </BoxGroup>
                            </CheckBoxGroup>
                        </FormStyles.Row>
                    )}
                </FormStyles.Container>
            </ConnectorContentContainer>
            <FooterContainer>
                <ActionButton
                    appearance="primary"
                    onClick={form.handleSubmit(createDevantConnection)}
                    disabled={isCreatingConnection}
                    buttonSx={{ width: "100%", height: "35px" }}
                >
                    {isCreatingConnection ? "Creating..." : "Create Connection"}
                </ActionButton>
            </FooterContainer>
        </ConnectorInfoContainer>
    );
};
