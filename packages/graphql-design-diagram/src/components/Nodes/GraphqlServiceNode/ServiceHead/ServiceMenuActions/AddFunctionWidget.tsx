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

// tslint:disable: jsx-no-multiline-js jsx-no-lambda jsx-wrap-multiline
import React from "react";

import { GraphqlMutationIcon, GraphqlQueryIcon, GraphqlSubscriptionIcon } from "@wso2/ballerina-core";
import { NodePosition, STKindChecker } from "@wso2/syntax-tree";
import { Item, MenuItem } from "@wso2/ui-toolkit";

import { useGraphQlContext } from "../../../../DiagramContext/GraphqlDiagramContext";
import { FunctionType, Position } from "../../../../resources/model";

interface AddFunctionWidgetProps {
    position: Position;
    functionType: FunctionType;
}

export function AddFunctionWidget(props: AddFunctionWidgetProps) {
    const { position, functionType } = props;
    const { functionPanel, model } = useGraphQlContext();

    const openFunctionPanel = () => {
        if (STKindChecker.isServiceDeclaration(model)) {
            const lastMemberPosition: NodePosition = {
                endColumn: model.closeBraceToken.position.endColumn,
                endLine: model.closeBraceToken.position.endLine,
                startColumn: model.closeBraceToken.position.startColumn,
                startLine: model.closeBraceToken.position.startLine
            };
            if (functionType === FunctionType.QUERY) {
                functionPanel(lastMemberPosition, "GraphqlResource");
            } else if (functionType === FunctionType.MUTATION) {
                functionPanel(lastMemberPosition, "GraphqlMutation");
            } else if (functionType === FunctionType.SUBSCRIPTION) {
                functionPanel(lastMemberPosition, "GraphqlSubscription");
            }
        }
    };

    const popupTitle = () => {
        if (functionType === FunctionType.QUERY) {
            return "Add Query";
        } else if (functionType === FunctionType.MUTATION) {
            return "Add Mutation";
        } else {
            return "Add Subscription";
        }
    };

    const popupIcon = () => {
        if (functionType === FunctionType.QUERY) {
            return <GraphqlQueryIcon />;
        } else if (functionType === FunctionType.MUTATION) {
            return <GraphqlMutationIcon />;
        } else {
            return <GraphqlSubscriptionIcon />;
        }
    };

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                {popupIcon()}
                <div style={{ marginLeft: '5px' }}>
                    {popupTitle()}
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: popupTitle(), label: ItemWithIcon(), onClick: () => openFunctionPanel() };

    return (
        <>
            {position &&
                <MenuItem
                    sx={{ pointerEvents: "auto", userSelect: "none" }}
                    item={menuItem}
                />
            }
        </>
    );
}
