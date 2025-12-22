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
import { Button, Codicon, Icon, ProgressRing, TruncatedLabel, TruncatedLabelGroup } from "@wso2/ui-toolkit";
import { IOType, TypeKind } from "@wso2/ballerina-core";
import classnames from "classnames";

import { useIONodesStyles } from "../../../styles";
import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore, useDMExpressionBarStore } from '../../../../store/store';
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
import { OutputFieldPreviewWidget } from "./OutputFieldPreviewWidget";
import { DataMapperLinkModel } from "../../Link";

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
    isPortParent?: boolean;
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
        hasHoveredParent,
        isPortParent
    } = props;
    const classes = useIONodesStyles();

    const [isLoading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [portState, setPortState] = useState<PortState>(PortState.Unselected);
    const [isAddingElement, setIsAddingElement] = useState(false);
    const collapsedFieldsStore = useDMCollapsedFieldsStore();
    const expandedFieldsStore = useDMExpandedFieldsStore();
    const setExprBarFocusedPort = useDMExpressionBarStore(state => state.setFocusedPort);

    const arrayField = field?.member;
    const typeName = getTypeName(field);

    let portName = parentId;
    if (fieldIndex !== undefined && !isPortParent) {
        portName = `${portName}.${fieldIndex}`
    }
    const fieldName = field?.displayName || field?.name || '';

    const portIn = getPort(`${portName}.IN`);
    const mapping = portIn && portIn.attributes.value;
    const { expression, elements, diagnostics } = mapping || {};
    const searchValue = useDMSearchStore.getState().outputSearch;
    const hasElements = elements?.length > 0 && elements.some((element) => element.mappings.length > 0);
    const connectedViaLink = Object.values(portIn?.getLinks() || {}).length > 0;

    let expanded = true;
    if (portIn && portIn.attributes.collapsed) {
        expanded = false;
    }

    let indentation = treeDepth * 16;
    if (!portIn) {
        indentation += 24;
    }

    const hasDefaultValue = expression && getDefaultValue(field?.kind) === expression.trim();
    let isDisabled = portIn?.attributes.descendantHasValue;

    if (!isDisabled && !hasDefaultValue && portIn) {
        if (hasElements && expanded && portIn.attributes.parentModel) {
            portIn.setDescendantHasValue();
            isDisabled = true;
        }
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

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const handleEditValue = () => {
        if (portIn)
            setExprBarFocusedPort(portIn);
    };

    const onAddElementClick = async () => {
        await handleAddArrayElement();
    };

    const label = (
        <TruncatedLabelGroup style={{ marginRight: "auto", alignItems: "baseline" }}>
            <TruncatedLabel
                className={classnames(classes.valueLabel, isDisabled ? classes.labelDisabled : "")}
            >
                <OutputSearchHighlight>{fieldName}</OutputSearchHighlight>
                {!field?.optional && <span className={classes.requiredMark}>*</span>}
            </TruncatedLabel>
            <TruncatedLabel>
                {typeName && (
                    <span className={classnames(classes.typeLabel, isDisabled ? classes.labelDisabled : "")}>
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
            </TruncatedLabel>
        </TruncatedLabelGroup>
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
                                    treeDepth={0}
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
                            treeDepth={0}
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
                    : <Codicon name="add" iconSx={{ color: "var(--vscode-textLink-foreground)" }} />
                }
                    Add Element
            </Button>
        );
    }, [isAddingElement]);

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

    const handleArrayInitialization = async () => {
        setLoading(true);
        try {
            await addValue(fieldFQNFromPortName(portName), '[]', context);
        } finally {
            setLoading(false);
        }
    };

    const handleArrayInitWithElement = async () => {
        setLoading(true);
        try {
            await addValue(fieldFQNFromPortName(portName), `[${getDefaultValue(arrayField.kind)}]`, context);
        } finally {
            setLoading(false);
        }
    };

    const handleArrayDeletion = async () => {
        setLoading(true);
        try {
            await removeMapping(mapping || {output: portIn?.attributes.fieldFQN, expression: undefined}, context);
        } finally {
            setLoading(false);
        }
    };

    const handleAddArrayElement = async () => {
        const varName = context.views[0].targetField;
        const viewId = context.views[context.views.length - 1].targetField;

        setIsAddingElement(true)
        try {
            await context.addArrayElement(mapping.output, viewId, varName);
        } finally {
            if (!expanded) handleExpand();
            setIsAddingElement(false);
        }
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    const valConfigMenuItems: ValueConfigMenuItem[] = isDisabled
        ? [
            { title: ValueConfigOption.DeleteArray, onClick: handleArrayDeletion },
        ]
        : hasElements || hasDefaultValue
            ? [
                { title: ValueConfigOption.AddElement, onClick: handleAddArrayElement },
                { title: ValueConfigOption.EditValue, onClick: handleEditValue },
                { title: ValueConfigOption.DeleteArray, onClick: handleArrayDeletion },
            ]
            : [
                { title: ValueConfigOption.InitializeArray, onClick: handleArrayInitialization },
                { title: ValueConfigOption.InitializeArrayWithElement, onClick: handleArrayInitWithElement }
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
                                dataTestId={`array-type-editable-record-field-${portIn.getName()}`}
                            />
                        )}
                    </span>
                    <span className={classes.label}>
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
            {(expanded && !connectedViaLink && !!elements?.length) && (
                <div data-testid={`array-widget-${portIn?.getName()}-values`}>
                    <div className={classes.innerTreeLabel}>
                        <span>[</span>
                        {arrayElements}
                        {addElementButton}
                        <span>]</span>
                    </div>
                </div>
            )}
            {(expanded && !elements?.length && arrayField) && (
                <OutputFieldPreviewWidget
                    key={`arr-output--preview-field-${portName}`}
                    engine={engine}
                    field={arrayField}
                    getPort={getPort}
                    parentId={portName}
                    context={context}
                    treeDepth={treeDepth}
                    hasHoveredParent={isHovered || hasHoveredParent}
                />
            )}
        </div>
    );
}
