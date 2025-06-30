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
import React, { useEffect, useMemo, useState } from "react";

import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { AnydataType, PrimitiveBalType, STModification, TypeField } from "@wso2/ballerina-core";
import {
    MappingConstructor,
    NodePosition,
    STKindChecker,
    STNode
} from "@wso2/syntax-tree";
import classnames from "classnames";
import { Diagnostic } from "vscode-languageserver-types";
import { URI } from "vscode-uri";

import { useDMStore } from "../../../../../store/store";
import { IDataMapperContext } from "../../../../../utils/DataMapperContext/DataMapperContext";
import { DiagnosticTooltip } from "../../../Diagnostic/DiagnosticTooltip/DiagnosticTooltip";
import { EditableRecordField } from "../../../Mappings/EditableRecordField";
import { DataMapperPortWidget, PortState, RecordFieldPortModel } from "../../../Port";
import {
    createSourceForUserInput,
    extractImportAlias,
    getDefaultValue,
    getExprBodyFromTypeCastExpression,
    getFieldName,
    getInnermostExpressionBody,
    getMatchingType,
    getNewFieldAdditionModification,
    getTypeName,
    isConnectedViaLink,
    isEmptyValue
} from "../../../utils/dm-utils";
import { getModification } from "../../../utils/modifications";
import {
    CLEAR_EXISTING_MAPPINGS_WARNING,
    getSupportedUnionTypes,
    getUnionTypes,
    INCOMPATIBLE_CASTING_WARNING,
    isAnydataType
} from "../../../utils/union-type-utils";
import { AddRecordFieldButton } from "../AddRecordFieldButton";
import { OutputSearchHighlight } from "../Search";

import { ArrayTypedEditableRecordFieldWidget } from "./ArrayTypedEditableRecordFieldWidget";
import { ValueConfigMenu, ValueConfigOption } from "./ValueConfigButton";
import { ValueConfigMenuItem } from "./ValueConfigButton/ValueConfigMenuItem";
import { Button, Codicon, Icon, ProgressRing, TruncatedLabel } from "@wso2/ui-toolkit";
import { useIONodesStyles } from "../../../../styles";

export interface EditableRecordFieldWidgetProps {
    parentId: string;
    field: EditableRecordField;
    engine: DiagramEngine;
    getPort: (portId: string) => RecordFieldPortModel;
    parentMappingConstruct: STNode;
    context: IDataMapperContext;
    fieldIndex?: number;
    treeDepth?: number;
    deleteField?: (node: STNode) => Promise<void>;
    hasHoveredParent?: boolean;
}

