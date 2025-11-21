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
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { Button, Codicon, ProgressRing } from '@wso2/ui-toolkit';
import classnames from 'classnames';

import { useIntermediateNodeStyles } from '../../../styles';
import { QueryExprConnectorNode } from './QueryExprConnectorNode';
import { renderDeleteButton, renderEditButton, renderPortWidget } from "../LinkConnector/LinkConnectorWidgetComponents";
import { DiagnosticWidget } from "../../Diagnostic/DiagnosticWidget";
import { expandArrayFn } from "../../utils/common-utils";
import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore, useDMExpressionBarStore } from "../../../../store/store";

export interface QueryExprConnectorNodeWidgetWidgetProps {
    node: QueryExprConnectorNode;
    engine: DiagramEngine;
}

export function QueryExprConnectorNodeWidget(props: QueryExprConnectorNodeWidgetWidgetProps) {
    const { node, engine } = props;

    const classes = useIntermediateNodeStyles();
    const setExprBarFocusedPort = useDMExpressionBarStore(state => state.setFocusedPort);
    const collapsedFieldsStore = useDMCollapsedFieldsStore();
    const expandedFieldsStore = useDMExpandedFieldsStore();

    const diagnostic = node.hasError() ? node.diagnostics[0] : null;
    const value = node.value;

    const [deleteInProgress, setDeleteInProgress] = useState(false);

    const onClickEdit = () => {
        const targetPort = node.targetMappedPort;
        setExprBarFocusedPort(targetPort);
    };

    const onClickDelete = async () => {
        setDeleteInProgress(true);
        if (node.deleteLink) {
            await node.deleteLink();
        }
        setDeleteInProgress(false);
    };

    const onFocusQueryExpr = () => {
        const sourcePorts = node.sourcePorts.map(port => port.attributes.portName);
        const targetPort = node.targetMappedPort.attributes.portName;

        sourcePorts.forEach((port) => {
            collapsedFieldsStore.removeField(port);
            expandedFieldsStore.removeField(port);
        });
        collapsedFieldsStore.removeField(targetPort);
        expandedFieldsStore.removeField(targetPort);

        const context = node.context;
	    const lastView = context.views[context.views.length - 1];
        const mapping = node.targetMappedPort.attributes.value; 
        expandArrayFn(context, mapping.inputs, mapping.output, lastView.targetField);
    };

    const loadingScreen = (
        <div className={classnames(classes.element, classes.loadingContainer)}>
            <ProgressRing sx={{ height: '16px', width: '16px' }} />
        </div>
    );

    return (!node.hidden && (
            <div className={classes.root} data-testid={`link-connector-node-${node?.value}`}>
                <div className={classes.header}>
                    {renderPortWidget(engine, node.inPort, `${node?.value}-input`)}
                    {renderEditButton(onClickEdit, node?.value)}
                    <Button
                        appearance="icon"
                        tooltip="Map array elements"
                        onClick={onFocusQueryExpr}
                        data-testid={`expand-array-fn-${node?.targetMappedPort?.attributes.fieldFQN}`}
                    >
                        <Codicon name="export" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                    </Button>
                    {deleteInProgress ? (
                        loadingScreen
                    ) : (
                        <>{renderDeleteButton(onClickDelete, node?.value)}</>
                    )}
                    {diagnostic && (
                        <DiagnosticWidget
                            diagnostic={diagnostic}
                            value={value}
                            onClick={onClickEdit}
                            btnSx={{ margin: "0 2px" }}
                        />
                    )}
                    {renderPortWidget(engine, node.outPort, `${node?.value}-output`)}
                </div>
            </div>
        )
    );
}
