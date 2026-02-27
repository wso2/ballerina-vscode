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

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_HIDE_DELAY_MS = 200;

/**
 * Hook for hover-revealed UI (e.g. tooltips) that stay visible when moving the cursor
 * from the trigger to the content. Hiding is delayed so the user can reach the tooltip.
 *
 * @param hideDelayMs - Delay in ms before hiding after pointer leaves (default 200)
 * @returns [isVisible, hoverHandlers] - spread hoverHandlers on both trigger and tooltip
 */
export function useHoverWithDelay(hideDelayMs: number = DEFAULT_HIDE_DELAY_MS) {
    const [isVisible, setIsVisible] = useState(false);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearHideTimeout = useCallback(() => {
        if (hideTimeoutRef.current !== null) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    }, []);

    const scheduleHide = useCallback(() => {
        clearHideTimeout();
        hideTimeoutRef.current = setTimeout(() => setIsVisible(false), hideDelayMs);
    }, [clearHideTimeout, hideDelayMs]);

    const show = useCallback(() => {
        clearHideTimeout();
        setIsVisible(true);
    }, [clearHideTimeout]);

    useEffect(() => () => clearHideTimeout(), [clearHideTimeout]);

    const hoverHandlers = {
        onMouseEnter: show,
        onMouseLeave: scheduleHide,
    };

    return [isVisible, hoverHandlers] as const;
}
