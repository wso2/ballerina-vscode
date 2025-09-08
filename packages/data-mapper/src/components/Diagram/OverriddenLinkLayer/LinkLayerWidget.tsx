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
// tslint:disable: jsx-no-multiline-js no-implicit-dependencies
import * as React from 'react';

import styled from '@emotion/styled';
import { LinkLayerWidgetProps } from '@projectstorm/react-diagrams';
import * as _ from 'lodash';

import { LinkOverayContainerID } from './LinkOverlayPortal';
import { OveriddenLinkWidget } from './LinkWidget';

export class OveriddenLinkLayerWidget extends React.Component<LinkLayerWidgetProps> {
	render() {
		return (
			<>
				{
					// only perform these actions when we have a diagram
					_.map(this.props.layer.getLinks(), (link) => {
						return <OveriddenLinkWidget key={link.getID()} link={link} diagramEngine={this.props.engine} />;
					})
				}
				<LinkOverlayContainer id={LinkOverayContainerID} />
			</>
		);
	}
}


const LinkOverlayContainer = styled.g`
	pointer-events: none;
	&:focus {
		outline: none;
	}
`;
