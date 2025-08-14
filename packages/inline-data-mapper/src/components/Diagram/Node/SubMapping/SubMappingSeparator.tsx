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

import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { Button, Codicon } from "@wso2/ui-toolkit";

import { useIONodesStyles } from "../../../../components/styles";

interface SubMappingSeparatorProps {
    isOnRootView: boolean;
    onClickAddSubMapping: () => void;
    isLastItem?: boolean;
};

const fadeInZoomIn = keyframes`
    0% {
        opacity: 0;
        transform: scale(0.5);
    }
    100% {
        opacity: 1;
        transform: scale(1);
    }
`;

const zoomIn = keyframes`
    0% {
        transform: scale(0.9);
    }
    100% {
        transform: scale(1.2);
    }
`;

const HoverButton = styled(Button)`
    animation: ${fadeInZoomIn} 0.2s ease-out forwards;
    &:hover {
        animation: ${zoomIn} 0.2s ease-out forwards;
    };
`;

export function SubMappingSeparator(props: SubMappingSeparatorProps) {
    const { isOnRootView, onClickAddSubMapping, isLastItem } = props;
    const classes = useIONodesStyles();
    const [isHoveredSeperator, setIsHoveredSeperator] = useState(false);

    const handleMouseEnter = () => {
        setIsHoveredSeperator(true);
    };

    const handleMouseLeave = () => {
        setIsHoveredSeperator(false);
    };

    return (
        <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={classes.subMappingItemSeparator}
        >
            {isHoveredSeperator && !isLastItem && isOnRootView && (
                <HoverButton
                    appearance="icon"
                    tooltip="Add another sub mapping here"
                    className={classes.addAnotherSubMappingButton}
                    onClick={onClickAddSubMapping}
                >
                    <Codicon name="add" iconSx={{ fontSize: 10 }} />
                </HoverButton>
            )}
        </div>
    );
};
