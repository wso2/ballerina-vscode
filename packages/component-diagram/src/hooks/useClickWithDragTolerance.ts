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

import React from "react";

/**
 * Custom hook to detect clicks vs drags
 * Returns handlers for onMouseDown and onMouseUp that will trigger
 * the provided callback only if the mouse moved less than the threshold
 * 
 * @param onClick - Callback to execute on click
 * @param threshold - Maximum distance in pixels to consider as a click (default: 5)
 */
export function useClickWithDragTolerance(onClick: () => void, threshold: number = 5) {
    const mouseDownRef = React.useRef<{ x: number; y: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        mouseDownRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!mouseDownRef.current) return;
        
        const deltaX = Math.abs(e.clientX - mouseDownRef.current.x);
        const deltaY = Math.abs(e.clientY - mouseDownRef.current.y);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // If mouse moved less than threshold, treat it as a click
        if (distance < threshold) {
            onClick();
        }
        
        mouseDownRef.current = null;
    };

    return { handleMouseDown, handleMouseUp };
}

