/*
 * Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein is strictly forbidden, unless permitted by WSO2 in accordance with
 * the WSO2 Commercial License available at http://wso2.com/licenses.
 * For specific language governing the permissions and limitations under
 * this license, please see the license as well as any agreement you’ve
 * entered into with WSO2 governing the purchase of this software and any
 * associated services.
 */
// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import React, { ReactNode, useState } from "react";

import { DiagramEngine } from '@projectstorm/react-diagrams';
import { STModification, TypeField } from "@wso2/ballerina-core";
import { IdentifierToken, NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperPortWidget, PortState, RecordFieldPortModel } from '../../Port';
import {
    getDefaultValue,
    getExprBodyFromLetExpression,
    getExprBodyFromTypeCastExpression,
    getTypeName
} from "../../utils/dm-utils";
import { getModification } from "../../utils/modifications";
import {
    CLEAR_EXISTING_MAPPINGS_WARNING,
    getSupportedUnionTypes,
    INCOMPATIBLE_CASTING_WARNING,
    isAnydataType,
    UnionTypeInfo
} from "../../utils/union-type-utils";
import { ValueConfigMenu } from "../commons/DataManipulationWidget/ValueConfigButton";
import { ValueConfigMenuItem } from "../commons/DataManipulationWidget/ValueConfigButton/ValueConfigMenuItem";
import { TypeDescriptor } from "../commons/DataMapperNode";
import { OutputSearchHighlight } from "../commons/Search";
import { TreeBody, TreeContainer, TreeHeader } from '../commons/Tree/Tree';

import { UnionTypeSelector } from "./UnionTypeSelector";
import { Codicon, Divider, ProgressRing, TruncatedLabel } from "@wso2/ui-toolkit";
import { useIONodesStyles, useUnionTypeNodeStyles } from "../../../styles";

export interface UnionTypeTreeWidgetProps {
    id: string;
    engine: DiagramEngine;
    context: IDataMapperContext;
    typeName: string;
    typeIdentifier: TypeDescriptor | IdentifierToken;
    typeDef: TypeField;
    valueLabel?: string;
    hasInvalidTypeCast: boolean;
    innermostExpr: STNode;
    typeCastExpr: STNode;
    unionTypeInfo: UnionTypeInfo;
    getPort: (portId: string) => RecordFieldPortModel;
}

