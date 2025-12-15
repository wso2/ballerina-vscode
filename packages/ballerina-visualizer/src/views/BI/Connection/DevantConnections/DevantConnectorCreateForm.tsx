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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    type ComponentKind,
    type ConnectionListItem,
    type MarketplaceItem,
    type MarketplaceItemSchema,
    type Organization,
    type Project,
    ServiceInfoVisibilityEnum,
    capitalizeFirstLetter,
} from "@wso2/wso2-platform-core";
import React, { ReactNode, useEffect, useState, type FC } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { FormStyles } from "../../Forms/styles";
import { Dropdown, TextField, Button, Typography, Codicon, LinkButton, ThemeColors, CheckBox } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";
import { AvailableNode } from "@wso2/ballerina-core";

interface Props {
    item: MarketplaceItem;
    project: Project;
    onCreate: (params: { connectionName?: string; connectionNode?: AvailableNode }) => void;
    onShowInfo: () => void;
    isShowingInfo: boolean;
}

const HeaderWrap = styled.div`
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

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

const getPossibleVisibilities = (marketplaceItem: MarketplaceItem, project: Project) => {
    const { connectionSchemas = [], visibility: visibilities = [] } = marketplaceItem;
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

const getInitialVisibility = (item: MarketplaceItem, visibilities: string[] = []) => {
    if(item.isThirdParty){
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

const getPossibleSchemas = (item: MarketplaceItem, selectedVisibility: string, connectionSchemas: MarketplaceItemSchema[] = []) => {
    // If third party, return schemas without filtering
    if(item.isThirdParty){
        return item.connectionSchemas
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
}

export const DevantConnectorCreateForm: FC<Props> = ({ item, project, onShowInfo, isShowingInfo, onCreate }) => {
    const { platformRpcClient, platformExtState } = usePlatformExtContext();
    const [showAdvancedSection, setShowAdvancedSection] = useState(false);

    const visibilities = getPossibleVisibilities(item, project);

    const form = useForm<CreateConnectionForm>({
        mode: "all",
        defaultValues: {
            name: item.name,
            visibility: getInitialVisibility(item, visibilities),
            schemaId: "",
            isProjectLevel: false,
        },
    });

    const selectedVisibility = form.watch("visibility");

    const schemas = getPossibleSchemas(item, selectedVisibility, item.connectionSchemas);

    useEffect(() => {
        if (!schemas.some((item) => item.id === form.getValues("schemaId")) && schemas.length > 0) {
            form.setValue("schemaId", schemas[0].id);
        }
    }, [schemas]);

    const { mutate: createConnection, isPending: isCreatingConnection } = useMutation({
        mutationFn: (data: CreateConnectionForm) =>
            platformRpcClient?.createDevantComponentConnection({
                marketplaceItem: item,
                params: {
                    name: data.name,
                    schemaId: data.schemaId,
                    visibility: data.visibility,
                    isProjectLevel: data.isProjectLevel,
                },
            }),
        onSuccess: (data) => onCreate(data),
    });

    const onSubmit: SubmitHandler<CreateConnectionForm> = (data) => createConnection(data);

    const isProjectLevel = form.watch("isProjectLevel");

    const advancedConfigItems: ReactNode[] = [];
    if (!item.isThirdParty) {
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
            </FormStyles.Row>
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
            </FormStyles.Row>
        );
    }

    return (
        <>
            <HeaderWrap>
                <Typography variant="body3">{item.name}</Typography>
                <Button disabled={isShowingInfo} onClick={onShowInfo} appearance="icon">
                    Details
                </Button>
            </HeaderWrap>
            <FormStyles.Container>
                <FormStyles.Row>
                    <TextField
                        label="Name"
                        required
                        name="name"
                        placeholder="connection-name"
                        sx={{ width: "100%" }}
                        {...form.register("name", {
                            validate: (value) => {
                                if (!value || value.trim().length === 0) {
                                    return "Required";
                                } else if (platformExtState?.devantConns?.list?.some((item) => item.name === value)) {
                                    return "Name already exists";
                                } else if (
                                    !/^[\s]*(?!.*[^a-zA-Z0-9][^a-zA-Z0-9])[a-zA-Z0-9][a-zA-Z0-9 _\-.]{1,48}[a-zA-Z0-9][\s]*$/.test(
                                        value
                                    )
                                ) {
                                    return "Cannot contain special characters";
                                } else if (value.length < 3) {
                                    return "Name is too short";
                                } else if (value.length > 50) {
                                    return "Name is too long";
                                }
                            },
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

                <FormStyles.Footer>
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={isCreatingConnection}>
                        {isCreatingConnection ? "Creating..." : "Create"}
                    </Button>
                </FormStyles.Footer>
            </FormStyles.Container>
        </>
    );
};
