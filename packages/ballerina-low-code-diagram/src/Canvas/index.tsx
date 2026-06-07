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

import './style.scss';

export interface CanvasProps {
    children?: React.ReactElement | React.ReactElement[],
    w: number,
    h: number
}

export function Canvas(props: CanvasProps) {
    const { children, w, h } = props;

    return (
        <div className="diagram-canvas-wrap">
            <svg
                data-testid="diagram-canvas"
                className="diagram-canvas"
                preserveAspectRatio={"xMinYMin"}
                width={w}
                height={'calc(100vh - 98px)'}
                style={{overflow: 'visible'}}
            >
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="0"
                        refY="3.5"
                        orient="auto"
                        fill="#5567d5"
                    >
                        <polygon points="0 0, 7 3.5, 0 7" />
                    </marker>
                </defs>
                <g>
                    {children}
                </g>
                <g className="diagram-overlay" />
            </svg >
        </div>
    );
};

