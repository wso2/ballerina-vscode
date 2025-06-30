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

import { Button, Codicon, TruncatedLabel } from "@wso2/ui-toolkit";
import { DiagramEngine } from '@projectstorm/react-diagrams';
import { PrimitiveBalType, TypeField } from "@wso2/ballerina-core";
import { LetVarDecl, STKindChecker } from "@wso2/syntax-tree";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { ViewOption } from "../../../DataMapper/DataMapper";
import { isGoToQueryWithinLetExprSupported } from "../../../DataMapper/utils";
import { DataMapperPortWidget, PortState, RecordFieldPortModel } from '../../Port';
import { getTypeName } from "../../utils/dm-utils";
import { RecordFieldTreeItemWidget } from "../commons/RecordTypeTreeWidget/RecordFieldTreeItemWidget";
import { OutputSearchHighlight } from "../commons/Search";
import { TreeBody, TreeHeader } from '../commons/Tree/Tree';
import { useIONodesStyles } from "../../../styles";

export interface LetVarDeclItemProps {
    id: string; // this will be the root ID used to prepend for UUIDs of nested fields
    typeDesc: TypeField;
    engine: DiagramEngine;
    declaration: LetVarDecl;
    context: IDataMapperContext;
    getPort: (portId: string) => RecordFieldPortModel;
    handleCollapse: (portName: string, isExpanded?: boolean) => void;
    valueLabel?: string;
}

export function LetVarDeclItemWidget(props: LetVarDeclItemProps) {
    const { engine, typeDesc, id, declaration, context, getPort, handleCollapse, valueLabel } = props;
    const classes = useIONodesStyles();

    const [ portState, setPortState ] = useState<PortState>(PortState.Unselected);
    const [isHovered, setIsHovered] = useState(false);

    const typeName = getTypeName(typeDesc);
    const portOut = getPort(`${id}.OUT`);
    const expanded = !(portOut && portOut.collapsed);
    const isRecord = typeDesc.typeName === PrimitiveBalType.Record;
    const isQueryExpr = STKindChecker.isQueryExpression(declaration.expression);
    const hasFields = !!typeDesc?.fields?.length;

    const label = (
        <TruncatedLabel style={{ marginRight: "auto" }}>
            <span style={{ marginRight: "auto" }} data-testid={`local-var-widget-label-${id}`}>
                <span className={classes.valueLabel}>
                    <OutputSearchHighlight>{valueLabel ? valueLabel : id}</OutputSearchHighlight>
                    {typeName && ":"}
                </span>
                {typeName && (
                    <span className={classes.inputTypeLabel}>
                        {typeName !== `$CompilationError$` ? typeName : 'var'}
                    </span>
                )}
            </span>
        </TruncatedLabel>
    );

    const handleExpand = () => {
        handleCollapse(id, !expanded);
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    const onClickOnExpand = () => {
        context.changeSelection(ViewOption.EXPAND,
            {
                ...context.selection,
                selectedST: {
                    stNode: declaration,
                    fieldPath: `LetExpr.${valueLabel ? valueLabel : id}`
                }
            });
    };

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    return (
        <>
            <TreeHeader
                id={"recordfield-" + id}
                isSelected={portState !== PortState.Unselected}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <span className={classes.label}>
                    {isRecord && hasFields && (
                        <Button
                            id={"expand-or-collapse-" + id}
                            appearance="icon"
                            tooltip="Expand/Collapse"
                            onClick={handleExpand}
                            data-testid={`${id}-expand-icon-local-var-node`}
                        >
                            {expanded ? <Codicon name="chevron-right" /> : <Codicon name="chevron-down" />}
                        </Button>
                    )}
                    {label}
                    {isQueryExpr && isGoToQueryWithinLetExprSupported(context.ballerinaVersion) && (
                        <Button
                            appearance="icon"
                            tooltip="Map elements within sub-mapping"
                            className={classes.gotoExprIcon}
                            onClick={onClickOnExpand}
                        >
                            <Codicon name="export" />
                        </Button>
                    )}
                </span>
                <span className={classes.outPort}>
                    {portOut && (
                        <DataMapperPortWidget
                            engine={engine}
                            port={portOut}
                            dataTestId={`local-variable-port-${portOut.getName()}`}
                        />
                    )}
                </span>
            </TreeHeader>
            {
                expanded && isRecord && hasFields && (
                    <TreeBody>
                        {typeDesc.fields.map((field, index) => {
                            return (
                                <RecordFieldTreeItemWidget
                                    key={index}
                                    engine={engine}
                                    field={field}
                                    getPort={getPort}
                                    parentId={id}
                                    handleCollapse={handleCollapse}
                                    treeDepth={0}
                                    hasHoveredParent={isHovered}
                                />
                            );
                        })}
                    </TreeBody>
                )
            }
        </>
    );
}
