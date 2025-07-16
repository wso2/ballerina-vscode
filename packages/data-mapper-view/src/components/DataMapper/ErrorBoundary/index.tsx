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

import { WarningBanner } from "../Warning/DataMapperWarning";
import { css, keyframes } from "@emotion/css";
import { Typography } from "@wso2/ui-toolkit";
import { ISSUES_URL } from "../utils";

const fadeIn = keyframes`
    from { opacity: 0.5; }
    to { opacity: 1; }
`;

const classes = {
  errorContainer: css({
    display: 'flex',
    flexDirection: 'column',
    opacity: 0.7
  }),
  errorBanner: css({
      borderColor: "var(--vscode-errorForeground)"
  }),
  errorMessage: css({
      zIndex: 1,
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '500px',
      animation: `${fadeIn} 0.5s ease-in-out`
  }),
  errorTitle: css({
    marginTop: "10px"
  })
}

export interface DataMapperErrorBoundaryProps {
    hasError: boolean;
    message?: string;
    children?: React.ReactNode;
}

export class DataMapperErrorBoundaryC extends React.Component<DataMapperErrorBoundaryProps, { hasError: boolean, message: string }> {
    state = { hasError: false, message: "" }

    static getDerivedStateFromProps(props: DataMapperErrorBoundaryProps) {
        return {
            hasError: props.hasError,
            message: props.message
        };
    }

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
      // tslint:disable: no-console
      console.error(error, errorInfo);
    }

    defaultContent = (
      <div className={classes.errorContainer}>
        <Typography variant="body2">
          A problem occurred while rendering the Data Mapper.
        </Typography>
        <Typography variant="body2">
          Please raise an issue with the sample code in our <a href={ISSUES_URL}>issue tracker</a>
        </Typography>
      </div>
    );

    render() {
      if (this.state.hasError) {
        return (
          <div className={classes.errorMessage}>
            <WarningBanner message={(
              this.state.message || this.defaultContent
            )}
            />
          </div>
        );
      }
      return this.props?.children;
    }
}

export const DataMapperErrorBoundary = DataMapperErrorBoundaryC;
