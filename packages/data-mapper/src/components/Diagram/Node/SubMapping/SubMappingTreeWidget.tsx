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
import React, { ReactNode } from 'react';

import styled from "@emotion/styled";
import { Button, Codicon } from '@wso2/ui-toolkit';
import { DiagramEngine } from '@projectstorm/react-diagrams';

import { useDMSearchStore, useDMSubMappingConfigPanelStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { InputOutputPortModel } from '../../Port';
import { SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX } from "../../utils/constants";
import { SharedContainer } from '../commons/Tree/Tree';
import { DMSubMapping } from "./index";
import { useIONodesStyles } from '../../../styles';
import { SubMappingItemWidget } from './SubMappingItemWidget';

const SubMappingsHeader = styled.div`
    background: var(--vscode-sideBarSectionHeader-background);
    height: 40px;
    width: 100%;
    line-height: 35px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: default;
`;

const HeaderText = styled.span`
    margin-left: 10px;
    min-width: 280px;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-inputOption-activeForeground);
    opacity: 0.7;
`;

export interface SubMappingTreeWidgetProps {
    subMappings: DMSubMapping[];
    engine: DiagramEngine;
    context: IDataMapperContext;
    getPort: (portId: string) => InputOutputPortModel;
}

export function SubMappingTreeWidget(props: SubMappingTreeWidgetProps) {
    const { engine, subMappings, context, getPort } = props;
    const searchValue = useDMSearchStore.getState().inputSearch;
    const isFocusedView = context.views.length > 1;

    const classes = useIONodesStyles();
    const setSubMappingConfig = useDMSubMappingConfigPanelStore(state => state.setSubMappingConfig);

    const subMappingItems: ReactNode[] = subMappings.map((mapping, index) => {
        return (
            <SubMappingItemWidget
                index={index}
                key={`${SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX}.${mapping.name}`}
                id={`${SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX}.${mapping.name}`}
                name={mapping.name}
                engine={engine}
                context={context}
                type={mapping.type}
                subMappings={subMappings}
                getPort={(portId: string) => getPort(portId) as InputOutputPortModel}
            />
        );
    }).filter(mapping => !!mapping);

    const onClickAddSubMapping = () => {
        setSubMappingConfig({
            isSMConfigPanelOpen: true,
            nextSubMappingIndex: 0,
            suggestedNextSubMappingName: "subMapping"
        });
    };

    return (
        <>
            {subMappingItems.length > 0 ? (
                <SharedContainer data-testid={"sub-mapping-node"}>
                    <SubMappingsHeader>
                        <HeaderText>Sub Mappings</HeaderText>
                    </SubMappingsHeader>
                    {subMappingItems}
                </SharedContainer>
            ) : !isFocusedView && !searchValue && (
                <Button
                    className={classes.addSubMappingButton}
                    onClick={onClickAddSubMapping}
                    appearance="secondary"
                >
                    <Codicon name="add" />
                    Add Sub Mapping
                </Button>
            )}
        </>
    );
}
