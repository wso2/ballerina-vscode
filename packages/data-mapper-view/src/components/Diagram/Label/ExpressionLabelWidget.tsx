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
import React from 'react';

import { css } from '@emotion/css';
import { PrimitiveBalType, TypeField, TypeKind } from "@wso2/ballerina-core";
import { FunctionCall, NodePosition, STKindChecker,} from '@wso2/syntax-tree';
import classNames from "classnames";

import { CodeActionWidget } from '../CodeAction/CodeAction';
import { DiagnosticWidget } from '../Diagnostic/Diagnostic';
import { DataMapperLinkModel } from "../Link";
import { generateQueryExpression, ClauseType } from '../Link/link-utils';
import { MappingType, RecordFieldPortModel } from '../Port';
import {
    getBalRecFieldName,
    getFilteredUnionOutputTypes,
    getLocalVariableNames,
    getMappedFnNames,
    getCollectClauseActions,
    getMappingType
} from '../utils/dm-utils';
import { handleCodeActions } from "../utils/ls-utils";

import { ExpressionLabelModel } from './ExpressionLabelModel';
import { Button, Codicon, ProgressRing } from '@wso2/ui-toolkit';
import { QueryExprMappingType } from '../Node';
import { useDMFocusedViewStateStore } from '../../../store/store';
import { canPerformAggregation } from '../utils/type-utils';

export interface EditableLabelWidgetProps {
    model: ExpressionLabelModel;
}

