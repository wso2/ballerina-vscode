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
import React from "react";
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { Button, Codicon, ProgressRing } from '@wso2/ui-toolkit';
import classnames from 'classnames';

import { useIntermediateNodeStyles } from '../../../styles';
import { ClauseConnectorNode } from './ClauseConnectorNode';
import { renderPortWidget } from "../LinkConnector/LinkConnectorWidgetComponents";
import { DiagnosticWidget } from "../../Diagnostic/DiagnosticWidget";
import { useDMExpressionBarStore, useDMQueryClausesPanelStore } from "../../../../store/store";

export interface ClauseConnectorNodeWidgetProps {
    node: ClauseConnectorNode;
    engine: DiagramEngine;
}

export function ClauseConnectorNodeWidget(props: ClauseConnectorNodeWidgetProps) {
    const { node, engine } = props;

    const classes = useIntermediateNodeStyles();
    const setExprBarFocusedPort = useDMExpressionBarStore(state => state.setFocusedPort);

    const diagnostic = node.hasError() ? node.diagnostics[0] : null;
    const value = node.value;

    const setIsQueryClausesPanelOpen = useDMQueryClausesPanelStore(state => state.setIsQueryClausesPanelOpen);
    const onClickOpenClausePanel = () => {
        setIsQueryClausesPanelOpen(true);
    };

    const onClickEdit = () => {
        const targetPort = node.targetMappedPort;
        setExprBarFocusedPort(targetPort);
    };

    return (
            <div className={classes.root} data-testid={`clause-connector-node-${node?.value}`}>
                <div className={classes.header}>
                    {renderPortWidget(engine, node.inPort, `${node?.value}-input`)}
                    <Button
                        appearance="icon"
                        tooltip="Map clause elements"
                        onClick={onClickOpenClausePanel}
                        data-testid={`expand-clause-fn-${node?.targetMappedPort?.attributes.fieldFQN}`}
                    >
                        <Codicon name="filter-filled" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                    </Button>
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
    );
}
