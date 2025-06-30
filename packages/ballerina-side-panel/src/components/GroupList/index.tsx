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

import React, { useState } from "react";
import { Codicon, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { CallIcon, LogIcon } from "../../resources";
import { Category, Node } from "./../NodeList/types";
import { stripHtmlTags } from "../Form/utils";

namespace S {
    export const Card = styled.div<{}>`
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-start;
        gap: 8px;
        width: 100%;
        padding: 8px 0;
        border-radius: 5px;
        background-color: ${ThemeColors.SURFACE_DIM_2};
    `;

    export const Row = styled.div<{}>`
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
        margin-bottom: 4px;
        width: 100%;
    `;

    export const TitleRow = styled(Row)<{}>`
        cursor: pointer;
        padding: 0 5px;
    `;

    export const Title = styled.div<{}>`
        font-size: 13px;
    `;

    export const BodyText = styled.div<{}>`
        font-size: 11px;
        opacity: 0.5;
        padding: 0 8px;
    `;

    export const Grid = styled.div<{ columns: number }>`
        display: grid;
        grid-template-columns: repeat(${({ columns }) => columns}, 1fr);
        gap: 8px;
        width: 100%;
        margin-top: 8px;
        padding: 0 8px;
    `;

    export const CardAction = styled.div<{}>`
        padding: 0 8px;
        margin-left: auto;
    `;

    export const Component = styled.div<{ enabled?: boolean; expanded?: boolean }>`
        display: flex;
        flex-direction: row;
        gap: 5px;
        padding: 7px 5px;
        border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
        border-radius: 5px;
        height: ${({ expanded }) => (expanded ? "auto" : "36px")};
        min-height: 36px;
        cursor: ${({ enabled }) => (enabled ? "pointer" : "not-allowed")};
        font-size: 14px;
        transition: all 0.3s ease;
        ${({ enabled }) => !enabled && "opacity: 0.5;"}
        ${({ expanded }) =>
            expanded &&
            `
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border: 1px solid ${ThemeColors.PRIMARY};
            background-color: ${ThemeColors.PRIMARY_CONTAINER};
            z-index: 10;
            position: relative;
        `}
        &:hover {
            ${({ enabled }) =>
                enabled &&
                `
        background-color: ${ThemeColors.PRIMARY_CONTAINER};
        border: 1px solid ${ThemeColors.PRIMARY};
    `}
        }
    `;

    export const ComponentContent = styled.div<{ expanded?: boolean }>`
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: ${({ expanded }) => (expanded ? "normal" : "nowrap")};
        width: 280px;
        word-break: ${({ expanded }) => (expanded ? "normal" : "break-all")};
        overflow-wrap: break-word;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        gap: 2px;
    `;

    export const CardIcon = styled.div<{ expanded?: boolean }>`
        padding: 0 8px;
        display: flex;
        justify-content: center;
        align-items: center;
        & svg {
            height: 16px;
            width: 16px;
            fill: ${ThemeColors.ON_SURFACE};
            stroke: ${ThemeColors.ON_SURFACE};
        }
    `;

    export const ComponentIcon = styled(CardIcon)`
        height: 24px;
    `;

    export const ComponentTitle = styled.div<{}>`
        color: ${ThemeColors.ON_SURFACE};
    `;

    export const ComponentDescription = styled.div<{}>`
        color: ${ThemeColors.ON_SURFACE_VARIANT};
    `;
}

interface GroupListProps {
    category: Category;
    expand?: boolean;
    onSelect: (node: Node, category: string) => void;
}

export function GroupList(props: GroupListProps) {
    const { category, expand, onSelect } = props;

    const [showList, setShowList] = useState(expand ?? false);
    const [expandedTitleIndex, setExpandedTitleIndex] = useState<number | null>(null);

    const nodes = category.items as Node[];
    const openList = expand || showList;

    const handleToggleList = () => {
        setShowList(!showList);
    };

    const handleComponentMouseEnter = (index: number) => {
        setExpandedTitleIndex(index);
    };

    const handleComponentMouseLeave = () => {
        setExpandedTitleIndex(null);
    };

    if (nodes.length === 0) {
        return null;
    }

    return (
        <S.Card>
            <S.TitleRow onClick={handleToggleList}>
                <S.CardIcon>{category.icon || <LogIcon />}</S.CardIcon>
                <S.Title>{category.title}</S.Title>
                <S.CardAction>
                    {openList ? <Codicon name={"chevron-up"} /> : <Codicon name={"chevron-down"} />}
                </S.CardAction>
            </S.TitleRow>
            {openList && (
                <>
                    <S.BodyText>{category.description}</S.BodyText>
                    <S.Grid columns={1}>
                        {nodes
                            .filter((node) => node.enabled)
                            .map((node, index) => (
                                <S.Component
                                    key={node.id + index}
                                    enabled={node.enabled}
                                    expanded={expandedTitleIndex === index}
                                    onClick={() => onSelect(node, category.title)}
                                    onMouseEnter={() => handleComponentMouseEnter(index)}
                                    onMouseLeave={handleComponentMouseLeave}
                                >
                                    <S.ComponentIcon expanded={expandedTitleIndex === index}>
                                        {node.icon || <CallIcon />}
                                    </S.ComponentIcon>
                                    <S.ComponentContent expanded={expandedTitleIndex === index}>
                                        <S.ComponentTitle>{getComponentTitle(node)}</S.ComponentTitle>
                                        {expandedTitleIndex === index && (
                                            <S.ComponentDescription>
                                                {getComponentDescription(node)}
                                            </S.ComponentDescription>
                                        )}
                                    </S.ComponentContent>
                                </S.Component>
                            ))}
                    </S.Grid>
                </>
            )}
        </S.Card>
    );
}

export default GroupList;

function getComponentTitle(node: Node) {
    if (node.id === "RESOURCE_ACTION_CALL" && node.description) {
        return stripHtmlTags(node.description);
    }

    return stripHtmlTags(node.label);
}

function getComponentDescription(node: Node) {
    if (node.id === "RESOURCE_ACTION_CALL") {
        return "";
    }

    return stripHtmlTags(node.description);
}
