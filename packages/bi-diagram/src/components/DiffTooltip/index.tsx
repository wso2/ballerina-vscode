/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React from "react";
import styled from "@emotion/styled";
import { Tooltip } from "@wso2/ui-toolkit";
import { FlowNode } from "../../utils/types";
import { getDiffDisplaySource } from "../../utils/diff";
import { DIFF_ADDED_COLOR, DIFF_REMOVED_COLOR } from "../../resources/constants";

const Content = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 360px;
    font-family: monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
`;

const OldText = styled.span`
    color: ${DIFF_REMOVED_COLOR};
    text-decoration: line-through;
`;

const NewText = styled.span`
    color: ${DIFF_ADDED_COLOR};
`;

interface DiffTooltipProps {
    node: FlowNode;
    children: React.ReactNode;
}

/**
 * Hover card for nodes marked "modified" by the review-diff merge: the old source
 * struck through above the new source. Renders children untouched for any other node.
 */
export function DiffTooltip({ node, children }: DiffTooltipProps) {
    if (node?.diffState !== "modified" || !node.diffPreviousText) {
        return <>{children}</>;
    }
    const newText = getDiffDisplaySource(node);
    return (
        <Tooltip
            content={
                <Content>
                    <OldText>{node.diffPreviousText}</OldText>
                    {newText && <NewText>{newText}</NewText>}
                </Content>
            }
            containerSx={{ cursor: "inherit" }}
        >
            {children}
        </Tooltip>
    );
}
