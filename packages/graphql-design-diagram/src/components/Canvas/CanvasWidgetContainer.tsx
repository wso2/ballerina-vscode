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
// tslint:disable: no-implicit-dependencies jsx no-var-requires
import React from "react";

import styled from "@emotion/styled";

const headerHeight = 84;

export const Container: React.FC<any> = styled.div`
  // should take up full height minus the height of the header
  height: calc(100vh - ${headerHeight}px);
  background-image: radial-gradient(circle at 0.5px 0.5px, var(--vscode-textBlockQuote-border) 1px, transparent 0);
  background-color: var(--vscode-input-background);
  background-size: 8px 8px;
  display: flex;
  font-family: 'GilmerRegular';

  > * {
    height: 100%;
    min-height: 100%;
    width: 100%;
  }
  svg:not(:root) {
    overflow: visible;
  }
`;

export class CanvasWidgetContainer extends React.Component<React.PropsWithChildren> {
    render() {
        return (
            <Container data-testid="graphql-canvas-widget-container">
                {this.props.children}
            </Container>
        );
    }
}