export function EditableRecordFieldWidget(props: EditableRecordFieldWidgetProps) {
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
        hasHoveredParent
    } = props;
    const {
        applyModifications,
        enableStatementEditor,
        filePath,
        handleCollapse,
        langServerRpcClient
    } = context;
    const classes = useIONodesStyles();
    const [isLoading, setIsLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isModyfying, setIsModyfying] = useState(false);

    let fieldName = getFieldName(field);
    const fieldId = fieldIndex !== undefined
        ? `${parentId}.${fieldIndex}${fieldName && `.${fieldName}`}`
        : `${parentId}.${fieldName}`;
    const portIn = getPort(fieldId + ".IN");
    const specificField = field.hasValue() && STKindChecker.isSpecificField(field.value) && field.value;
    const mappingConstruct = STKindChecker.isMappingConstructor(parentMappingConstruct) && parentMappingConstruct;
    const isArray = field.type.typeName === PrimitiveBalType.Array;
    const isRecord = field.type.typeName === PrimitiveBalType.Record;
    const typeName = getTypeName(field.type);
    const hasValue = specificField && specificField.valueExpr;
    const fields = isRecord && field.childrenTypes;
    const isWithinArray = fieldIndex !== undefined;
    const isUnionTypedElement = field.originalType.typeName === PrimitiveBalType.Union;
    const isEnumTypedElement = field.originalType.typeName === PrimitiveBalType.Enum;
    const isUnresolvedUnionTypedElement = isUnionTypedElement && field.type.typeName === PrimitiveBalType.Union;
    let indentation = treeDepth * 16;
    const [portState, setPortState] = useState<PortState>(PortState.Unselected);
    const [isDisabled, setIsDisabled] = useState(portIn?.descendantHasValue);

    const connectedViaLink = useMemo(() => {
        if (hasValue) {
            return isConnectedViaLink(specificField.valueExpr);
        }
        return false;
    }, [field]);

    const value: string = !isArray && !isRecord && hasValue && getInnermostExpressionBody(specificField.valueExpr).source;
    let expanded = true;

    const handleAddValue = async () => {
        setIsLoading(true);
        try {
            let targetTypeName = field.type?.typeName;
            if (!targetTypeName) {
                const typeInfo = field.type.typeInfo;
                const langClient = await langServerRpcClient;
                const typesRes = await langClient.getTypeFromExpression({
                    documentIdentifier: {
                        uri: URI.file(filePath).toString()
                    },
                    expressionRanges: [{
                        startLine: {
                            line: field.parentType.value.position.startLine,
                            offset: field.parentType.value.position.startColumn
                        },
                        endLine: {
                            line: field.parentType.value.position.endLine,
                            offset: field.parentType.value.position.endColumn
                        },
                        filePath: URI.file(filePath).toString()
                    }]
                });
                for (const { type } of typesRes.types) {
                    const matchingType = getMatchingType(type, typeInfo);
                    targetTypeName = matchingType ? matchingType.typeName : targetTypeName;
                }
            }
            const defaultValue = getDefaultValue(targetTypeName);
            await createSourceForUserInput(field, mappingConstruct, defaultValue, applyModifications);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditValue = () => {
        if (field.value && STKindChecker.isSpecificField(field.value)) {
            const innerExpr = getInnermostExpressionBody(field.value.valueExpr);
            enableStatementEditor({
                value: innerExpr.source,
                valuePosition: innerExpr.position as NodePosition,
                label: field.value.fieldName.value as string
            });
        }
    };

    const handleDeleteValue = async () => {
        setIsLoading(true);
        try {
            await deleteField(field.value);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExpand = () => {
        handleCollapse(fieldId, !expanded);
    };

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    const getTargetPositionForReInitWithTypeCast = () => {
        let targetPosition: NodePosition = field.value.position;

        if (STKindChecker.isSpecificField(field.value)) {
            targetPosition = field.value.valueExpr.position;
            const isValueExprEmpty = isEmptyValue(field.value.valueExpr.position);
            if (isValueExprEmpty) {
                targetPosition = {
                    ...field.value.position,
                    startLine: field.value.position.endLine,
                    startColumn: field.value.position.endColumn
                }
            }
        }

        return targetPosition;
    }

    const getTargetPositionForWrapWithTypeCast = () => {
        let valueExpr: STNode = field.value;
        let valueExprPosition: NodePosition = valueExpr.position;

        if (STKindChecker.isSpecificField(field.value)) {
            valueExpr = field.value.valueExpr;
            valueExprPosition = valueExpr.position;
        }

        let targetPosition: NodePosition = {
            ...valueExprPosition,
            endLine: valueExprPosition.startLine,
            endColumn: valueExprPosition.startColumn
        }

        if (STKindChecker.isTypeCastExpression(valueExpr)) {
            const exprBodyPosition = getExprBodyFromTypeCastExpression(valueExpr).position;
            targetPosition = {
                ...valueExprPosition,
                endLine: exprBodyPosition.startLine,
                endColumn: exprBodyPosition.startColumn
            };
        }

        return targetPosition;
    }

    const handleWrapWithTypeCast = async (type: TypeField, shouldReInitialize?: boolean) => {
        setIsModyfying(true)
        try {
            const name = getTypeName(type);
            if (field?.value) {
                const modification: STModification[] = [];
                if (shouldReInitialize) {
                    const defaultValue = getDefaultValue(type.typeName);
                    const targetPosition = getTargetPositionForReInitWithTypeCast();
                    modification.push(getModification(`<${name}>${defaultValue}`, targetPosition));
                } else {
                    const targetPosition = getTargetPositionForWrapWithTypeCast();
                    modification.push(getModification(`<${name}>`, targetPosition));
                }
                await applyModifications(modification);
            } else {
                const defaultValue = `<${name}>${getDefaultValue(type.typeName)}`;
                await createSourceForUserInput(field, mappingConstruct, defaultValue, applyModifications);
            }
        } finally {
            setIsModyfying(false);
        }
    };

    useEffect(() => {
        if (!isDisabled) {
            if (portIn?.parentModel && (Object.entries(portIn?.parentModel.links).length > 0 || portIn?.parentModel.ancestorHasValue)) {
                portIn.ancestorHasValue = true;
                setIsDisabled(true);
            }
            const isConnectedViaQueryExpr = hasValue && STKindChecker.isQueryExpression(specificField.valueExpr);
            const isInitializedRecord = isRecord && hasValue && !connectedViaLink;
            const isInitializedArray = isArray && hasValue && !connectedViaLink;
            const isEmptyArray = isArray && portIn.editableRecordField?.elements?.length === 0;

            if (isConnectedViaQueryExpr || isInitializedRecord || (isInitializedArray && !isEmptyArray)) {
                portIn?.setDescendantHasValue();
                setIsDisabled(true);
            }
        }
    }, [field]);

    if (portIn && portIn.collapsed) {
        expanded = false;
    }

    if (!portIn) {
        indentation += 24;
    }

    if (isWithinArray) {
        const elementName = fieldName || field.parentType.type?.name;
        fieldName = elementName ? `${elementName}Item` : 'item';
    }

    const diagnostic = (specificField.valueExpr as STNode)?.typeData?.diagnostics[0] as Diagnostic;

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

    const label = !isArray && (
        <TruncatedLabel style={{ marginRight: "auto" }}>
            <span style={{ marginRight: "auto" }} data-testid={`record-widget-field-label-${portIn?.getName()}`}>
                <span
                    className={classnames(
                        classes.valueLabel,
                        isDisabled && !hasHoveredParent ? classes.labelDisabled : ""
                    )}
                    style={{ marginLeft: fields ? 0 : indentation + 24 }}
                >
                    <OutputSearchHighlight>{fieldName}</OutputSearchHighlight>
                    {!field.type?.optional && <span className={classes.requiredMark}>*</span>}
                    {typeName && ":"}
                </span>
                {typeName && (
                    <span
                        className={classnames(classes.outputTypeLabel,
                            isDisabled && !hasHoveredParent ? classes.labelDisabled : ""
                        )}
                    >
                        {field.originalType.typeName === PrimitiveBalType.Union ? getUnionType() : typeName || ''}
                    </span>
                )}
                {value && !connectedViaLink && (
                    <>
                        {diagnostic ? (
                            <DiagnosticTooltip diagnostic={diagnostic} value={value} onClick={handleEditValue}>
                                <Button
                                    appearance="icon"
                                    onClick={handleEditValue}
                                    data-testid={`record-widget-field-${portIn?.getName()}`}
                                >
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
                                data-testid={`record-widget-field-${portIn?.getName()}`}
                            >
                                {value}
                            </span>
                        )}
                    </>
                )}
            </span>
        </TruncatedLabel>
    );

    const handleAssignDefaultValue = async (typeNameStr: string) => {
        setIsLoading(true);
        try {
            const defaultValue = getDefaultValue(typeNameStr);
            await createSourceForUserInput(
                field, parentMappingConstruct as MappingConstructor, defaultValue, applyModifications
            );
        } finally {
            setIsLoading(false);
        }
    };

    const addOrEditValueMenuItem: ValueConfigMenuItem = hasValue
        ? { title: ValueConfigOption.EditValue, onClick: handleEditValue }
        : !(isUnionTypedElement || isEnumTypedElement)
            && { title: ValueConfigOption.InitializeWithValue, onClick: handleAddValue };

    const deleteValueMenuItem: ValueConfigMenuItem = {
        title: isWithinArray ? ValueConfigOption.DeleteElement : ValueConfigOption.DeleteValue,
        onClick: handleDeleteValue
    };

    const getTypeCastMenuItem = (unionMember: TypeField, shouldWarn?: boolean): ValueConfigMenuItem => {
        const memberTypeName = getTypeName(unionMember);
        return {
            title: `Cast type as ${memberTypeName}`,
            onClick: () => handleWrapWithTypeCast(unionMember),
            level: 0,
            warningMsg: shouldWarn && INCOMPATIBLE_CASTING_WARNING
        };
    };

    const getReInitMenuItem = (unionMember: TypeField): ValueConfigMenuItem => {
        const memberTypeName = getTypeName(unionMember);
        return {
            title: `Re-initialize as ${memberTypeName}`,
            onClick: () => handleWrapWithTypeCast(unionMember, true),
            level: 1,
            warningMsg: CLEAR_EXISTING_MAPPINGS_WARNING
        };
    };

    const getTypedElementMenuItems = () => {
        const menuItems: ValueConfigMenuItem[] = [];
        const resolvedTypeName = getTypeName(field.type);
        const supportedTypes = getSupportedUnionTypes(field.originalType);
        const resolvedViaTypeCast = field?.value
            && !isUnresolvedUnionTypedElement
            && STKindChecker.isSpecificField(field.value)
            && STKindChecker.isTypeCastExpression(field.value.valueExpr);

        for (const member of field.originalType.members) {
            const memberTypeName = getTypeName(member);
            if (!supportedTypes.includes(memberTypeName) || isAnydataType(memberTypeName)) {
                continue;
            }
            if (field.hasValue()) {
                if (isUnresolvedUnionTypedElement) {
                    menuItems.push(getReInitMenuItem(member));
                    if (field?.value && STKindChecker.isSpecificField(field.value) && !isEmptyValue(field.value.valueExpr.position)) {
                        menuItems.push(getTypeCastMenuItem(member, true));
                    }
                } else {
                    const isResolvedType = memberTypeName === resolvedTypeName;
                    if (resolvedViaTypeCast) {
                        if (!isResolvedType) {
                            menuItems.push(getTypeCastMenuItem(member, true), getReInitMenuItem(member));
                        }
                    } else if (supportedTypes.length > 1) {
                        if (isResolvedType) {
                            menuItems.push(getTypeCastMenuItem(member));
                        } else {
                            menuItems.push(getReInitMenuItem(member));
                        }
                    }
                }
            } else {
                menuItems.push({
                    title: `Initialize as ${memberTypeName}`,
                    onClick: () => handleWrapWithTypeCast(member)
                })
            }
        }

        return menuItems.sort((a, b) => (a.level || 0) - (b.level || 0));
    };

    const getEnumElementMenuItems = () => {
        const menuItems: ValueConfigMenuItem[] = [];
        for (const member of field.originalType.members) {
            const memberTypeName = getTypeName(member);

            let enumValName = memberTypeName;
            if (field.type?.typeInfo) {
                const { orgName, moduleName } = field.type?.typeInfo;
                const importStatements = useDMStore.getState().imports;
                const importStatement = importStatements.find(item => item.includes(`${orgName}/${moduleName}`));
                if (importStatement) {
                    // If enum is from an imported package
                    const importAlias = extractImportAlias(moduleName, importStatement);
                    enumValName = `${(importAlias || moduleName.split('.').pop())}:${memberTypeName}`;
                }
            }
            menuItems.push({
                title: `${hasValue ? `Re-Initialize` : 'Initialize'} as ${enumValName}`,
                onClick: () => hasValue
                    ? handleReInitEnumValue(memberTypeName)
                    : createSourceForUserInput(field, mappingConstruct, enumValName, applyModifications)
            });
        }
        return menuItems.sort((a, b) => (a.level || 0) - (b.level || 0));
    };

    const handleReInitEnumValue = async (newValue: string) => {
        setIsModyfying(true)
        try {
            if (field?.value) {
                const modification: STModification[] = [];
                if (STKindChecker.isSpecificField(field.value)) {
                    const valueExprPosition = field.value.valueExpr.position;
                    modification.push(getModification(newValue, valueExprPosition));
                    await applyModifications(modification);
                }
            }
        } finally {
            setIsModyfying(false);
        }
    };

    const valConfigMenuItems = [
        !isWithinArray && addOrEditValueMenuItem,
        (hasValue || isWithinArray) && deleteValueMenuItem,
    ];

    const isAnyDataRecord = field.type?.originalTypeName === AnydataType && field.type?.typeName !== PrimitiveBalType.Array;

    if (field.type?.typeName === AnydataType) {
        const anyDataConvertOptions: ValueConfigMenuItem[] = []
        anyDataConvertOptions.push({ title: `Initialize as record`, onClick: () => handleAssignDefaultValue(PrimitiveBalType.Record) })
        anyDataConvertOptions.push({ title: `Initialize as array`, onClick: () => handleAssignDefaultValue(PrimitiveBalType.Array) })
        valConfigMenuItems.push(...anyDataConvertOptions)
    }

    const typeSpecificMenuItems = useMemo(() => {
        if (isUnionTypedElement) {
            return getTypedElementMenuItems();
        } else if (isEnumTypedElement) {
            return getEnumElementMenuItems();
        }
        return [];
    }, [field.originalType.members, isUnionTypedElement, isEnumTypedElement]);

    valConfigMenuItems.push(...typeSpecificMenuItems);

    const addNewField = async (newFieldNameStr: string) => {
        const modification = getNewFieldAdditionModification(field.value, newFieldNameStr);
        if (modification) {
            await applyModifications(modification);
        }
    }

    const subFieldNames = useMemo(() => {
        const fieldNames: string[] = [];
        if (expanded && fields) {
            fields?.forEach(fieldItem => {
                if (fieldItem.value && STKindChecker.isSpecificField(fieldItem.value)) {
                    fieldNames.push(fieldItem.value?.fieldName?.value)
                }
            })
        }
        return fieldNames;
    }, [fields, expanded])

    return (
        <>
            {!isArray && (
                <div
                    id={"recordfield-" + fieldId}
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
                                id={"expand-or-collapse-" + fieldId}
                                appearance="icon"
                                tooltip="Expand/Collapse"
                                sx={{ marginLeft: indentation }}
                                onClick={handleExpand}
                                data-testid={`${portIn?.getName()}-expand-icon-element`}
                            >
                                {expanded ? <Codicon name="chevron-right" /> : <Codicon name="chevron-down" />}
                            </Button>
                        )}
                        {label}
                    </span>
                    {(!isDisabled || hasValue) && (
                        <>
                            {(isLoading || isModyfying) ? (
                                <ProgressRing sx={{ height: '16px', width: '16px' }} />
                            ) : (
                                <ValueConfigMenu menuItems={valConfigMenuItems} portName={portIn?.getName()} />
                            )}
                        </>
                    )}
                </div>
            )}
            {isArray && (
                <ArrayTypedEditableRecordFieldWidget
                    key={fieldId}
                    engine={engine}
                    field={field}
                    getPort={getPort}
                    parentId={parentId}
                    parentMappingConstruct={mappingConstruct}
                    context={context}
                    fieldIndex={fieldIndex}
                    treeDepth={treeDepth}
                    deleteField={deleteField}
                    hasHoveredParent={isHovered || hasHoveredParent}
                />
            )}
            {fields && expanded &&
                fields.map((subField, index) => {
                    return (
                        <EditableRecordFieldWidget
                            key={index}
                            engine={engine}
                            field={subField}
                            getPort={getPort}
                            parentId={fieldId}
                            parentMappingConstruct={mappingConstruct}
                            context={context}
                            treeDepth={treeDepth + 1}
                            deleteField={deleteField}
                            hasHoveredParent={isHovered || hasHoveredParent}
                        />
                    );
                })
            }
            {isAnyDataRecord && (
                <AddRecordFieldButton
                    fieldId={fieldId}
                    addNewField={addNewField}
                    indentation={indentation + 50}
                    existingFieldNames={subFieldNames}
                />
            )}
        </>
    );
}
