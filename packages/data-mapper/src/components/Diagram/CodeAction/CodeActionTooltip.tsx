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
import { Icon, Item, Menu, MenuItem, ProgressRing, Tooltip } from "@wso2/ui-toolkit";
import { CodeAction } from "./CodeAction";

interface CodeActionTooltipProps {
    codeActions?: CodeAction[];
    children: React.ReactNode | React.ReactNode[];
}

export const CodeActionTooltipID = "data-mapper-codeaction-tooltip";

export function CodeActionTooltip(props: Partial<CodeActionTooltipProps>) {
    const { codeActions, children } = props;
    const menuItems: React.ReactNode[] = [];

    const getItemElement = (id: string, label: string, iconName: string = "lightbulb", isCodicon?: boolean) => {
        return (
            <div
                key={id}
                style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center'
                }}
            >
                <Icon isCodicon={isCodicon} name={iconName} sx={{ marginRight: '10px' }} />
                {label}
            </div>
        );
    }

    const [actionInProgress, setActionInProgress] = React.useState(false);

    const handleOnClick = async (onClick: () => Promise<void>) => {
        setActionInProgress(true);
        await onClick();
        setActionInProgress(false);
    };

    if (codeActions && codeActions.length > 0) {
        codeActions.forEach((item, index) => {
            const id = `${item.title}-${index}`;
            const menuItem: Item = {
                id: id,
                label: getItemElement(id, item.title, item.icon, item.isCodicon),
                onClick: () => handleOnClick(item.onClick)
            }
            menuItems.push(
                <MenuItem
                    key={id}
                    sx={{ pointerEvents: "auto", userSelect: "none" }}
                    item={menuItem}
                    data-testid={`code-action-additional-${index}`}
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
        actionInProgress ? (
            <ProgressRing
                sx={{ height: '16px', width: '16px' }}
                color="var(--vscode-debugIcon-breakpointDisabledForeground)"
            />
        ) : (
            <Tooltip
                content={tooltipTitleComponent}
                position="bottom"
                sx={{ padding: 0, fontSize: "12px" }}
            >
                {children}
            </Tooltip>
        )
    );
}
