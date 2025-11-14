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

import styled from '@emotion/styled';
import React from 'react';
import { Codicon, Typography } from '@wso2/ui-toolkit';
import { EVENT_TYPE, MACHINE_VIEW, ProjectStructureResponse } from '@wso2/ballerina-core';
import { useRpcContext } from '@wso2/ballerina-rpc-client';

export const CardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    width: 100%;
`;

export const Container = styled.div`
    padding: 0 20px 20px 20px;
`;

const PackageCard = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 20px;
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    &:hover .delete-button {
        opacity: 1;
    }

    &:active {
        transform: translateY(0);
    }
`;

const PackageHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

const PackageTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
    line-height: 1;
`;

const PackageIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const PackageName = styled(Typography)`
    font-weight: 500;
    font-size: 15px;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    display: flex;
    align-items: center;
`;

const PackageActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const DeleteButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s ease;
    color: var(--vscode-foreground);

    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-errorForeground);
    }

    &:active {
        background: var(--vscode-toolbar-activeBackground);
    }
`;

const ChipContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
`;

const Chip = styled.div<{ color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    background: color-mix(in srgb, ${(props: { color: string }) => props.color} 12%, transparent);
    color: ${(props: { color: string }) => props.color};
    border: 1px solid color-mix(in srgb, ${(props: { color: string }) => props.color} 25%, transparent);
    text-transform: capitalize;
    white-space: nowrap;
`;

export type PackageType = 'automation' | 'integration-as-api' | 'event-integration' | 'file-integration' | 'ai-agent';

export interface PackageListViewProps {
    workspaceStructure: ProjectStructureResponse;
}

interface Package {
    id: string;
    name: string;
    types?: PackageType[];
}

const getTypeColor = (type: PackageType): string => {
    const colors: Record<PackageType, string> = {
        'automation': 'var(--vscode-charts-blue)',
        'integration-as-api': 'var(--vscode-charts-green)',
        'event-integration': 'var(--vscode-charts-orange)',
        'file-integration': 'var(--vscode-charts-purple)',
        'ai-agent': 'var(--vscode-charts-red)'
    };
    return colors[type];
};

const getTypeIcon = (type: PackageType): string => {
    const icons: Record<PackageType, string> = {
        'automation': 'robot',
        'integration-as-api': 'cloud',
        'event-integration': 'pulse',
        'file-integration': 'file',
        'ai-agent': 'sparkle'
    };
    return icons[type];
};

const getTypeLabel = (type: PackageType): string => {
    const labels: Record<PackageType, string> = {
        'automation': 'Automation',
        'integration-as-api': 'API Integration',
        'event-integration': 'Event Integration',
        'file-integration': 'File Integration',
        'ai-agent': 'AI Agent'
    };
    return labels[type];
};

export function PackageListView(props: PackageListViewProps) {
    const { rpcClient } = useRpcContext();
    // TODO: Replace with actual data from props or context
    // const packages: Package[] = [
    //     { id: 'ads_service', name: 'Ads Service', types: ['automation', 'event-integration'] },
    //     { id: 'payment-service', name: 'Payment Service', types: ['integration-as-api'] },
    //     { id: 'checkout-service', name: 'Checkout Service', types: ['event-integration', 'integration-as-api'] },
    //     { id: 'document-processor', name: 'Document Processor', types: ['file-integration', 'automation'] },
    //     { id: 'customer-support-bot', name: 'Customer Support Bot', types: ['ai-agent'] }
    // ];
    const workspaceStructure = props.workspaceStructure;
    const packages = workspaceStructure.projects.map((project) => {
        return {
            id: project.projectName,
            name: project.projectTitle,
            projectPath: project.projectPath,
            types: [] as PackageType[]
        }
    });

    const handlePackageClick = async (packageId: string, event: React.MouseEvent) => {
        // Don't trigger if clicking on delete button
        if ((event.target as HTMLElement).closest('.delete-button')) {
            return;
        }
        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                projectPath: packages.find((pkg) => pkg.id === packageId)?.projectPath,
                view: MACHINE_VIEW.PackageOverview,
                package: packageId
            },
        });
    };

    const handleDeleteClick = (packageId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        // TODO: Implement delete confirmation and logic
        console.log('Deleting package:', packageId);
    };

    return (
        <Container>
            <CardGrid>
                {packages.map((pkg) => (
                    <PackageCard key={pkg.id} onClick={(e) => handlePackageClick(pkg.id, e)}>
                        <PackageHeader>
                            <PackageTitleRow title={pkg.name}>
                                <PackageIcon>
                                    <Codicon 
                                        name={pkg.types.length > 0 ? getTypeIcon(pkg.types[0]) : 'package'} 
                                        iconSx={{ fontSize: 28, opacity: 0.85 }}
                                        sx={{ height: 28, width: 28 }}
                                    />
                                </PackageIcon>
                                <PackageName>{pkg.name}</PackageName>
                            </PackageTitleRow>
                            <PackageActions>
                                <DeleteButton 
                                    className="delete-button"
                                    onClick={(e) => handleDeleteClick(pkg.id, e)}
                                    title="Delete package"
                                >
                                    <Codicon name="trash" iconSx={{ fontSize: 18 }} />
                                </DeleteButton>
                                <Codicon name="chevron-right" iconSx={{ fontSize: 18, opacity: 0.5 }} />
                            </PackageActions>
                        </PackageHeader>
                        {pkg.types.length > 0 && (
                            <ChipContainer>
                                {pkg.types.map((type) => (
                                    <Chip key={type} color={getTypeColor(type)}>
                                        {getTypeLabel(type)}
                                    </Chip>
                                ))}
                            </ChipContainer>
                        )}
                    </PackageCard>
                ))}
            </CardGrid>
        </Container>
    );
}
