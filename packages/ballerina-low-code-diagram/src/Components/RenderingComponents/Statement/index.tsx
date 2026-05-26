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
import React from 'react'

import { LocalVarDecl, STKindChecker, STNode } from "@wso2/syntax-tree";

import { isVarTypeDescriptor } from '../../../Utils';
import { EndpointViewState, StatementViewState } from '../../../ViewState';
import { ActionInvocation } from '../ActionInvocation';
import { Connector } from "../Connector";
import { DataProcessor } from '../Processor';
import { Respond } from "../Respond";

import "./style.scss";


export interface StatementProps {
    model: STNode;
}

export function StatementC(props: StatementProps) {
    const { model } = props;

    const statements: React.ReactNode[] = [];
    let externalConnector: React.ReactNode = null;

    if (STKindChecker.isLocalVarDecl(model)
        || STKindChecker.isAssignmentStatement(model)
        || STKindChecker.isActionStatement(model)) {
        const clientInit: LocalVarDecl = model as LocalVarDecl;
        const viewState: StatementViewState = clientInit.viewState;
        const epViewState: EndpointViewState = viewState.endpoint;
        if (viewState.isCallerAction) {
            statements.push(
                <g>
                    <Respond model={model} />
                </g>
            );
        } else if (viewState.isAction || viewState.isEndpoint) {
            if (viewState.isAction && !viewState.collapsed) {
                statements.push(
                    <ActionInvocation model={clientInit} />
                );

                if (epViewState.isExternal || epViewState.isParameter) {
                    externalConnector = (
                        <Connector
                            model={model}
                            x={epViewState.lifeLine.cx}
                            y={epViewState.lifeLine.cy}
                            h={epViewState.lifeLine.h}
                            connectorName={viewState.action.endpointName}
                        />
                    );
                }
            }

            if (viewState.isEndpoint && viewState.endpoint.epName) {
                statements.push(
                    <Connector
                        model={model}
                        x={epViewState.lifeLine.cx}
                        y={epViewState.lifeLine.cy}
                        h={epViewState.lifeLine.h}
                        connectorName={viewState.endpoint.epName}
                    />
                );
            }
        } else if ((!viewState.isEndpoint || isVarTypeDescriptor(model)) && !viewState.collapsed) {
            statements.push(
                <g>
                    <DataProcessor model={model} />
                </g>
            );
        }
    } else if (model.kind === "CallStatement" && model.viewState.isCallerAction) {
        // todo check assigment
        statements.push(
            <g>
                <Respond model={model} />
            </g>
        );
    } else if (!STKindChecker.isObjectMethodDefinition(model)) {
        statements.push(
            <g>
                <DataProcessor model={model} />
            </g>
        );
    }

    return (
        <g>
            {externalConnector}
            <g>
                {statements}
            </g>
        </g>
    );
}

export const Statement = StatementC;
