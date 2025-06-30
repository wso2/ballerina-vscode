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

import { Button, Codicon, Icon, Item, Menu, MenuItem, ProgressRing, TruncatedLabel } from "@wso2/ui-toolkit";
import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { AnydataType, PrimitiveBalType } from "@wso2/ballerina-core";
import { MappingConstructor, NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree";
import classnames from "classnames";
import { Diagnostic } from "vscode-languageserver-types";

import { useDMSearchStore } from "../../../../../store/store";
import { IDataMapperContext } from "../../../../../utils/DataMapperContext/DataMapperContext";
import { DiagnosticTooltip } from "../../../Diagnostic/DiagnosticTooltip/DiagnosticTooltip";
import { EditableRecordField } from "../../../Mappings/EditableRecordField";
import { DataMapperPortWidget, PortState, RecordFieldPortModel } from "../../../Port";
import {
    createSourceForUserInput,
    findTypeByInfoFromStore,
    getDefaultValue,
    getExprBodyFromTypeCastExpression,
    getFieldName,
    getInnermostExpressionBody,
    getLinebreak,
    getShortenedTypeName,
    getTypeName,
    isConnectedViaLink,
} from "../../../utils/dm-utils";
import { getModification } from "../../../utils/modifications";
import { getSupportedUnionTypes, getUnionTypes } from "../../../utils/union-type-utils";
import { OutputSearchHighlight } from "../Search";
import { TreeBody } from "../Tree/Tree";

import { EditableRecordFieldWidget } from "./EditableRecordFieldWidget";
import { PrimitiveTypedEditableElementWidget } from "./PrimitiveTypedEditableElementWidget";
import { ValueConfigMenu, ValueConfigOption } from "./ValueConfigButton";
import { ValueConfigMenuItem } from "./ValueConfigButton/ValueConfigMenuItem";
import { useIONodesStyles } from "../../../../styles";

export interface ArrayTypedEditableRecordFieldWidgetProps {
    parentId: string;
    field: EditableRecordField;
    engine: DiagramEngine;
    getPort: (portId: string) => RecordFieldPortModel;
    parentMappingConstruct: MappingConstructor;
    context: IDataMapperContext;
    fieldIndex?: number;
    treeDepth?: number;
    deleteField?: (node: STNode) => Promise<void>;
    isReturnTypeDesc?: boolean;
    hasHoveredParent?: boolean;
}

export function ArrayTypedEditableRecordFieldWidget(props: ArrayTypedEditableRecordFieldWidgetProps) {
    const {
        parentId,
        field,
        getPort,
        engine,
        parentMappingConstruct,
        context,
        fieldIndex,
        treeDepth = 0,
        deleteField,
        isReturnTypeDesc,
        hasHoveredParent
    } = props;
    const { handleCollapse, filePath } = context;
    const classes = useIONodesStyles();
    const [isLoading, setLoading] = useState(false);
    const [isAddingElement, setIsAddingElement] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isAddingTypeCast, setIsAddingTypeCast] = useState(false);

    const fieldName = getFieldName(field);
    const fieldId = fieldIndex !== undefined
        ? `${parentId}.${fieldIndex}${fieldName ? `.${fieldName}` : ''}`
        : `${parentId}${fieldName ? `.${fieldName}` : ''}`;
    const portIn = getPort(`${fieldId}.IN`);
    const body = field.hasValue() && getInnermostExpressionBody(field.value);
    const valExpr = body && STKindChecker.isSpecificField(body) ? body.valueExpr : body;
    const diagnostic = (valExpr as STNode)?.typeData?.diagnostics[0] as Diagnostic
    const hasValue = valExpr && !!valExpr.source;
    const innerValExpr = getInnermostExpressionBody(valExpr);
    const isValQueryExpr = valExpr && STKindChecker.isQueryExpression(innerValExpr);
    const isUnionTypedElement = field.type.typeName === PrimitiveBalType.Union && !field.type.resolvedUnionType;
    const typeName = getTypeName(field.type);
    const elements = field.elements;
    const [portState, setPortState] = useState<PortState>(PortState.Unselected);
    const [addElementAnchorEl, addElementSetAnchorEl] = React.useState<null | HTMLButtonElement>(null);
    const addMenuOpen = Boolean(addElementAnchorEl);
    const searchValue = useDMSearchStore.getState().outputSearch;

    const connectedViaLink = useMemo(() => {
        if (hasValue) {
            return isConnectedViaLink(innerValExpr);
        }
        return false;
    }, [field]);

    let expanded = true;
    if (portIn && portIn.collapsed) {
        expanded = false;
    }

    const listConstructor = hasValue ? (STKindChecker.isListConstructor(innerValExpr) ? innerValExpr : null) : null;

    let indentation = treeDepth * 16;
    if (!portIn) {
        indentation += 24;
    }

    let isDisabled = portIn.descendantHasValue;
    if (!isDisabled) {
        const hasElements = listConstructor && listConstructor.expressions.length > 0;
        if (listConstructor && hasElements && expanded && portIn.parentModel) {
            portIn.setDescendantHasValue();
            isDisabled = true;
        }
        if (portIn.parentModel && (Object.entries(portIn.parentModel.links).length > 0 || portIn.parentModel.ancestorHasValue)) {
            portIn.ancestorHasValue = true;
            isDisabled = true;
        }
    }

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const handleEditValue = () => {
        let value = field.value.source;
        let valuePosition = field.value.position as NodePosition;
        let editorLabel = 'Array Element';
        if (field.value && STKindChecker.isSpecificField(field.value)) {
            value = field.value.valueExpr.source;
            valuePosition = field.value.valueExpr.position as NodePosition;
            editorLabel = field.value.fieldName.value as string;
        }
        props.context.enableStatementEditor({
            value,
            valuePosition,
            label: editorLabel
        });
    };

    const onAddElementClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isAnydataType || isUnionType) {
            addElementSetAnchorEl(event.currentTarget)
        } else {
            handleAddArrayElement(field?.type?.memberType?.typeName)
        }
    };

    const getUnionType = () => {
        const typeText: JSX.Element[] = [];
        const unionTypes = getUnionTypes(field.originalType);
        const resolvedTypeName = getTypeName(field.type);
        unionTypes.forEach((type) => {
            if (type.trim() === resolvedTypeName) {
                typeText.push(<span className={classes.boldedTypeLabel}>{type}</span>);
            } else {
                typeText.push(<>{type}</>);
            }
            if (type !== unionTypes[unionTypes.length - 1]) {
                typeText.push(<> | </>);
            }
        });
        return typeText;
    };

    const label = (
        <TruncatedLabel style={{ marginRight: "auto" }}>
            <span style={{ marginRight: "auto" }} data-testid={`record-widget-field-label-${portIn?.getName()}`}>
                <span
                    className={classnames(classes.valueLabel,
                        isDisabled ? classes.labelDisabled : "")}
                    style={{ marginLeft: (hasValue && !connectedViaLink && !isValQueryExpr) ? 0 : indentation + 24 }}
                >
                    <OutputSearchHighlight>{fieldName}</OutputSearchHighlight>
                    {!field.type?.optional && <span className={classes.requiredMark}>*</span>}
                    {fieldName && typeName && ":"}
                </span>
                {typeName !== '[]' ? (
                    <span className={classnames(classes.outputTypeLabel, isDisabled ? classes.labelDisabled : "")}>
                        {field.originalType.typeName === PrimitiveBalType.Union ? getUnionType() : typeName || ''}
                    </span>
                ) : (
                    <DiagnosticTooltip
                        diagnostic={{
                            message: "Type information is missing",
                            range: null
                        }}
                    >
                        <Button
                            appearance="icon"
                        >
                            {typeName}
                            <Icon
                                name="error-icon"
                                sx={{ height: "14px", width: "14px" }}
                                iconSx={{ fontSize: "14px", color: "var(--vscode-errorForeground)" }}
                            />
                        </Button>
                    </DiagnosticTooltip>
                )}
                {!listConstructor && !connectedViaLink && hasValue && (
                    <>
                        {diagnostic ? (
                            <DiagnosticTooltip
                                placement="right"
                                diagnostic={diagnostic}
                                value={valExpr?.source}
                                onClick={handleEditValue}
                            >
                                <Button
                                    appearance="icon"
                                    data-testid={`array-widget-field-${portIn?.getName()}`}
                                >
                                    {valExpr?.source}
                                    <Icon
                                        name="error-icon"
                                        sx={{ height: "14px", width: "14px" }}
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
                                {valExpr?.source}
                            </span>
                        )}
                    </>
                )}
            </span>
        </TruncatedLabel>
    );

    const arrayElements = useMemo(() => {
        return elements && (
            elements.map((element, index) => {
                if (element.elementNode) {
                    const elementNode = STKindChecker.isTypeCastExpression(element.elementNode)
                        ? getExprBodyFromTypeCastExpression(element.elementNode)
                        : element.elementNode;
                    if (STKindChecker.isMappingConstructor(elementNode)
                        || element.member?.type.typeName === PrimitiveBalType.Record) {
                        return (
                            <>
                                <TreeBody>
                                    <EditableRecordFieldWidget
                                        key={index}
                                        engine={engine}
                                        field={element.member}
                                        getPort={getPort}
                                        parentId={fieldId}
                                        parentMappingConstruct={elementNode as MappingConstructor}
                                        context={context}
                                        fieldIndex={index}
                                        treeDepth={treeDepth + 1}
                                        deleteField={deleteField}
                                        hasHoveredParent={isHovered || hasHoveredParent}
                                    />
                                </TreeBody>
                                <br />
                            </>
                        );
                    } else if (STKindChecker.isListConstructor(elementNode)) {
                        return (
                            <ArrayTypedEditableRecordFieldWidget
                                key={fieldId}
                                engine={engine}
                                field={element.member}
                                getPort={getPort}
                                parentId={fieldId}
                                parentMappingConstruct={parentMappingConstruct}
                                context={context}
                                fieldIndex={index}
                                treeDepth={treeDepth + 1}
                                deleteField={deleteField}
                                hasHoveredParent={isHovered || hasHoveredParent}
                            />
                        )
                    } else {
                        const value: string = elementNode.value || elementNode.source;
                        if (searchValue && !value.toLowerCase().includes(searchValue.toLowerCase())) {
                            return null;
                        }
                    }
                }
                return (
                    <PrimitiveTypedEditableElementWidget
                        parentId={fieldId}
                        field={element.member}
                        engine={engine}
                        getPort={getPort}
                        context={context}
                        fieldIndex={index}
                        deleteField={deleteField}
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
                className={classes.addArrayElementButton}
                appearance="icon"
                aria-label="add"
                onClick={onAddElementClick}
                disabled={isAddingElement}
                data-testid={`array-widget-${portIn?.getName()}-add-element`}
            >
                {isAddingElement ? <ProgressRing sx={{ height: '16px', width: '16px' }} /> : <Codicon name="add" iconSx={{ color: "var(--vscode-inputOption-activeForeground)" }} />}
                Add Element
            </Button>
        );
    }, [isAddingElement]);

    const handleExpand = () => {
        handleCollapse(fieldId, !expanded);
    };

    const handleArrayInitialization = async () => {
        setLoading(true);
        try {
            await createSourceForUserInput(field, parentMappingConstruct, '[]', context.applyModifications);
        } finally {
            setLoading(false);
        }
    };

    const handleArrayDeletion = async () => {
        setLoading(true);
        try {
            await deleteField(field.value);
        } finally {
            setLoading(false);
        }
    };

    const handleAddArrayElement = async (typeNameStr: string) => {
        setIsAddingElement(true)
        try {
            const fieldsAvailable = !!listConstructor.expressions.length;
            let type = typeNameStr;
            if (isUnionType) {
                let unionType = field.type.memberType;
                if (!field.type.memberType.typeName && field.type.memberType.typeInfo) {
                    unionType = findTypeByInfoFromStore(field.type.memberType.typeInfo);
                }
                type = unionType.members.find(member => typeNameStr === getTypeName(member)).typeName;
            }
            const defaultValue = getDefaultValue(type);
            let targetPosition: NodePosition;
            let newElementSource: string =
                `${getLinebreak()}${isUnionType ? `<${getShortenedTypeName(typeNameStr)}>` : ''}${defaultValue}`;
            if (fieldsAvailable) {
                targetPosition = listConstructor.expressions[listConstructor.expressions.length - 1].position as NodePosition;
                newElementSource = `,${newElementSource}`
            } else {
                targetPosition = listConstructor.openBracket.position as NodePosition;
            }
            const modification = [getModification(newElementSource, {
                ...targetPosition,
                startLine: targetPosition.endLine,
                startColumn: targetPosition.endColumn
            })];
            await context.applyModifications(modification);
        } finally {
            setIsAddingElement(false);
        }
    };

    const handleWrapWithTypeCast = async (type: string) => {
        setIsAddingTypeCast(true)
        try {
            let targetPosition: NodePosition;
            const typeCastExpr = STKindChecker.isTypeCastExpression(field.value) && field.value;
            const valueExprPosition: NodePosition = typeCastExpr
                ? getExprBodyFromTypeCastExpression(typeCastExpr).position
                : field.value.position;
            if (typeCastExpr) {
                const typeCastExprPosition: NodePosition = typeCastExpr.position;
                targetPosition = {
                    ...typeCastExprPosition,
                    endLine: valueExprPosition.startLine,
                    endColumn: valueExprPosition.startColumn
                };
            } else {
                targetPosition = {
                    ...valueExprPosition,
                    endLine: valueExprPosition.startLine,
                    endColumn: valueExprPosition.startColumn
                };
            }
            const modification = [getModification(`<${type}>`, targetPosition)];
            await context.applyModifications(modification);
        } finally {
            setIsAddingTypeCast(false);
        }
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    const isAnydataType = field.type?.memberType?.typeName === AnydataType
        || field.type?.memberType?.originalTypeName === AnydataType
        || field.type?.originalTypeName === AnydataType;

    const isUnionType = useMemo(() => {
        if (field.type?.memberType.typeName) {
            return field.type?.memberType?.typeName === PrimitiveBalType.Union;
        }
        const referredType = findTypeByInfoFromStore(field.type?.memberType?.typeInfo);
        return referredType && referredType.typeName === PrimitiveBalType.Union;
    }, [field]);

    const onCloseElementSetAnchor = () => addElementSetAnchorEl(null);

    const possibleTypeOptions: Item[] = useMemo(() => {
        if (isAnydataType) {
            const anyDataConvertOptions: Item[] = [];
            anyDataConvertOptions.push({ id: 'primitive', label: `Add a primitive element`, onClick: () => handleAddArrayElement("()") })
            anyDataConvertOptions.push({ id: 'record', label: `Add a record element`, onClick: () => handleAddArrayElement(PrimitiveBalType.Record) })
            anyDataConvertOptions.push({ id: 'array', label: `Add an array element`, onClick: () => handleAddArrayElement(PrimitiveBalType.Array) })
            return anyDataConvertOptions;
        } else if (isUnionType) {
            const unionTypeOptions: Item[] = [];
            const supportedTypes = getSupportedUnionTypes(field.type.memberType);
            supportedTypes.forEach((type) => {
                unionTypeOptions.push({ id: type, label: `Add a ${type} element`, onClick: () => handleAddArrayElement(type) })
            })
            return unionTypeOptions;
        }
    }, [])

    const valConfigMenuItems: ValueConfigMenuItem[] = hasValue
        ? [
            { title: ValueConfigOption.EditValue, onClick: handleEditValue },
            { title: ValueConfigOption.DeleteArray, onClick: handleArrayDeletion },
        ]
        : [
            { title: ValueConfigOption.InitializeArray, onClick: handleArrayInitialization }
        ];

    const typeSelectorMenuItems: ValueConfigMenuItem[] = isUnionTypedElement
        && field.type.members.map(member => {
            const memberTypeName = getTypeName(member);
            return {
                title: `Re-initialize as ${memberTypeName}`,
                onClick: () => handleWrapWithTypeCast(memberTypeName)
            }
        });

    if (isUnionTypedElement) {
        valConfigMenuItems.push(...typeSelectorMenuItems);
    }

    return (
        <div
            className={classnames(
                classes.treeLabelArray,
                hasHoveredParent ? classes.treeLabelParentHovered : "",
                (portState !== PortState.Unselected) ? classes.treeLabelPortSelected : ""
            )}
        >
            {!isReturnTypeDesc && (
                <div
                    id={"recordfield-" + fieldId}
                    className={classnames(classes.ArrayFieldRow,
                        isDisabled ? classes.ArrayFieldRowDisabled : "",
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
                        {(hasValue && !connectedViaLink) && (
                            <Button
                                id={`expand-or-collapse-${fieldId}`}
                                appearance="icon"
                                sx={{ marginLeft: indentation }}
                                onClick={handleExpand}
                                data-testid={`${portIn?.getName()}-expand-icon-array-field`}
                            >
                                {expanded ? <Codicon name="chevron-right" /> : <Codicon name="chevron-down" />}
                            </Button>
                        )}
                        {label}
                    </span>
                    {(isLoading || isAddingTypeCast) ? (
                        <ProgressRing />
                    ) : (
                        <>
                            {((hasValue && !connectedViaLink) || !isDisabled) && (
                                <ValueConfigMenu
                                    menuItems={valConfigMenuItems}
                                    isDisabled={!typeName || typeName === "[]"}
                                    portName={portIn?.getName()}
                                />
                            )}
                        </>
                    )}
                </div>
            )}
            {expanded && hasValue && listConstructor && !isUnionTypedElement && (
                <div data-testid={`array-widget-${portIn?.getName()}-values`}>
                    <div className={classes.innerTreeLabel}>
                        <span>[</span>
                        {arrayElements}
                        {addElementButton}
                        {(isAnydataType || isUnionType) && (
                            <Menu>
                                {possibleTypeOptions?.map((item) => (
                                    <>
                                        <MenuItem item={item} />
                                    </>
                                ))}
                            </Menu>
                        )}
                        <span>]</span>
                    </div>
                </div>
            )}
        </div>
    );
}
