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

import { keyframes } from "@emotion/css";
import styled from "@emotion/styled";

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

export const Spinner = styled.span`
    display: inline-block;
    margin-right: 8px;
    font-size: 14px;
    animation: ${spin} 1s linear infinite;
`;

const CheckIcon = styled.span`
    display: inline-block;
    margin-right: 8px;
    font-size: 14px;
`;

const ProgressContainer = styled.div`
    display: flex;
    align-items: center;
    padding-left: 16px;
    padding-top: 2px;
    padding-bottom: 2px;
`;

interface ProgressTextSegmentProps {
    text: string;
    loading: boolean;
    failed?: boolean;
}

const ProgressTextSegment: React.FC<ProgressTextSegmentProps> = ({ text, loading, failed }) => {
    return (
        <ProgressContainer>
            {loading ? (
                <Spinner
                    className="codicon codicon-loading spin"
                    role="img"
                ></Spinner>
            ) : (
                <CheckIcon
                    className={`codicon ${failed ? 'codicon-chrome-close' : 'codicon-check'}`}
                    role="img"
                ></CheckIcon>
            )}
            <span>{text}</span>
        </ProgressContainer>
    );
};

export default ProgressTextSegment;
