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
// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import React from "react";

import { Item, Menu, MenuItem, Tooltip } from "@wso2/ui-toolkit";
import { STModification } from "@wso2/ballerina-core";
import { CodeAction, TextDocumentEdit, TextEdit } from "vscode-languageserver-types";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";

interface Props {
    codeActions: CodeAction[];
    context: IDataMapperContext;
    additionalActions?: {
        title: string;
        onClick: () => void;
    }[];
    children: React.ReactNode | React.ReactNode[];
}

export const CodeActionTooltipID = "data-mapper-codeaction-tooltip";

export function CodeActionTooltip(props: Partial<Props>) {
    const { codeActions, context, children, additionalActions } = props;
    const menuItems: React.ReactNode[] = [];
    
    const onCodeActionSelect = (action: CodeAction) => {
        const modifications: STModification[] = [];
        (action.edit?.documentChanges[0] as TextDocumentEdit).edits.forEach(
            (change: TextEdit) => {
                modifications.push({
                    type: "INSERT",
                    config: {
                        STATEMENT: change.newText,
                    },
                    endColumn: change.range.end.character,
                    endLine: change.range.end.line,
                    startColumn: change.range.start.character,
                    startLine: change.range.start.line,
                });
            }
        );
        modifications.sort((a, b) => a.startLine - b.startLine);
        void context.applyModifications(modifications);
    };

    if (additionalActions && additionalActions.length > 0) {
        additionalActions.forEach((item, index) => {
            const menuItem: Item = { id: `${item.title}-${index}`, label: item.title, onClick: item.onClick }
            menuItems.push(
                <MenuItem
                    key={`${item.title}-${index}`}
                    sx={{ pointerEvents: "auto", userSelect: "none" }}
                    item={menuItem}
                    data-testid={`code-action-additional-${index}`}
                />
            );
        });
    }
    if (codeActions) {
        codeActions.forEach((action, index) => {
            const menuItem: Item = { id: index, label: action.title, onClick: () => onCodeActionSelect(action) };
            menuItems.push(
                <MenuItem
                    key={index}
                    sx={{ pointerEvents: "auto", userSelect: "none" }}
                    item={menuItem}
                    data-testid={`code-action-${index}`}
                />
            );
        });
    }


    const tooltipTitleComponent = (
        <Menu sx={{ background: 'none', boxShadow: 'none', padding: 0 }}>
            {menuItems}
        </Menu>
    );

    return (
        <Tooltip
            content={tooltipTitleComponent}
            position="bottom"
            sx={{ padding: 0, fontSize: "12px" }}
        >
            {children}
        </Tooltip>
    )

}
