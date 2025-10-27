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

import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { CompletionItem, getIcon, ThemeColors } from "@wso2/ui-toolkit";
import { CompletionsItemEl, CompletionsTag, DescriptionWrapper } from "../styles";

interface CompletionsProps extends React.HTMLAttributes<HTMLDivElement> {
    item: CompletionItem;
    isSelected: boolean;
}

export const CompletionsItem = (props: CompletionsProps) => {
    const { item, ...divProps } = props;

    const completionItemRef = useRef<HTMLDivElement>();

    const getDescriptionOrigin = () => {
        if (!completionItemRef.current) return {
            top: 0, left: 0
        }
        const rect = completionItemRef.current.getBoundingClientRect();
        return ({
            left: rect.left,
            top: rect.top
        })
    }
    return (
        <>
            <CompletionsItemEl
                style={{color: props.isSelected? ThemeColors.ON_PRIMARY : undefined}}
                ref={completionItemRef}
                {...divProps}
            >
                <div style={{
                    display: "flex",
                    gap: "5px"
                }}>
                    {getIcon(item.kind)}
                    {item.label}
                </div>
                <CompletionsTag> {item.tag} </CompletionsTag>
            </CompletionsItemEl>
            {props.isSelected && createPortal(
                <DescriptionWrapper style={{ top: getDescriptionOrigin().top, left: getDescriptionOrigin().left }}>{item.description}</DescriptionWrapper>,
                document.body
            )}
        </>
    )
}