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
import styled, {StyledComponent} from '@emotion/styled';

type ContainerProps = {
    hidden: boolean;
    children?: React.ReactNode;
};

export const Container = styled.div<ContainerProps>`
	// should take up full height minus the height of the header
	height: calc(100% - 50px);
	background-image: radial-gradient(circle at 0.5px 0.5px, var(--vscode-textBlockQuote-border) 1px, transparent 0);
  	background-size: 8px 8px;
	background-color: var(--vscode-input-background);
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


export class DataMapperCanvasContainerWidget extends React.Component<React.PropsWithChildren<{ hideCanvas: boolean }>> {
	constructor(props: React.PropsWithChildren<{ hideCanvas: boolean }>) {
		super(props);
		this.render = this.render.bind(this);
	}
	render() {
		return (
			<>
				<Global styles={Expand} />
				<Container hidden={this.props.hideCanvas}>
					{this.props.children}
				</Container>
			</>
		);
	}
}
