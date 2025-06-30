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
import { Button, Codicon, Icon, ProgressRing } from "@wso2/ui-toolkit";
import { IOType, TypeKind } from "@wso2/ballerina-core";
import classnames from "classnames";

import { useIONodesStyles } from "../../../styles";
import { useDMCollapsedFieldsStore, useDMExpressionBarStore } from '../../../../store/store';
import { useDMSearchStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperPortWidget, PortState, InputOutputPortModel } from "../../Port";
import { OutputSearchHighlight } from "../commons/Search";
import { ObjectOutputFieldWidget } from "../ObjectOutput/ObjectOutputFieldWidget";
import { ValueConfigMenu, ValueConfigOption } from "../commons/ValueConfigButton";
import { ValueConfigMenuItem } from "../commons/ValueConfigButton/ValueConfigMenuItem";
import { fieldFQNFromPortName, getDefaultValue } from "../../utils/common-utils";
import { DiagnosticTooltip } from "../../Diagnostic/DiagnosticTooltip";
import { TreeBody } from "../commons/Tree/Tree";
import { getTypeName } from "../../utils/type-utils";
import FieldActionWrapper from "../commons/FieldActionWrapper";
import { addValue, removeMapping } from "../../utils/modification-utils";
import { PrimitiveOutputElementWidget } from "../PrimitiveOutput/PrimitiveOutputElementWidget";
import { OutputBeforeInputNotification } from "../commons/OutputBeforeInputNotification";

export interface ArrayOutputFieldWidgetProps {
    parentId: string;
    field: IOType;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    context: IDataMapperContext;
    fieldIndex?: number;
    treeDepth?: number;
    asOutput?: boolean;
    hasHoveredParent?: boolean;
}

