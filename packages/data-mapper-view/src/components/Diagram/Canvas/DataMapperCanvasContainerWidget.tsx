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
// tslint:disable: no-var-requires
import * as React from 'react';

import { css, Global } from '@emotion/react';
import styled from '@emotion/styled';

export const Container = styled.div`
	// should take up full height minus the height of the header
	height: calc(100% - 50px);
	background-image: radial-gradient(var(--vscode-editor-inactiveSelectionBackground) 10%, transparent 0px);
  	background-size: 16px 16px;
	background-color: var(--vscode-editor-background);
	display: ${(props: { hidden: any; }) => (props.hidden ? 'none' : 'flex')};
	font-weight: 400;
	> * {
		height: 100%;
		min-height: 100%;
		width: 100%;
	}
`;

export const Expand = css`
	html,
	body,
	#root {
		height: 100%;
	}
`;

export interface DataMapperCanvasContainerProps {
    hideCanvas: boolean;
    children?: React.ReactNode;
}

export function DataMapperCanvasContainerWidget({ hideCanvas, children }: DataMapperCanvasContainerProps) {
    return (
        <>
            <Global styles={Expand} />
            <Container hidden={hideCanvas}>
                {children}
            </Container>
        </>
    );
}
