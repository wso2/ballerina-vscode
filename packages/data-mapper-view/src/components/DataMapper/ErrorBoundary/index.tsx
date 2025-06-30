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

import ErrorScreen from "./Error";

export interface DataMapperErrorBoundaryProps {
    hasError: boolean;
    children?: React.ReactNode;
}

export class DataMapperErrorBoundaryC extends React.Component<DataMapperErrorBoundaryProps, { hasError: boolean }> {
    state = { hasError: false }

    static getDerivedStateFromProps(props: DataMapperErrorBoundaryProps) {
        return {
            hasError: props.hasError
        };
    }

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
      // tslint:disable: no-console
      console.error(error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return <ErrorScreen />;
      }
      return this.props?.children;
    }
}

export const DataMapperErrorBoundary = DataMapperErrorBoundaryC;