export function ArrayOutputFieldWidget(props: ArrayOutputFieldWidgetProps) {
    const {
        parentId,
        field,
        getPort,
        engine,
        context,
        fieldIndex,
        treeDepth = 0,
        asOutput,
        hasHoveredParent
    } = props;
    const classes = useIONodesStyles();

    const [isLoading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [portState, setPortState] = useState<PortState>(PortState.Unselected);
    const [hasOutputBeforeInput, setHasOutputBeforeInput] = useState(false);
    const [isAddingElement, setIsAddingElement] = useState(false);
    const collapsedFieldsStore = useDMCollapsedFieldsStore();
    const setExprBarFocusedPort = useDMExpressionBarStore(state => state.setFocusedPort);

    const arrayField = field.member;
    const typeName = getTypeName(field);

    let portName = parentId;
    if (fieldIndex !== undefined) {
        portName = `${parentId}.${fieldIndex}`
    }
    const fieldName = field?.variableName || '';

    const portIn = getPort(`${portName}.IN`);
    const mapping = portIn && portIn.value;
    const { inputs, expression, elements, diagnostics } = mapping || {};
    const searchValue = useDMSearchStore.getState().outputSearch;
    const hasElements = elements?.length > 0 && elements.some((element) => element.mappings.length > 0);
    const connectedViaLink = inputs?.length > 0;

    let expanded = true;
    if (portIn && portIn.collapsed) {
        expanded = false;
    }

    let indentation = treeDepth * 16;
    if (!portIn) {
        indentation += 24;
    }

    const hasDefaultValue = expression && getDefaultValue(field.kind) === expression.trim();
    let isDisabled = portIn.descendantHasValue;

    if (!isDisabled && !hasDefaultValue) {
        if (hasElements && expanded && portIn.parentModel) {
            portIn.setDescendantHasValue();
            isDisabled = true;
        }
        if (portIn.parentModel
            && (Object.entries(portIn.parentModel.links).length > 0 || portIn.parentModel.ancestorHasValue)
        ) {
            portIn.ancestorHasValue = true;
            isDisabled = true;
        }
    }

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

	const handlePortSelection = (outputBeforeInput: boolean) => {
		setHasOutputBeforeInput(outputBeforeInput);
	};

    const handleEditValue = () => {
        if (portIn)
            setExprBarFocusedPort(portIn);
    };

    const onAddElementClick = async () => {
        await handleAddArrayElement();
    };

    const label = (
        <span style={{ marginRight: "auto" }} data-testid={`record-widget-field-label-${portIn?.getName()}`}>
            <span
                className={classnames(classes.valueLabel,
                    isDisabled ? classes.labelDisabled : "")}
                style={{ marginLeft: expression && !connectedViaLink ? 0 : indentation + 24 }}
            >
                <OutputSearchHighlight>{fieldName}</OutputSearchHighlight>
                {!field?.optional && <span className={classes.requiredMark}>*</span>}
                {fieldName && typeName && ":"}
            </span>
            {typeName && (
                <span className={classnames(classes.outputTypeLabel, isDisabled ? classes.labelDisabled : "")}>
                    {typeName}
                </span>
            )}
            {!hasElements && !connectedViaLink && (expression || hasDefaultValue) && (
                <span className={classes.outputNodeValueBase}>
                    {diagnostics?.length > 0 ? (
                        <DiagnosticTooltip
                            placement="right"
                            diagnostic={diagnostics[0].message}
                            value={expression}
                            onClick={handleEditValue}
                        >
                            <Button
                                appearance="icon"
                                data-testid={`array-widget-field-${portIn?.getName()}`}
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
                            data-testid={`array-widget-field-${portIn?.getName()}`}
                        >
                            {expression}
                        </span>
                    )}
                </span>
            )}
        </span>
    );

    const arrayElements = useMemo(() => {
        return elements && (
            elements.map((element, index) => {
                if (arrayField?.kind === TypeKind.Record) {
                    return (
                        <>
                            <TreeBody>
                                <ObjectOutputFieldWidget
                                    key={`arr-output-field-${portName}-${index}`}
                                    engine={engine}
                                    field={arrayField}
                                    getPort={getPort}
                                    parentId={portName}
                                    context={context}
                                    fieldIndex={index}
                                    treeDepth={treeDepth + 1}
                                    hasHoveredParent={isHovered || hasHoveredParent}
                                />
                            </TreeBody>
                            <br />
                        </>
                    );
                } else if (arrayField?.kind === TypeKind.Array) {
                    return (
                        <ArrayOutputFieldWidget
                            key={`arr-output-field-${portName}-${index}`}
                            engine={engine}
                            field={arrayField}
                            getPort={getPort}
                            parentId={portName}
                            context={context}
                            fieldIndex={index}
                            treeDepth={treeDepth + 1}
                            hasHoveredParent={isHovered || hasHoveredParent}
                        />
                    )
                } else {
                    if (searchValue && !expression.toLowerCase().includes(searchValue.toLowerCase())) {
                        return null;
                    }
                }
                return (
                    <PrimitiveOutputElementWidget
                        key={`arr-output-field-${portName}-${index}`}
                        parentId={portName}
                        field={arrayField}
                        engine={engine}
                        getPort={getPort}
                        context={context}
                        fieldIndex={index}
                        isArrayElement={true}
                        hasHoveredParent={isHovered || hasHoveredParent}
                    />
                );
            })
        );
    }, [elements]);

    const addElementButton = useMemo(() => {
        return (
            <Button
                id={`add-array-element-${portName}`}
                key={`array-widget-${portIn?.getName()}-add-element`}
                className={classes.addArrayElementButton}
                appearance="icon"
                aria-label="add"
                onClick={onAddElementClick}
                disabled={isAddingElement}
                data-testid={`array-widget-${portIn?.getName()}-add-element`}
            >
                {isAddingElement
                    ? <ProgressRing sx={{ height: '16px', width: '16px' }} />
                    : <Codicon name="add" iconSx={{ color: "var(--vscode-inputOption-activeForeground)" }} />
                }
                Add Element
            </Button>
        );
    }, [isAddingElement]);

    const handleExpand = () => {
        const collapsedFields = collapsedFieldsStore.fields;
        if (!expanded) {
            collapsedFieldsStore.setFields(collapsedFields.filter((element) => element !== portName));
        } else {
            collapsedFieldsStore.setFields([...collapsedFields, portName]);
        }
    };

    const handleArrayInitialization = async () => {
        setLoading(true);
        try {
            await addValue(fieldFQNFromPortName(portName), '[]', context);
        } finally {
            setLoading(false);
        }
    };

    const handleArrayDeletion = async () => {
        setLoading(true);
        try {
            await removeMapping(fieldFQNFromPortName(portName), context);
        } finally {
            setLoading(false);
        }
    };

    const handleAddArrayElement = async () => {
        setIsAddingElement(true)
        try {
            return await context.addArrayElement(`${mapping.output}`);
        } finally {
            setIsAddingElement(false);
        }
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    const valConfigMenuItems: ValueConfigMenuItem[] = hasElements || hasDefaultValue
        ? [
            // { title: ValueConfigOption.EditValue, onClick: handleEditValue }, // TODO: Enable this after adding support for editing array values
            { title: ValueConfigOption.DeleteArray, onClick: handleArrayDeletion },
        ]
        : [
            { title: ValueConfigOption.InitializeArray, onClick: handleArrayInitialization }
        ];

    return (
        <div
            className={classnames(classes.treeLabelArray, hasHoveredParent ? classes.treeLabelParentHovered : "")}
        >
            {!asOutput && (
                <div
                    id={"recordfield-" + portName}
                    className={classnames(classes.ArrayFieldRow,
                        isDisabled ? classes.ArrayFieldRowDisabled : "",
                        (portState !== PortState.Unselected) ? classes.treeLabelPortSelected : "",
                        hasHoveredParent ? classes.treeLabelParentHovered : ""
                    )}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                >
                    <span className={classes.inPort}>
                        {portIn && (
                            <DataMapperPortWidget
                                engine={engine}
                                port={portIn}
                                disable={isDisabled && expanded}
                                handlePortState={handlePortState}
                                hasFirstSelectOutput={handlePortSelection}
                                dataTestId={`array-type-editable-record-field-${portIn.getName()}`}
                            />
                        )}
                    </span>
                    <span className={classes.label}>
                        {(expression && !connectedViaLink) && (
                            <FieldActionWrapper>
                                <Button
                                    id={`expand-or-collapse-${portName}`}
                                    appearance="icon"
                                    sx={{ marginLeft: indentation }}
                                    onClick={handleExpand}
                                    data-testid={`${portIn?.getName()}-expand-icon-array-field`}
                                >
                                    {expanded ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
                                </Button>
                            </FieldActionWrapper>
                        )}
                        {label}
                    </span>
                    {(isLoading) ? (
                        <ProgressRing />
                    ) : (((expression && !connectedViaLink) || !isDisabled) && (
                        <FieldActionWrapper>
                            <ValueConfigMenu
                                menuItems={valConfigMenuItems}
                                portName={portIn?.getName()}
                            />
                        </FieldActionWrapper>
                    ))}
                    {hasOutputBeforeInput && <OutputBeforeInputNotification />}
                </div>
            )}
            {(expanded && expression && !connectedViaLink) && (
                <div data-testid={`array-widget-${portIn?.getName()}-values`}>
                    <div className={classes.innerTreeLabel}>
                        <span>[</span>
                        {arrayElements}
                        {addElementButton}
                        <span>]</span>
                    </div>
                </div>
            )}
        </div>
    );
}