export function UnionTypeTreeWidget(props: UnionTypeTreeWidgetProps) {
    const {
        id,
        engine,
        context,
        typeName,
        typeIdentifier,
        typeDef,
        valueLabel,
        hasInvalidTypeCast,
        innermostExpr,
        typeCastExpr,
        unionTypeInfo,
        getPort
    } = props;
    const { typeNames, resolvedTypeName } = unionTypeInfo;
    const ioNodesStyles = useIONodesStyles();
    const unionTypeNodeStyles = useUnionTypeNodeStyles();
    const [portState, setPortState] = useState<PortState>(PortState.Unselected);
    const [isHovered, setIsHovered] = useState(false);
    const [isModifyingTypeCast, setIsModifyingTypeCast] = useState(false);

    const portIn = getPort(`${id}.IN`);

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    const getUnionType = () => {
        const typeText: JSX.Element[] = [];
        typeNames.forEach((type) => {
            if (type.trim() === resolvedTypeName) {
                typeText.push(<span className={ioNodesStyles.boldedTypeLabel}>{type}</span>);
            } else {
                typeText.push(<>{type}</>);
            }
            if (type !== typeNames[typeNames.length - 1]) {
                typeText.push(<> | </>);
            }
        });
        return typeText;
    };

    const label = (
        <TruncatedLabel style={{ marginRight: "auto" }}>
            <span style={{ marginRight: "auto" }}>
                {valueLabel && (
                    <span className={ioNodesStyles.valueLabel}>
                        <OutputSearchHighlight>{valueLabel}</OutputSearchHighlight>
                        {typeName && ":"}
                    </span>
                )}
                <span className={ioNodesStyles.outputTypeLabel}>
                    {getUnionType()}
                </span>
            </span>
        </TruncatedLabel>
    );

    const getTargetPositionForReInitWithTypeCast = () => {
        const rootValueExpr = unionTypeInfo.valueExpr.expression;
        const valueExpr: STNode = STKindChecker.isLetExpression(rootValueExpr)
            ? getExprBodyFromLetExpression(rootValueExpr)
            : rootValueExpr;

        return valueExpr.position;
    }

    const getTargetPositionForWrapWithTypeCast = () => {
        const rootValueExpr = unionTypeInfo.valueExpr.expression;
        const valueExpr: STNode = STKindChecker.isLetExpression(rootValueExpr)
            ? getExprBodyFromLetExpression(rootValueExpr)
            : rootValueExpr;
        const valueExprPosition: NodePosition = valueExpr.position;

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
        setIsModifyingTypeCast(true)
        try {
            const name = getTypeName(type);
            const modification: STModification[] = [];
            if (shouldReInitialize) {
                const defaultValue = getDefaultValue(type.typeName);
                const targetPosition = getTargetPositionForReInitWithTypeCast();
                modification.push(getModification(`<${name}>${defaultValue}`, targetPosition));
            } else {
                const targetPosition = getTargetPositionForWrapWithTypeCast();
                modification.push(getModification(`<${name}>`, targetPosition));
            }
            await context.applyModifications(modification);
        } finally {
            setIsModifyingTypeCast(false);
        }
    };

    const getTypedElementMenuItems = () => {
        const menuItems: ValueConfigMenuItem[] = [];
        const supportedTypes = getSupportedUnionTypes(unionTypeInfo.unionType);

        for (const member of unionTypeInfo.unionType.members) {
            const memberTypeName = getTypeName(member);
            if (!supportedTypes.includes(memberTypeName) || isAnydataType(memberTypeName)) {
                continue;
            }
            const isResolvedType = memberTypeName === resolvedTypeName;
            if (unionTypeInfo.isResolvedViaTypeCast) {
                if (!isResolvedType) {
                    menuItems.push({
                        title: `Change type cast to ${memberTypeName}`,
                        onClick: () => handleWrapWithTypeCast(member, false),
                        level: 2,
                        warningMsg: INCOMPATIBLE_CASTING_WARNING
                    });
                }
            } else if (supportedTypes.length > 1) {
                if (isResolvedType) {
                    menuItems.push({
                        title: `Cast type as ${memberTypeName}`,
                        onClick: () => handleWrapWithTypeCast(member, false),
                        level: 0
                    });
                } else {
                    menuItems.push(
                        {
                            title: `Cast type as ${memberTypeName}`,
                            onClick: () => handleWrapWithTypeCast(member, false),
                            level: 1,
                            warningMsg: INCOMPATIBLE_CASTING_WARNING
                        }, {
                            title: `Re-initialize as ${memberTypeName}`,
                            onClick: () => handleWrapWithTypeCast(member, true),
                            level: 3,
                            warningMsg: CLEAR_EXISTING_MAPPINGS_WARNING
                        }
                    );
                }
            }
        }

        return menuItems.sort((a, b) => (a.level || 0) - (b.level || 0));
    };

    const valConfigMenuItems = unionTypeInfo && getTypedElementMenuItems();
    const supportedUnionTypes = getSupportedUnionTypes(typeDef, typeIdentifier)
        ?.filter(type => !isAnydataType(type)) || [];

    const header: ReactNode = (
        <TreeHeader
            isSelected={portState !== PortState.Unselected}
            id={"recordfield-" + id}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <span className={ioNodesStyles.inPort}>
                {portIn &&
                    <DataMapperPortWidget engine={engine} port={portIn} handlePortState={handlePortState} />
                }
            </span>
            <span className={ioNodesStyles.label}>
                {label}
            </span>
            {unionTypeInfo && resolvedTypeName && (
                <>
                    {isModifyingTypeCast ? (
                        <ProgressRing sx={{ height: '16px', width: '16px' }} />
                    ) : (
                        <ValueConfigMenu menuItems={valConfigMenuItems} portName={portIn?.getName()} />
                    )}
                </>
            )}
        </TreeHeader>
    );

    const typeSelector: ReactNode = (
        <TreeBody>
            <div
                className={unionTypeNodeStyles.selectTypeWrap}
                data-testid={"union-type-selector-list"}
            >
                <div className={unionTypeNodeStyles.warningText}>
                    <div className={unionTypeNodeStyles.warningContainer}>
                        <Codicon name="warning" sx={{ marginRight: "6px" }} iconSx={{ color: "var(--vscode-errorForeground)" }} />
                        <span>{`Types are ambiguous.`}</span>
                    </div>
                    <span>{`Please select a type to continue.`}</span>
                </div>
                <UnionTypeSelector
                    context={context}
                    supportedUnionTypes={supportedUnionTypes}
                    hasInvalidTypeCast={hasInvalidTypeCast}
                    innermostExpr={innermostExpr}
                    typeCastExpr={typeCastExpr}
                    unionTypeInfo={unionTypeInfo}
                />
            </div>
        </TreeBody>
    );

    const incompatibleTypeBanner: ReactNode = (
        <div className={unionTypeNodeStyles.treeContainer}>
            <span className={unionTypeNodeStyles.unsupportedIOBanner}>
                <div className={unionTypeNodeStyles.infoContainer}>
                    <Codicon name="warning" className={unionTypeNodeStyles.warningIcon} />
                    <span className={unionTypeNodeStyles.messageTitle}>Incompatible Union Types Found</span>
                </div>
                <Divider className={unionTypeNodeStyles.divider} />
                <div className={unionTypeNodeStyles.messageBody}>
                    {`The union type ${typeName} is not compatible with the Visual Data Mapper.`}
                    {` Please ensure you are using compatible Record Types or Primitive Types.`}
                </div>
            </span>
        </div>
    );

    return (
        <>
            {supportedUnionTypes.length === 0
                ? incompatibleTypeBanner
                : (
                    <TreeContainer data-testid={"union-type-selector-node"}>
                        {header}
                        {!resolvedTypeName && supportedUnionTypes.length > 0 && typeSelector}
                    </TreeContainer>
                )
            } 
        </>
    );
}