export const useStyles = () => ({
    container: css({
        width: '100%',
        backgroundColor: "var(--vscode-sideBar-background)",
        padding: "2px",
        borderRadius: "2px",
        display: "flex",
        color: "var(--vscode-checkbox-border)",
        alignItems: "center",
        "& > vscode-button > *": {
            margin: "0 2px"
        },
        border: "1px solid var(--vscode-welcomePage-tileBorder)",
    }),
    containerHidden: css({
        visibility: 'hidden',
    }),
    btnContainer: css({
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        "& > *": {
            margin: "0 2px"
        }
    }),
    element: css({
        backgroundColor: 'var(--vscode-input-background)',
        padding: '10px',
        cursor: 'pointer',
        transitionDuration: '0.2s',
        userSelect: 'none',
        pointerEvents: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        '&:hover': {
            filter: 'brightness(0.95)',
        },
    }),
    iconWrapper: css({
        height: '22px',
        width: '22px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    }),
    codeIconButton: css({
        color: 'var(--vscode-checkbox-border)',
    }),
    deleteIconButton: css({
        color: 'var(--vscode-checkbox-border)',
    }),
    separator: css({
        height: 'fit-content',
        width: '1px',
        backgroundColor: 'var(--vscode-editor-lineHighlightBorder)',
    }),
    rightBorder: css({
        borderRightWidth: '2px',
        borderColor: 'var(--vscode-pickerGroup-border)',
    }),
    loadingContainer: css({
        padding: '10px',
    }),
});

export enum LinkState {
    TemporaryLink,
    LinkSelected,
    LinkNotSelected
}

export const AggregationFunctions = ["avg", "count", "max", "min", "sum"];

// now we can render all what we want in the label
export function EditableLabelWidget(props: EditableLabelWidgetProps) {
    const { link, context, value, field, editorLabel, deleteLink } = props.model;

    const [linkStatus, setLinkStatus] = React.useState<LinkState>(LinkState.LinkNotSelected);
    const [mappingType, setMappingType] = React.useState<MappingType>(undefined);
    const [codeActions, setCodeActions] = React.useState([]);
    const [deleteInProgress, setDeleteInProgress] = React.useState(false);

    const focusedViewStore = useDMFocusedViewStateStore();

    const source = link?.getSourcePort()
    const target = link?.getTargetPort()

    const classes = useStyles();
    const diagnostic = link && link.hasError() ? link.diagnostics[0] : null;
    const connectedViaCollectClause = context?.selection.selectedST?.mappingType
        && context.selection.selectedST.mappingType === QueryExprMappingType.A2SWithCollect;

    React.useEffect(() => {
        async function genModel() {
            const actions = (await handleCodeActions(context.filePath, link?.diagnostics, context.langServerRpcClient))
            setCodeActions(actions)
        }

        if (value) {
            void genModel();
        }
    }, [props.model]);

    const onClickDelete = (evt?: React.MouseEvent<HTMLDivElement>) => {
        if (evt) {
            evt.preventDefault();
            evt.stopPropagation();
        }
        setDeleteInProgress(true);
        if (deleteLink) {
            deleteLink();
        }
    };

    const onClickEdit = (evt?: React.MouseEvent<HTMLDivElement>) => {
        const currentReference = (source as RecordFieldPortModel).fieldFQN;
        context.referenceManager.handleCurrentReferences([currentReference]);
        if (evt) {
            evt.preventDefault();
            evt.stopPropagation();
        }
        context.enableStatementEditor({
            valuePosition: field.position as NodePosition,
            value: field.source,
            label: editorLabel
        });
    };

    const applyQueryExpr = (
        linkModel: DataMapperLinkModel,
        targetRecord: TypeField,
        clause: ClauseType,
        isElementAccss?: boolean
    ) => {
        if (linkModel.value
            && (STKindChecker.isFieldAccess(linkModel.value) || STKindChecker.isSimpleNameReference(linkModel.value))) {

                const sourcePort = linkModel.getSourcePort() as RecordFieldPortModel;
                const targetPort = linkModel.getTargetPort() as RecordFieldPortModel;
                
                const isOptionalSource = sourcePort.field.optional;
                let position = linkModel.value.position as NodePosition;

                const expr = targetPort.editableRecordField?.value;
                if (STKindChecker.isSpecificField(expr)) {
                    position = expr.valueExpr.position as NodePosition;
                } else {
                    position = expr.position as NodePosition;
                }

                const localVariables = getLocalVariableNames(context.functionST);

                const querySrc = generateQueryExpression(linkModel.value.source, targetRecord, isOptionalSource,
                    clause, [...localVariables]);
                const modifications = [{
                    type: "INSERT",
                    config: {
                        "STATEMENT": isElementAccss ? `(${querySrc})[0]` : querySrc,
                    },
                    endColumn: position.endColumn,
                    endLine: position.endLine,
                    startColumn: position.startColumn,
                    startLine: position.startLine
                }];
                void context.applyModifications(modifications);
                focusedViewStore.setPortFQNs(sourcePort.fieldFQN, targetPort.fieldFQN);
        }
    };

    React.useEffect(() => {
        if (link && link.isActualLink) {
            link.registerListener({
                selectionChanged(event) {
                    setLinkStatus(event.isSelected ? LinkState.LinkSelected : LinkState.LinkNotSelected);
                },
            });
            const mappingType = getMappingType(source, target);
            setMappingType(mappingType);
        } else {
            setLinkStatus(LinkState.TemporaryLink);
        }
    }, [props.model]);

    const loadingScreen = (
        <ProgressRing sx={{ height: '16px', width: '16px' }} />
    );

    const elements: React.ReactNode[] = [
        (
            <div className={classes.btnContainer}>
                <Button
                    appearance="icon"
                    onClick={onClickEdit}
                    data-testid={`expression-label-edit`}
                    sx={{ userSelect: "none", pointerEvents: "auto" }}
                >
                    <Codicon name="code" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                </Button>
                <div className={classes.separator}/>
                {deleteInProgress ? (
                    loadingScreen
                ) : (
                    <Button
                        appearance="icon"
                        onClick={onClickDelete}
                        data-testid={`expression-label-delete`}
                        sx={{ userSelect: "none", pointerEvents: "auto" }}
                    >
                        <Codicon name="trash" iconSx={{ color: "var(--vscode-errorForeground)" }} />
                    </Button>
                )}
            </div>
        ),
    ];

    const isArrayType = (type: TypeField): boolean => {
        return type.typeName === PrimitiveBalType.Array && !!type.memberType;
    };
    
    const handleArrayType = (
        type: TypeField,
        link: DataMapperLinkModel,
        clauseType: ClauseType,
        isElementAccss?: boolean
    ) => {
        if (isArrayType(type)) {
            applyQueryExpr(link, type.memberType, clauseType, isElementAccss);
        } else if (isElementAccss) {
            applyQueryExpr(link, type, clauseType, isElementAccss);
        }
    };
    
    const onClickConvertToQuery = (isElementAccss?: boolean) => {
        if (!(target instanceof RecordFieldPortModel)) {
            return;
        }
    
        const targetPortField = target.field;

        if (targetPortField.typeName === PrimitiveBalType.Union) {
            const [unionType] = getFilteredUnionOutputTypes(targetPortField);
            handleArrayType(unionType, link, ClauseType.Select, isElementAccss);
        } else {
            handleArrayType(targetPortField, link, ClauseType.Select, isElementAccss);
        }
    };

    const onClickAggregateViaQuery = () => {
        if (!(target instanceof RecordFieldPortModel)) {
            return;
        }

        const targetPortField = target.field;

        if (targetPortField.typeName === PrimitiveBalType.Union) {
            const [type] = getFilteredUnionOutputTypes(targetPortField);
            handleArrayType(type, link, ClauseType.Collect);
        } else {
            handleArrayType(targetPortField, link, ClauseType.Collect);
        }
    };

    const additionalActions = [];
    if (mappingType === MappingType.ArrayToArray) {
        additionalActions.push({
            title: "Convert to Query",
            onClick: onClickConvertToQuery
        });
    } else if (mappingType === MappingType.ArrayToSingleton) {
        const supportsAggregation = canPerformAggregation(target);
        if (supportsAggregation) {
            additionalActions.push({
                title: "Aggregate using Query",
                onClick: onClickAggregateViaQuery
            });
        }
        additionalActions.push({
            title: "Convert to Query and Access Element",
            onClick: () => onClickConvertToQuery(true)
        });
    }

    if (codeActions.length > 0 || additionalActions.length > 0) {
        elements.push(<div className={classes.separator}/>);
        elements.push(
            <CodeActionWidget
                codeActions={codeActions}
                context={context}
                additionalActions={additionalActions}
                btnSx={{ margin: "0 2px" }}
            />
        );
    }

    if (connectedViaCollectClause) {
        const fnNames = getMappedFnNames(target);
        // Getting the 0th element since ExpressionLabelWidget is only used for simple links
        const fnName = fnNames && fnNames[0];
        if (AggregationFunctions.includes(fnName)) {
            const mappedExpr = (target as RecordFieldPortModel)?.editableRecordField?.value;
            const additionalActions = getCollectClauseActions(fnName, mappedExpr as FunctionCall, context.applyModifications);
            elements.push(<div className={classes.separator}/>);
            elements.push(
                <CodeActionWidget
                    context={context}
                    additionalActions={additionalActions}
                    isConfiguration={true}
                    btnSx={{ margin: "0 2px" }}
                />
            );
        }
    }

    if (diagnostic) {
        elements.push(<div className={classes.separator}/>);
        elements.push(
            <DiagnosticWidget
                diagnostic={diagnostic}
                value={value}
                onClick={onClickEdit}
                isLabelElement={true}
                btnSx={{ margin: "0 2px" }}
            />
        );
    }

    let isSourceCollapsed = false;
    let isTargetCollapsed = false;
    const collapsedFields = props.model?.context?.collapsedFields;

    if (source instanceof RecordFieldPortModel) {
        if (source?.parentId) {
            const fieldName = getBalRecFieldName(source.field.name);
            isSourceCollapsed = collapsedFields?.includes(`${source.parentId}.${fieldName}`)
        } else {
            isSourceCollapsed = collapsedFields?.includes(source.portName)
        }
    }

    if (target instanceof RecordFieldPortModel) {
        if (target?.parentId) {
            const fieldName = getBalRecFieldName(target.field.name);
            isTargetCollapsed = collapsedFields?.includes(`${target.parentId}.${fieldName}`)
        } else {
            isTargetCollapsed = collapsedFields?.includes(target.portName)
        }
    }

    const isSourcePortArray = source instanceof RecordFieldPortModel && source?.field.typeName === TypeKind.Array;
    const isTargetPortArray = target instanceof RecordFieldPortModel && target?.field.typeName === TypeKind.Array;

    if (props.model?.valueNode && isSourceCollapsed && isTargetCollapsed && !isSourcePortArray && !isTargetPortArray) {
        // for direct links, disable link widgets if both sides are collapsed
        return null
    } else if (!props.model?.valueNode && ((isSourceCollapsed && !isSourcePortArray) || (isTargetCollapsed && !isTargetPortArray))) {
        // for links with intermediary nodes,
        // disable link widget if either source or target port is collapsed
        return null;
    }

    if (linkStatus === LinkState.TemporaryLink) {
        return (
            <div className={classNames(classes.container, classes.element, classes.loadingContainer)}>
                {loadingScreen}
            </div>
        );
    }

    return (
        <div
            data-testid={`expression-label-for-${link?.getSourcePort()?.getName()}-to-${link?.getTargetPort()?.getName()}`}
            className={classNames(
                classes.container,
                linkStatus === LinkState.LinkNotSelected && !deleteInProgress && !connectedViaCollectClause && classes.containerHidden
            )}
        >
            {elements}
        </div>
    );
}
