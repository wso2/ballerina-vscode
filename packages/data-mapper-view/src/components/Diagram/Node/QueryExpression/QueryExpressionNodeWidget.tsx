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
import * as React from 'react';

import { DiagramEngine } from '@projectstorm/react-diagrams';
import classnames from "classnames";

import { DataMapperPortWidget } from '../../Port';
import { expandArrayFn } from "../../utils/dm-utils";

import {
    QueryExpressionNode,
} from './QueryExpressionNode';
import { Button, Codicon, ProgressRing, Tooltip } from '@wso2/ui-toolkit';
import { useIntermediateNodeStyles } from '../../../styles';

export interface QueryExprAsSFVNodeWidgetProps {
    node: QueryExpressionNode;
    engine: DiagramEngine;
}

export function QueryExpressionNodeWidget(props: QueryExprAsSFVNodeWidgetProps) {
    const { node, engine } = props;
    const classes = useIntermediateNodeStyles();

    const [deleteInProgress, setDeleteInProgress] = React.useState(false);

    const deleteQueryLink = async () => {
        setDeleteInProgress(true);
        await node.deleteLink();
    }

    const loadingScreen = (
        <ProgressRing sx={{ height: '16px', width: '16px' }} />
    );

    return (!node.hidden && (
        <>
            {(!!node.sourcePort && !!node.inPort && !!node.outPort) && (
                <div className={classes.root} >
                    <div className={classes.header}>
                        <DataMapperPortWidget engine={engine} port={node.inPort} />
                        <Tooltip content={"Query Expression"} position="bottom">
                            <Codicon name="list-unordered" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                        </Tooltip>
                        <Button
                            appearance="icon"
                            tooltip="Map array elements"
                            onClick={() => expandArrayFn(node)}
                            data-testid={`expand-query-${node?.targetFieldFQN}`}
                        >
                            <Codicon name="export" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                        </Button>
                        {deleteInProgress ? (
                            <div className={classnames(classes.element, classes.loadingContainer)}>
                                {loadingScreen}
                            </div>
                        ) : (
                            <Button
                                appearance="icon"
                                tooltip="Delete"
                                onClick={deleteQueryLink} data-testid={`delete-query-${node?.targetFieldFQN}`}
                            >
                                <Codicon name="trash" iconSx={{ color: "var(--vscode-errorForeground)" }} />
                            </Button>
                        )}
                        <DataMapperPortWidget engine={engine} port={node.outPort} />
                    </div>
                </div>
            )}
        </>
    ));
}
