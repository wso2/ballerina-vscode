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
import { Chip } from "../styles";
import { CHIP_TRUE_VALUE } from '../constants';
import { ThemeColors } from "@wso2/ui-toolkit";

export type ChipProps = {
    type: 'variable' | 'property' | 'parameter';
    text: string;
    onClick?: (element: HTMLElement) => void;
    onBlur?: () => void;
    onFocus?: (element: HTMLElement) => void;
    dataElementId?: string; // Add dataElementId prop
}

export const ChipComponent = (props: ChipProps) => {
    const { type, text, onClick, onBlur, onFocus, dataElementId } = props; // Destructure dataElementId
    const chipRef = useRef<HTMLDivElement>(null);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick && chipRef.current) {
            onClick(chipRef.current);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleFocus = () => {
        if (onFocus && chipRef.current) {
            onFocus(chipRef.current);
        }
    };

    if (type === 'variable') {
        return <Chip ref={chipRef} contentEditable={false} tabIndex={0} onClick={handleClick} onMouseDown={handleMouseDown} onFocus={handleFocus} onBlur={onBlur} data-chip={CHIP_TRUE_VALUE} data-element-id={dataElementId}>{text}</Chip>;
    } else if (type === 'property') {
        return <Chip ref={chipRef} contentEditable={false} tabIndex={0} onClick={handleClick} onMouseDown={handleMouseDown} onFocus={handleFocus} onBlur={onBlur} data-chip={CHIP_TRUE_VALUE} data-element-id={dataElementId}>{text}</Chip>;
    } else {
        return (
            <Chip
                ref={chipRef}
                contentEditable={false}
                tabIndex={0}
                onClick={handleClick}
                onMouseDown={handleMouseDown}
                onFocus={handleFocus}
                onBlur={onBlur}
                data-chip={CHIP_TRUE_VALUE}
                data-element-id={dataElementId}
                style={{ backgroundColor: '#70c995', color: ThemeColors.SURFACE_DIM }}
            >
                {/^\$\d+$/.test(text) ? '  ' : text}
            </Chip>
        );

    }
}
