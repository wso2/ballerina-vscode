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
import { DiagramEngine } from '@projectstorm/react-diagrams';
import * as _ from 'lodash';

import { OverlayLayerModel } from './OverlayLayerModel';
import { OverlayModel } from './OverlayModel/OverlayModel';
import { OverlayWidget } from './OverlayModel/OverlayWidget';

export interface NodeLayerWidgetProps {
	layer: OverlayLayerModel;
	engine: DiagramEngine;
}

export const OverlayContainerID = "data-mapper-overlay-container";

export class OverlayLayerWidget extends React.Component<NodeLayerWidgetProps> {
	render() {
		return (
			<Container id={OverlayContainerID}>
				{_.map(this.props.layer.getOverlayItems(), (node: OverlayModel) => {
					return <OverlayWidget key={node.getID()} diagramEngine={this.props.engine} node={node} />;
				})}
			</Container>
		);
	}
}

export const Container = styled.div``;
