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
import { Button, Icon, ProgressRing } from "@wso2/ui-toolkit";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperPortWidget, PortState, InputOutputPortModel } from "../../Port";
import { fieldFQNFromPortName, findMappingByOutput, getDefaultValue } from "../../utils/common-utils";
import { OutputSearchHighlight } from "../commons/Search";
import { ValueConfigMenu, ValueConfigOption } from "../commons/ValueConfigButton";
import { useIONodesStyles } from "../../../styles";
import { useDMExpressionBarStore } from "../../../../store/store";
import { DiagnosticTooltip } from "../../Diagnostic/DiagnosticTooltip";
import FieldActionWrapper from "../commons/FieldActionWrapper";
import { IOType } from "@wso2/ballerina-core";
import { removeMapping } from "../../utils/modification-utils";
import { OutputBeforeInputNotification } from "../commons/OutputBeforeInputNotification";
import { useShallow } from "zustand/react/shallow";

export interface PrimitiveOutputElementWidgetWidgetProps {
    parentId: string;
    field: IOType;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    context: IDataMapperContext;
    fieldIndex?: number;
    isArrayElement?: boolean;
    hasHoveredParent?: boolean;
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
        hasHoveredParent
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
    const [hasOutputBeforeInput, setHasOutputBeforeInput] = useState(false);

    const typeName = field.kind;
    const fieldName = field?.variableName || '';

    let portName = parentId;

    if (fieldIndex !== undefined) {
        portName = `${parentId}.${fieldIndex}${fieldName !== '' ? `.${fieldName}` : ''}`;
    } else if (fieldName) {
        portName = `${parentId}.${typeName}.${fieldName}`;
    } else {
        portName = `${parentId}.${typeName}`;
    }

    const portIn = getPort(`${portName}.IN`);
    const isExprBarFocused = exprBarFocusedPort?.getName() === portIn?.getName();
    const mapping = portIn && portIn.value;
    const { expression, diagnostics } = mapping || {};

    const handleEditValue = () => {
        if (portIn)
            setExprBarFocusedPort(portIn);
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await removeMapping(fieldFQNFromPortName(portName), context);
        } finally {
            setLoading(false);
        }
    };

    const valueConfigMenuItems = useMemo(() => {
        const items = [
            // {
            //     title: ValueConfigOption.EditValue,
            //     onClick: handleEditValue
            // }
            // TODO: Enable this after adding support for editing value
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

    const handlePortSelection = (outputBeforeInput: boolean) => {
		setHasOutputBeforeInput(outputBeforeInput);
	};

    const label = (
        <span style={{ marginRight: "auto" }} data-testid={`primitive-array-element-${portIn?.getName()}`}>
            <span className={classes.valueLabel} style={{ marginLeft: "24px" }}>
                {diagnostics?.length > 0 ? (
                    <DiagnosticTooltip
                        diagnostic={diagnostics[0].message}
                        value={expression}
                        onClick={handleEditValue}
                    >
                        <Button
                            appearance="icon"
                            data-testid={`object-output-field-${portIn?.getName()}`}
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
                        data-testid={`object-output-field-${portIn?.getName()}`}
                    >
                        <OutputSearchHighlight>{expression}</OutputSearchHighlight>
                    </span>
                )
                }
            </span>
        </span>
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
                                hasFirstSelectOutput={handlePortSelection}
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
                    {hasOutputBeforeInput && <OutputBeforeInputNotification />}
                </div>
            )}
        </>
    );
}
