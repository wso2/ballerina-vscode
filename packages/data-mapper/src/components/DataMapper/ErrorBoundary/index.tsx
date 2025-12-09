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
import * as React from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

import ErrorScreen from "./Error";

export interface DataMapperErrorBoundaryProps {
    children: React.ReactNode;
    onClose?: () => void;
    goToSource: () => void;
}

export function DataMapperErrorBoundary(props: DataMapperErrorBoundaryProps) {
    const { children, onClose, goToSource } = props;

    const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
        console.error("Error caught by DataMapperErrorBoundary:", error, errorInfo);
    };

    return (
        <ReactErrorBoundary
            FallbackComponent={(fallbackProps) => <ErrorScreen onClose={onClose} goToSource={goToSource} {...fallbackProps} />}
            onError={handleError}
        >
            {children}
        </ReactErrorBoundary>
    );
}
