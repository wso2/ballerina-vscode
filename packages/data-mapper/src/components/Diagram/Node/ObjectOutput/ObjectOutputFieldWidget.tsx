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

import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { Button, Codicon, Icon, ProgressRing, TruncatedLabel, TruncatedLabelGroup } from "@wso2/ui-toolkit";
import { IOType, TypeKind } from "@wso2/ballerina-core";
import classnames from "classnames";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperPortWidget, PortState, InputOutputPortModel } from "../../Port";
import { OutputSearchHighlight } from "../commons/Search";
import { useIONodesStyles } from "../../../styles";
import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore, useDMExpressionBarStore } from '../../../../store/store';
import { getTypeName } from "../../utils/type-utils";
import { ArrayOutputFieldWidget } from "../ArrayOutput/ArrayOuptutFieldWidget";
import { fieldFQNFromPortName, getDefaultValue } from "../../utils/common-utils";
import { addValue, removeMapping } from "../../utils/modification-utils";
import FieldActionWrapper from "../commons/FieldActionWrapper";
import { ValueConfigMenu, ValueConfigMenuItem, ValueConfigOption } from "../commons/ValueConfigButton";
import { DiagnosticTooltip } from "../../Diagnostic/DiagnosticTooltip";
import { DataMapperLinkModel } from "../../Link";

export interface ObjectOutputFieldWidgetProps {
    parentId: string;
    field: IOType;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    context: IDataMapperContext;
    fieldIndex?: number;
    treeDepth?: number;
    hasHoveredParent?: boolean;
    isPortParent?: boolean;
}

