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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */

import React from "react";
import styled from "@emotion/styled";

const Bubbles = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-start;

    & > span {
        width: 6px;
        height: 6px;
        margin: 4px 2px;
        border-radius: 50%;
        background-color: var(--vscode-editor-foreground);
        display: inline-block;
        animation: bubble 1s infinite alternate;
    }

    & > span:nth-of-type(2) {
        animation-delay: 0.2s;
    }

    & > span:nth-of-type(3) {
        animation-delay: 0.4s;
    }

    @keyframes bubble {
        0% {
            transform: translateY(3px);
            opacity: 0.7;
        }
        100% {
            transform: translateY(-3px);
            opacity: 1;
        }
    }
`;

const LoadingIndicator: React.FC = () => {
    return (
        <Bubbles>
            <span />
            <span />
            <span />
        </Bubbles>
    );
};

export default LoadingIndicator;
