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
import { CheckBox, ThemeColors, Typography } from "@wso2/ui-toolkit";
import { ActionButton, ConnectorContentContainer, ConnectorInfoContainer, FooterContainer } from "../styles";
import { ConnectorDetailCardItem } from "./DevantConnectorMarketplaceInfo";
import { MarketplaceItem, MarketplaceItemSchemaEntry } from "@wso2/wso2-platform-core";
import { DevantTempConfig } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";

const ListContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
`;

const CheckBoxItem = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;

    &:hover {
        background-color: ${ThemeColors.SURFACE_CONTAINER};
    }
`;

const EntryDetailsContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const EntryTopRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const EntryName = styled(Typography)`
    font-size: 14px;
    font-weight: 500;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
    flex: 1;
`;

const EntryDescription = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

const EntryMetadata = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const EntryBadge = styled.span`
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    background-color: ${ThemeColors.SURFACE_CONTAINER};
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const SensitiveBadge = styled(EntryBadge)`
    background-color: rgba(244, 67, 54, 0.1);
    color: ${ThemeColors.ERROR};
    border-color: ${ThemeColors.ERROR};
`;

const SelectAllContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const SelectionInfo = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
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

const InstructionText = styled(Typography)`
    font-size: 13px;
    line-height: 1.5;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 12px 0;
    padding: 12px 16px;
    background-color: ${ThemeColors.SURFACE_CONTAINER};
    border-radius: 8px;
    border-left: 3px solid ${ThemeColors.PRIMARY};
`;

interface DevantConnectorImportConfigsProps {
    marketplaceItem: MarketplaceItem;
    items: DevantTempConfig[];
    onChange: (configs: DevantTempConfig[]) => void;
    initialSelectedConfigs?: string[] | null;
    loading?: boolean;
    onContinue: () => void;
}

export const DevantConnectorImportConfigs: React.FC<DevantConnectorImportConfigsProps> = ({ 
    items,
    marketplaceItem,
    loading = false,
    onContinue ,
    onChange
}) => {
    const selectedItems = items.filter(item=>item.selected);
    const isAllSelected = items.length > 0 && selectedItems.length === items.length;

    const handleToggle = (item: string) => {
        onChange(items.map(entry =>
            entry.name === item ? { ...entry, selected: !entry.selected } : entry
        ));
    };

    const handleSelectAll = () => {
        const newSelectedItems =
            selectedItems.length === items.length
                ? []
                : items.map(item=>({...item, selected: true}));
        onChange(newSelectedItems);
    };

    const handleItemClick = (item: string) => {
        handleToggle(item);
    };

    const handleContinue = () => {
        onContinue();
    };

    return (
        <ConnectorInfoContainer>
            <ConnectorContentContainer hasFooterButton>
                <ConnectorDetailCardItem item={marketplaceItem} />
                <InstructionText>
                    Select the configurations required to initialize and connect to this dependency. In the next step,
                    you'll use these selected configurations to initialize your connector.
                </InstructionText>

                {items.length === 0 ? (
                    <EmptyState>No items available</EmptyState>
                ) : (
                    <>
                        <SelectAllContainer>
                            <CheckBox label="Select All" checked={isAllSelected} onChange={handleSelectAll} />
                            <SelectionInfo>
                                {selectedItems.length} of {items.length} selected
                            </SelectionInfo>
                        </SelectAllContainer>
                        <ListContainer>
                            {items.map((entry) => (
                                <CheckBoxItem key={entry.name} onClick={() => handleItemClick(entry.name)}>
                                    <CheckBox
                                        label=""
                                        checked={entry.selected}
                                        onChange={() => handleToggle(entry.name)}
                                    />
                                    <EntryDetailsContainer>
                                        <EntryTopRow>
                                            <EntryName>{entry.name}</EntryName>
                                            <EntryMetadata>
                                                <EntryBadge>{entry.type}</EntryBadge>
                                                {entry.isSecret && <SensitiveBadge>Sensitive</SensitiveBadge>}
                                            </EntryMetadata>
                                        </EntryTopRow>
                                        {entry.description && (
                                            <EntryDescription>
                                                {entry.description?.replaceAll("Choreo", "Devant")}
                                            </EntryDescription>
                                        )}
                                    </EntryDetailsContainer>
                                </CheckBoxItem>
                            ))}
                        </ListContainer>
                    </>
                )}
            </ConnectorContentContainer>
            <FooterContainer>
                <ActionButton
                    appearance="primary"
                    onClick={handleContinue}
                    disabled={loading}
                    buttonSx={{ width: "100%", height: "35px" }}
                >
                    Continue
                </ActionButton>
            </FooterContainer>
        </ConnectorInfoContainer>
    );
};

export default DevantConnectorImportConfigs;
