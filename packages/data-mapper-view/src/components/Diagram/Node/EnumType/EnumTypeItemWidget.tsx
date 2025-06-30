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
import { DiagramEngine } from "@projectstorm/react-diagrams";
import classNames from "classnames";

import {
    DataMapperPortWidget,
    PortState,
    RecordFieldPortModel,
} from "../../Port";
import { getTypeName } from "../../utils/dm-utils";
import { InputSearchHighlight } from "../commons/Search";

import { DMEnumTypeDecl, DMEnumTypeMember } from "./EnumTypeNode";
import { useIONodesStyles } from "../../../styles";

export interface EnumTypeItemWidgetProps {
    id: string; // this will be the root ID used to prepend for UUIDs of nested fields
    enumType?: DMEnumTypeDecl;
    enumMember?: DMEnumTypeMember;
    engine: DiagramEngine;
    treeDepth?: number;
    getPort: (portId: string) => RecordFieldPortModel;
    handleCollapse: (portName: string, isExpanded?: boolean) => void;
    valueLabel?: string;
    hasHoveredParent?: boolean;
}

export function EnumTypeItemWidget(props: EnumTypeItemWidgetProps) {
    const {
        engine,
        enumType,
        enumMember,
        id,
        treeDepth = 0,
        getPort,
        handleCollapse,
        valueLabel,
        hasHoveredParent,
    } = props;
    const classes = useIONodesStyles();

    const [portState, setPortState] = useState<PortState>(PortState.Unselected);
    const [isHovered, setIsHovered] = useState(false);

    const enumValue = enumType || enumMember;
    const isType = treeDepth === 0;
    const typeName = getTypeName(enumValue.type);
    const portOut = getPort(`${id}.OUT`);
    const expanded = !(portOut && portOut.collapsed);

    const indentation = isType ? 0 : (treeDepth + 1) * 16 + 8;

    const label = (
        <TruncatedLabel style={{ marginRight: "auto" }}>
            <span style={{ marginRight: "auto" }}>
                <span
                    className={classes.valueLabel}
                    style={{ marginLeft: indentation }}
                >
                    <InputSearchHighlight>{valueLabel}</InputSearchHighlight>
                    {typeName && ":"}
                </span>
                {typeName && <span className={classes.inputTypeLabel}>{typeName}</span>}
            </span>
        </TruncatedLabel>
    );

    const handleExpand = () => {
        handleCollapse(id, !expanded);
    };

    const handlePortState = (state: PortState) => {
        setPortState(state);
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <>
            <div
                id={"recordfield-" + id}
                className={classNames(
                    isType ? classes.enumHeaderTreeLabel : classes.treeLabel,
                    portState !== PortState.Unselected
                        ? classes.treeLabelPortSelected
                        : "",
                    hasHoveredParent ? classes.treeLabelParentHovered : ""
                )}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <span className={classes.label}>
                    {isType && (
                        <Button
                            appearance="icon"
                            sx={{ marginLeft: treeDepth * 16 }}
                            onClick={handleExpand}
                        >
                            {expanded ? <Codicon name="chevron-right" /> : <Codicon name="chevron-down" />}
                        </Button>
                    )}
                    {label}
                </span>
                <span className={classes.outPort}>
                    {portOut && (
                        <DataMapperPortWidget
                            engine={engine}
                            port={portOut}
                            handlePortState={handlePortState}
                        />
                    )}
                </span>
            </div>
            {isType &&
                expanded &&
                enumType.fields.map((subField) => {
                    return (
                        <EnumTypeItemWidget
                            key={`${id}.${subField.varName}`}
                            id={`${id}.${subField.varName}`}
                            engine={engine}
                            enumMember={subField}
                            treeDepth={treeDepth + 1}
                            getPort={getPort}
                            handleCollapse={handleCollapse}
                            valueLabel={subField.varName}
                            hasHoveredParent={isHovered || hasHoveredParent}
                        />
                    );
                })}
        </>
    );
}
