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

// tslint:disable: jsx-no-multiline-js
import React, { useState } from "react";

import { Button, Codicon, ProgressRing, TruncatedLabel, TruncatedLabelGroup } from "@wso2/ui-toolkit";
import { DiagramEngine } from '@projectstorm/react-diagrams';
import classnames from "classnames";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperPortWidget, PortState, InputOutputPortModel } from '../../Port';
import { OutputSearchHighlight } from "../commons/Search";
import { TreeBody } from '../commons/Tree/Tree';
import { useIONodesStyles } from "../../../styles";
import { InputNodeTreeItemWidget } from "../Input/InputNodeTreeItemWidget";
import { useDMExpandedFieldsStore, useDMSubMappingConfigPanelStore } from "../../../../store/store";
import { DMSubMapping } from "./SubMappingNode";
import { SubMappingSeparator } from "./SubMappingSeparator";
import { IOType, TypeKind } from "@wso2/ballerina-core";
import { getTypeName } from "../../utils/type-utils";
import { genVariableName, getSubMappingViewLabel } from "../../utils/common-utils";

export interface SubMappingItemProps {
    index: number;
    id: string; // this will be the root ID used to prepend for UUIDs of nested fields
    name: string;
    type: IOType;
    engine: DiagramEngine;
    context: IDataMapperContext;
    subMappings: DMSubMapping[];
    getPort: (portId: string) => InputOutputPortModel;
};

