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

import styled from "@emotion/styled";
import { ThemeColors, Typography, Button, Icon } from "@wso2/ui-toolkit";
import { PropertyModel } from "@wso2/ballerina-core";
import { ConnectorIcon } from "@wso2/bi-diagram";
import { isDatabaseSystemProperty, formatDatabaseTypeDisplay } from "../utils";

const ConnectorConfigSection = styled.div`
    display: flex;
    flex-direction: column;
`;

const ConnectorDetailsCard = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px;
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const ConnectorInfoSection = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
`;

const ConnectorIconWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 6px;
    background-color: ${ThemeColors.SURFACE_CONTAINER};
    flex-shrink: 0;
`;

const ConnectorTextSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const ConnectorTypeName = styled(Typography)`
    font-size: 14px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const ConnectorSubtitle = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

const ConnectorActionsRow = styled.div`
    display: flex;
    gap: 12px;
    flex-shrink: 0;
`;

const ConnectorActionButton = styled(Button)`
    min-width: auto !important;
    white-space: nowrap;
    display: flex !important;
    justify-content: center;
    align-items: center;
`;

export interface ConnectorConfigViewProps {
    connectorLabel: string;
    connectorDescription?: string;
    connectorIcon?: string;
    properties: { [key: string]: PropertyModel };
    onEditConnector: () => void;
    onViewERD: () => void;
}

export function ConnectorConfigView(props: ConnectorConfigViewProps) {
    const {
        connectorLabel,
        connectorIcon,
        properties,
        onEditConnector,
        onViewERD,
    } = props;

    const propertyList: PropertyModel[] = Object.values(properties || {});

    const dbSystemProperty = propertyList.find(isDatabaseSystemProperty);
    const dbSystem = (dbSystemProperty?.value as string) || "";

    const databaseNameProperty = propertyList.find(
        (p) => {
            const label = (p.metadata?.label || "").toLowerCase();
            return (label === "database" || label === "database name") && !label.includes("system");
        }
    );
    const databaseName = (databaseNameProperty?.value as string) || connectorLabel || "";

    const connectorName = dbSystem && databaseName
        ? `Database Connector: ${databaseName}`
        : connectorLabel || (dbSystem ? `${formatDatabaseTypeDisplay(dbSystem, "")} Database Connector` : "Database Connector");

    return (
        <ConnectorConfigSection>
            <ConnectorDetailsCard>
                <ConnectorInfoSection>
                    <ConnectorIconWrapper>
                        {connectorIcon ? (
                            <ConnectorIcon url={connectorIcon} />
                        ) : (
                            <Icon
                                name="bi-db"
                                sx={{
                                    fontSize: "20px",
                                    width: "20px",
                                    height: "20px"
                                }}
                            />
                        )}
                    </ConnectorIconWrapper>
                    <ConnectorTextSection>
                        <ConnectorTypeName>{connectorName}</ConnectorTypeName>
                        <ConnectorSubtitle>
                            Underlying database connector for this connection
                        </ConnectorSubtitle>
                    </ConnectorTextSection>
                </ConnectorInfoSection>
                <ConnectorActionsRow>
                    <ConnectorActionButton
                        appearance="primary"
                        onClick={onEditConnector}
                        buttonSx={{ fontSize: "13px" }}
                        tooltip="Edit connector credentials and selected Tables"
                    >
                        <Icon
                            name="bi-edit"
                            sx={{ fontSize: "14px", width: "14px", height: "14px", marginRight: "6px" }}
                        />
                        Edit Connector
                    </ConnectorActionButton>
                    <ConnectorActionButton
                        appearance="primary"
                        onClick={onViewERD}
                        buttonSx={{ fontSize: "13px" }}
                        tooltip="View Entity Relationship Diagram"
                    >
                        <Icon
                            name="persist-diagram"
                            sx={{ fontSize: "14px", width: "14px", height: "14px", marginRight: "6px" }}
                        />
                        View ER Diagram
                    </ConnectorActionButton>
                </ConnectorActionsRow>
            </ConnectorDetailsCard>
        </ConnectorConfigSection>
    );
}

export default ConnectorConfigView;
