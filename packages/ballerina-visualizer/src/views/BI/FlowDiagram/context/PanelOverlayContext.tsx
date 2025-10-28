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

import React, { createContext, useState, useCallback, ReactNode } from "react";

export interface PanelOverlayConfig {
    id: string;
    title: string;
    content: ReactNode;
    onClose?: () => void;
    onBack?: () => void;
    width?: number;
}

interface PanelOverlayContextValue {
    overlays: PanelOverlayConfig[];
    openOverlay: (config: Omit<PanelOverlayConfig, "id">) => string;
    closeOverlay: (id: string) => void;
    closeTopOverlay: () => void;
    updateOverlay: (id: string, updates: Partial<Omit<PanelOverlayConfig, "id">>) => void;
    clearAllOverlays: () => void;
}

export const PanelOverlayContext = createContext<PanelOverlayContextValue | undefined>(undefined);

interface PanelOverlayProviderProps {
    children: ReactNode;
}

export function PanelOverlayProvider({ children }: PanelOverlayProviderProps) {
    const [overlays, setOverlays] = useState<PanelOverlayConfig[]>([]);

    const openOverlay = useCallback((config: Omit<PanelOverlayConfig, "id">) => {
        const id = `overlay-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const newOverlay: PanelOverlayConfig = { ...config, id };

        setOverlays((prev) => [...prev, newOverlay]);
        return id;
    }, []);

    const closeOverlay = useCallback((id: string) => {
        setOverlays((prev) => {
            const overlay = prev.find((o) => o.id === id);
            if (overlay?.onClose) {
                overlay.onClose();
            }
            return prev.filter((o) => o.id !== id);
        });
    }, []);

    const closeTopOverlay = useCallback(() => {
        setOverlays((prev) => {
            if (prev.length === 0) return prev;
            const topOverlay = prev[prev.length - 1];
            if (topOverlay.onClose) {
                topOverlay.onClose();
            }
            return prev.slice(0, -1);
        });
    }, []);

    const updateOverlay = useCallback((id: string, updates: Partial<Omit<PanelOverlayConfig, "id">>) => {
        setOverlays((prev) =>
            prev.map((overlay) => (overlay.id === id ? { ...overlay, ...updates } : overlay))
        );
    }, []);

    const clearAllOverlays = useCallback(() => {
        setOverlays([]);
    }, []);

    const value: PanelOverlayContextValue = {
        overlays,
        openOverlay,
        closeOverlay,
        closeTopOverlay,
        updateOverlay,
        clearAllOverlays,
    };

    return <PanelOverlayContext.Provider value={value}>{children}</PanelOverlayContext.Provider>;
}