export function SubMappingItemWidget(props: SubMappingItemProps) {
    const { index, id, name, type, engine, context, subMappings, getPort } = props;
    const { views, addView } = context;
    const isOnRootView = views.length === 1;

    const classes = useIONodesStyles();
    const expandedFieldsStore = useDMExpandedFieldsStore();
    const setSubMappingConfig = useDMSubMappingConfigPanelStore(state => state.setSubMappingConfig);

    const [ portState, setPortState ] = useState<PortState>(PortState.Unselected);
    const [isHovered, setIsHovered] = useState(false);
    const [deleteInProgress, setDeleteInProgress] = useState(false);

    const typeName = getTypeName(type);
    const portOut = getPort(`${id}.OUT`);
    const isUnknownType = type.kind === TypeKind.Unknown;
    const isRecord = type.kind === TypeKind.Record;
    const hasFields = !!type?.fields?.length;
    const isFirstItem = index === 0;
    const isLastItem = index === subMappings.length - 1;
    const expanded = !(portOut && portOut.attributes.collapsed);

    const label = (
        <TruncatedLabelGroup style={{ marginRight: "auto", alignItems: "baseline" }} data-testid={`sub-mapping-item-widget-label-${id}`}>
            <TruncatedLabel className={classes.valueLabelHeader}>
                <OutputSearchHighlight>{name}</OutputSearchHighlight>
            </TruncatedLabel>
            {typeName && (
                <TruncatedLabel className={isUnknownType ? classes.unknownTypeLabel : classes.typeLabel}>
                    {typeName}
                </TruncatedLabel>
            )}
        </TruncatedLabelGroup>
    );

    const onClickAddSubMappingAtTop = () => {
        addSubMapping(0);
    };

    const onClickAddSubMapping = () => {
        addSubMapping(index + 1);
    };

    const addSubMapping = (targetIndex: number) => {
        const varName = genVariableName("subMapping", subMappings.map(mapping => mapping.name));
        setSubMappingConfig({
            isSMConfigPanelOpen: true,
            nextSubMappingIndex: targetIndex,
            suggestedNextSubMappingName: varName
        });
    };

    const handleExpand = () => {
        const expandedFields = expandedFieldsStore.fields;
        if (expanded) {
            expandedFieldsStore.setFields(expandedFields.filter((element) => element !== id));
        } else {
            expandedFieldsStore.setFields([...expandedFields, id]);
        }
    }

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const onClickOnExpand = () => {
        const subMapping = subMappings[index];
        const label = subMapping.name;

        addView(
            {
                targetField: subMapping.name,
                label: label,
                subMappingInfo: {
                    index,
                    mappingName: subMapping.name,
                    mappingType: typeName,
                    focusedOnSubMappingRoot: true
                }
            }
        );
    };

    const onClickOnDelete = async () => {
        setDeleteInProgress(true);
        try {
            await context.deleteSubMapping(index, views[views.length - 1].targetField);
        } finally {
            setDeleteInProgress(false);
        }
    };

    return (
        <>
            {isFirstItem && (
                <SubMappingSeparator
                    isOnRootView={isOnRootView}
                    onClickAddSubMapping={onClickAddSubMappingAtTop}
                />
            )}
            <div
                id={"recordfield-" + id}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className={classnames(
                    classes.subMappingItemLabel, portState !== PortState.Unselected ? classes.treeLabelPortSelected : ""
                )}
            >
                <span className={classes.label}>
                    {isRecord && hasFields && (
                        <Button
                            id={"expand-or-collapse-" + id} 
                            appearance="icon"
                            tooltip="Expand/Collapse"
                            onClick={handleExpand}
                            data-testid={`${id}-expand-icon-sub-mapping-node`}
                        >
                            {expanded ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
                        </Button>
                    )}
                    {label}
                    <Button
                        id={`go-to-sub-mapping-btn-${index}`}
                        appearance="icon"
                        data-testid={`go-to-sub-mapping-btn-${index}`}
                        tooltip="Go to sub mapping"
                        onClick={onClickOnExpand}
                        sx={{ marginRight: "5px" }}
                        data-field-action
                    >
                        <Codicon
                            name="export"
                            iconSx={{ color: "var(--vscode-input-placeholderForeground)" }}
                        />
                    </Button>
                    {deleteInProgress
                        ? (<ProgressRing sx={{ height: '16px', width: '16px' }} />)
                        : (
                            <Button
                                id={`delete-sub-mapping-btn-${index}`}
                                appearance="icon"
                                tooltip="Delete sub mapping"
                                onClick={onClickOnDelete}
                            >
                                <Codicon
                                    name="trash"
                                    iconSx={{ color: "var(--vscode-errorForeground)" }}
                                />
                            </Button>
                        )
                    }
                </span>
                <span className={classes.outPort}>
                    {portOut && (
                        <DataMapperPortWidget
                            engine={engine}
                            port={portOut}
                            dataTestId={`sub-mapping-port-${portOut.getName()}`}
                            handlePortState={handlePortState}
                        />
                    )}
                </span>
            </div>
            {
                expanded && isRecord && hasFields && (
                    <TreeBody>
                        {type
                            ?.fields
                            ?.filter(f => !!f)
                            .map((field, index) => {
                            return (
                                <InputNodeTreeItemWidget
                                    key={index}
                                    engine={engine}
                                    dmType={field}
                                    getPort={getPort}
                                    parentId={id}
                                    treeDepth={0}
                                    hasHoveredParent={isHovered}
                                />
                            );
                        })}
                    </TreeBody>
                )
            }
            <SubMappingSeparator
                isOnRootView={isOnRootView}
                isLastItem={isLastItem}
                onClickAddSubMapping={onClickAddSubMapping}
            />
            {isLastItem && isOnRootView && (
                <Button
                    className={classes.addMoreSubMappingsButton}
                    appearance='icon'
                    aria-label="add"
                    onClick={onClickAddSubMapping}
                    data-testid={"add-another-sub-mapping-btn"}
                >
                    <Codicon name="add" sx={{ color: "var(--vscode-textLink-foreground)"}} />
                    <div style={{ color: "var(--vscode-textLink-foreground)", marginLeft: "8px" }}>
                        Add Another Sub Mapping
                    </div>
                </Button>
            )}
        </>
    );
}
