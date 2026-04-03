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

import { css, Global, keyframes } from "@emotion/react";
import styled from "@emotion/styled";

const drawBox = keyframes`
    0% {
        stroke-dasharray: 32;
        stroke-dashoffset: 32;
        opacity: 0.3;
    }
    50% {
        stroke-dasharray: 32;
        stroke-dashoffset: 0;
        opacity: 1;
    }
    100% {
        stroke-dasharray: 32;
        stroke-dashoffset: 0;
        opacity: 0.3;
    }
`;

const animationStyles = css`
    .setup-box-1 { animation: ${drawBox} 1s ease-in-out infinite; animation-delay: 0s; }
    .setup-box-2 { animation: ${drawBox} 1s ease-in-out infinite; animation-delay: 0.4s; }
    .setup-box-3 { animation: ${drawBox} 1s ease-in-out infinite; animation-delay: 0.8s; }
`;

const IconWrapper = styled.div`
    width: 72px;
    height: 72px;
    color: var(--vscode-contrastBorder, var(--vscode-button-background));

    svg {
        width: 100%;
        height: 100%;
    }
`;

export function DiagramAnimation() {
    return (
        <IconWrapper>
            <Global styles={animationStyles} />
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                {/* Connecting lines */}
                <line x1="40" y1="30" x2="60" y2="30" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                <line x1="30" y1="40" x2="50" y2="55" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                <line x1="70" y1="40" x2="50" y2="55" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                {/* Box 1 — top-left */}
                <rect className="setup-box-1" x="20" y="20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" rx="2" />
                {/* Box 2 — top-right */}
                <rect className="setup-box-2" x="60" y="20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" rx="2" />
                {/* Box 3 — bottom-center */}
                <rect className="setup-box-3" x="40" y="55" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" rx="2" />
            </svg>
        </IconWrapper>
    );
}