export function ObjectOutputFieldWidget(props: ObjectOutputFieldWidgetProps) {
    const {
        parentId,
        field,
        getPort,
        engine,
        context,
        fieldIndex,
        treeDepth = 0,
        hasHoveredParent,
        isPortParent
    } = props;
    const classes = useIONodesStyles();
    const [isLoading, setLoading] = useState(false);

    const [isHovered, setIsHovered] = useState(false);
    const [portState, setPortState] = useState<PortState>(PortState.Unselected);

    const collapsedFieldsStore = useDMCollapsedFieldsStore();
    const expandedFieldsStore = useDMExpandedFieldsStore();

    const setExprBarFocusedPort = useDMExpressionBarStore(state => state.setFocusedPort);

    let indentation = treeDepth * 16;
    let expanded = true;

    const typeName = getTypeName(field);
    const typeKind = field?.kind;

    const isArray = typeKind === TypeKind.Array;
    const isRecord = typeKind === TypeKind.Record;
    const isEnum = typeKind === TypeKind.Enum;

    let updatedParentId = parentId;
    
    if (fieldIndex !== undefined) {
        updatedParentId = `${updatedParentId}.${fieldIndex}`
    }

    let fieldName = field?.name || '';
    let displayName = field?.displayName || fieldName;

    let portName = isPortParent
        ? parentId
        : updatedParentId !== ''
            ? fieldName !== '' && fieldIndex === undefined
                ? `${updatedParentId}.${fieldName}`
                : updatedParentId
            : fieldName;

    const portIn = getPort(portName + ".IN");
    const isUnknownType = field?.kind === TypeKind.Unknown;
    const mapping = portIn && portIn.attributes.value;
    const { expression, diagnostics } = mapping || {};
    const connectedViaLink = Object.values(portIn?.getLinks() || {}).length > 0;

    const hasDefaultValue = expression &&
        getDefaultValue(field?.kind) === expression.trim() &&
        !isEnum;

    const fields = isRecord && field?.fields?.filter(f => f !== null);
    const isWithinArray = fieldIndex !== undefined;

    const handleExpand = () => {
		const expandedFields = expandedFieldsStore.fields;
        const collapsedFields = collapsedFieldsStore.fields;
        if (expanded) {
            expandedFieldsStore.setFields(expandedFields.filter((element) => element !== portName));
            collapsedFieldsStore.setFields([...collapsedFields, portName]);
        } else {
            expandedFieldsStore.setFields([...expandedFields, portName]);
            collapsedFieldsStore.setFields(collapsedFields.filter((element) => element !== portName));
        }
    };

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const handleAddValue = async () => {
        setLoading(true);
        try {
            const defaultValue = getDefaultValue(field?.kind);
            await addValue(fieldFQNFromPortName(portName), defaultValue, context);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEnumValue = async (value: string) => {
        setLoading(true);
        try {
            await addValue(fieldFQNFromPortName(portName), value, context);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteValue = async () => {
        setLoading(true);
        try {
            await removeMapping(mapping || {output: portIn?.attributes.fieldFQN, expression: undefined}, context);
        } finally {
            setLoading(false);
        }
    };

    const handleEditValue = () => {
        setExprBarFocusedPort(portIn);
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    let isDisabled = portIn?.attributes.descendantHasValue;

    if (!isDisabled) {
        if (portIn?.attributes.parentModel && (
            Object.values(portIn?.attributes.parentModel.links)
                .filter((link) =>
                    !((link as DataMapperLinkModel).isDashLink || (link as DataMapperLinkModel).pendingMappingType)
                ).length > 0 ||
            portIn?.attributes.parentModel.attributes.ancestorHasValue)
        ) {
            portIn.attributes.ancestorHasValue = true;
            isDisabled = true;
        }
    }

    if (portIn && portIn.attributes.collapsed) {
        expanded = false;
    }

    if (!portIn) {
        indentation += 24;
    }

    if (isWithinArray) {
        displayName = field?.typeName ? `${field?.typeName}Item` : 'item';
    }

    const label = !isArray && (
        <TruncatedLabelGroup style={{ marginRight: "auto", alignItems: "baseline" }}>
            <TruncatedLabel
                className={classnames(classes.valueLabel,
                    isDisabled && !hasHoveredParent ? classes.labelDisabled : ""
                )}
                style={{ marginLeft: fields ? 0 : indentation + 24 }}
            >
                <OutputSearchHighlight>{displayName}</OutputSearchHighlight>
                {!field?.optional && <span className={classes.requiredMark}>*</span>}
            </TruncatedLabel>
            <TruncatedLabel>
                {typeName && (
                    <span
                        className={classnames(isUnknownType ? classes.unknownTypeLabel : classes.typeLabel,
                            isDisabled && !hasHoveredParent ? classes.labelDisabled : ""
                        )}
                    >
                        {typeName || ''}
                    </span>
                )}
                {!connectedViaLink && (expression || hasDefaultValue) && (
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
            </TruncatedLabel>
        </TruncatedLabelGroup>
    );

    const addOrEditValueMenuItem: ValueConfigMenuItem = expression || hasDefaultValue
        ? { title: ValueConfigOption.EditValue, onClick: handleEditValue }
        : { title: ValueConfigOption.InitializeWithValue, onClick: handleAddValue };

    const deleteValueMenuItem: ValueConfigMenuItem = {
        title: isWithinArray ? ValueConfigOption.DeleteElement : ValueConfigOption.DeleteValue,
        onClick: handleDeleteValue
    };

    const addEnumValueMenuItems: ValueConfigMenuItem[] = expression
        ? [{ title: ValueConfigOption.EditValue, onClick: handleEditValue }]
        : field?.members?.map(member => ({
            title: `Initialize as ${member.typeName}`,
            onClick: () => handleAddEnumValue(member.typeName)
        })) || [];

    const valConfigMenuItems = isDisabled
        ? [(expression || hasDefaultValue || isWithinArray) && deleteValueMenuItem]
        : [
            !isWithinArray && !isEnum && addOrEditValueMenuItem,
            ...(isEnum ? addEnumValueMenuItems : []),
            (expression || hasDefaultValue || isWithinArray) && deleteValueMenuItem
        ];

    return (
        <>
            {!isArray && (
                <div
                    id={"recordfield-" + portName}
                    className={classnames(classes.treeLabel,
                        isDisabled && !hasHoveredParent && !isHovered ? classes.treeLabelDisabled : "",
                        isDisabled && isHovered ? classes.treeLabelDisableHover : "",
                        portState !== PortState.Unselected ? classes.treeLabelPortSelected : "",
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
                            />
                        )}
                    </span>
                    <span className={classes.label}>
                        {fields && (
                            <Button
                                id={"expand-or-collapse-" + portName} 
                                appearance="icon"
                                tooltip="Expand/Collapse"
                                sx={{ marginLeft: indentation }}
                                onClick={handleExpand}
                                data-testid={`${portIn?.getName()}-expand-icon-element`}
                            >
                                {expanded ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
                            </Button>
                        )}
                        {label}
                    </span>
                    {(isLoading) ? (
                        <ProgressRing />
                    ) : (
                        <FieldActionWrapper>
                            <ValueConfigMenu
                                menuItems={valConfigMenuItems}
                                portName={portIn?.getName()}
                            />
                        </FieldActionWrapper>
                    )}
                </div>
            )}
            {isArray && (
                <ArrayOutputFieldWidget
                    key={portName}
                    engine={engine}
                    field={field}
                    getPort={getPort}
                    parentId={portName}
                    context={context}
                    fieldIndex={fieldIndex}
                    treeDepth={treeDepth}
                    hasHoveredParent={isHovered || hasHoveredParent}
                />
            )}
            {fields && expanded &&
                fields.map((subField, index) => {
                    return (
                        <ObjectOutputFieldWidget
                            key={index}
                            engine={engine}
                            field={subField}
                            getPort={getPort}
                            parentId={portName}
                            context={context}
                            treeDepth={treeDepth + 1}
                            hasHoveredParent={isHovered || hasHoveredParent}
                        />
                    );
                })
            }
        </>
    );
}
