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
import React, { useMemo, useState } from "react";

import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import classnames from "classnames";
import { Button, Icon, ProgressRing, TruncatedLabel, TruncatedLabelGroup } from "@wso2/ui-toolkit";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperPortWidget, PortState, InputOutputPortModel } from "../../Port";
import { getDefaultValue } from "../../utils/common-utils";
import { OutputSearchHighlight } from "../commons/Search";
import { ValueConfigMenu, ValueConfigOption } from "../commons/ValueConfigButton";
import { useIONodesStyles } from "../../../styles";
import { useDMExpressionBarStore } from "../../../../store/store";
import { DiagnosticTooltip } from "../../Diagnostic/DiagnosticTooltip";
import FieldActionWrapper from "../commons/FieldActionWrapper";
import { IOType, TypeKind } from "@wso2/ballerina-core";
import { removeMapping } from "../../utils/modification-utils";
import { useShallow } from "zustand/react/shallow";
import { PrimitiveOutputNode } from ".";
import { getTypeName } from "../../utils/type-utils";

export interface PrimitiveOutputElementWidgetWidgetProps {
    parentId: string;
    field: IOType;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    context: IDataMapperContext;
    fieldIndex?: number;
    isArrayElement?: boolean;
    hasHoveredParent?: boolean;
    isPortParent?: boolean;
}

export function PrimitiveOutputElementWidget(props: PrimitiveOutputElementWidgetWidgetProps) {
    const {
        parentId,
        field,
        getPort,
        engine,
        context,
        fieldIndex,
        isArrayElement,
        hasHoveredParent,
        isPortParent
    } = props;
    const classes = useIONodesStyles();
    
    const { exprBarFocusedPort, setExprBarFocusedPort } = useDMExpressionBarStore(
        useShallow(state => ({
            exprBarFocusedPort: state.focusedPort,
            setExprBarFocusedPort: state.setFocusedPort
        }))
    );

    const [isLoading, setLoading] = useState(false);
    const [portState, setPortState] = useState<PortState>(PortState.Unselected);

    const typeName = getTypeName(field);
    
    const fieldName = field?.name || '';

    let portName = parentId;
    if (!isPortParent) {
        if (fieldIndex !== undefined) {
            portName = `${portName}.${fieldIndex}`;
        } else if (fieldName) {
            portName = `${portName}.${fieldName}`;
        }
    }
  
    const portIn = getPort(`${portName}.IN`);
    const isExprBarFocused = exprBarFocusedPort?.getName() === portIn?.getName();
    const isUnknownType = field.kind === TypeKind.Unknown;
    const mapping = portIn && portIn.attributes.value;
    let { expression, diagnostics } = mapping || {};
    const connectedViaLink = Object.values(portIn?.getLinks() || {}).length > 0;


    const handleEditValue = () => {
        if (portIn)
            setExprBarFocusedPort(portIn);
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await removeMapping(mapping || {output: portIn?.attributes.fieldFQN, expression: undefined}, context);
        } finally {
            setLoading(false);
        }
    };

    const valueConfigMenuItems = useMemo(() => {
        const items = [
            {
                title: ValueConfigOption.EditValue,
                onClick: handleEditValue
            }
        ];
        if (isArrayElement) {
            items.push({
                title: ValueConfigOption.DeleteElement,
                onClick: handleDelete
            });
        } else if (expression !== getDefaultValue(field?.kind)) {
            items.push({
                title: ValueConfigOption.DeleteValue,
                onClick: handleDelete
        });
        }
        return items;
    }, [expression]);

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const label = (
        <TruncatedLabelGroup style={{ marginRight: "auto", alignItems: "baseline" }}>
            <TruncatedLabel className={isUnknownType ? classes.unknownTypeLabel : classes.typeLabel}>
                {typeName || ''}
            </TruncatedLabel>
            {!connectedViaLink && expression && (
                <TruncatedLabel className={classes.outputNodeValueBase}>
                    {diagnostics?.length > 0 ? (
                        <DiagnosticTooltip
                            placement="right"
                            diagnostic={diagnostics[0].message}
                            value={expression}
                            onClick={handleEditValue}
                        >
                            <Button
                                appearance="icon"
                                data-testid={`primitive-widget-field-${portIn?.getName()}`}
                            >
                                {expression}
                                <Icon
                                    name="error-icon"
                                    sx={{ height: "14px", width: "14px", marginLeft: "4px" }}
                                    iconSx={{ fontSize: "14px", color: "var(--vscode-errorForeground)" }}
                                />
                            </Button>
                        </DiagnosticTooltip>
                    ) : (
                        <span
                            className={classes.outputNodeValue}
                            onClick={handleEditValue}
                            data-testid={`primitive-widget-field-${portIn?.getName()}`}
                        >
                            {expression}
                        </span>
                    )}
                </TruncatedLabel>
            )}
        </TruncatedLabelGroup>
    );

    return (
        <>
            {expression && (
                <div
                    id={"recordfield-" + portName}
                    className={classnames(classes.treeLabel,
                        (portState !== PortState.Unselected) ? classes.treeLabelPortSelected : "",
                        hasHoveredParent ? classes.treeLabelParentHovered : "",
                        isExprBarFocused ? classes.treeLabelPortExprFocused : ""
                    )}
                >
                    <span className={classes.inPort}>
                        {portIn &&
                            <DataMapperPortWidget
                                engine={engine}
                                port={portIn}
                                handlePortState={handlePortState}
                            />
                        }
                    </span>
                    <span className={classes.label}>{label}</span>
                    {(isLoading) ? (
                        <ProgressRing />
                    ) : (
                        <FieldActionWrapper>
                            <ValueConfigMenu
                                menuItems={valueConfigMenuItems}
                                portName={portIn?.getName()}
                            />
                        </FieldActionWrapper>
                    )}
                </div>
            )}
        </>
    );
}
