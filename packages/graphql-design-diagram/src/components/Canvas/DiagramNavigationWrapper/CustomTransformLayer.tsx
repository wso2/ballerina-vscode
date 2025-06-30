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

import React, { CSSProperties } from 'react';

import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { LayerModel } from '@projectstorm/react-canvas-core'

export interface TransformLayerWidgetProps {
    layer: LayerModel;
    isNodeFocused?: boolean;
}

// tslint:disable-next-line:no-namespace
namespace S {
    const shared = css`
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      position: absolute;
      pointer-events: none;
      transform-origin: 0 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    `;

    export const DivLayer = styled.div`
      ${shared}
    `;

    export const SvgLayer = styled.svg`
      ${shared}
    `;
}

export class CustomTransformLayerWidget extends React.Component<React.PropsWithChildren<TransformLayerWidgetProps>> {

    constructor(props: TransformLayerWidgetProps) {
        super(props);
        this.state = {};

    }


    getTransform() {
        const model = this.props.layer.getParent();
        return `
			translate(
				${model.getOffsetX()}px,
				${model.getOffsetY()}px)
			scale(
				${model.getZoomLevel() / 100.0}
			)
  	`;
    }

    getTransformStyle(): CSSProperties {
        if (this.props.layer.getOptions().transformed) {
            if (!this.props.isNodeFocused) {
                return {
                    transform: this.getTransform()
                };
            }
            return {
                transform: this.getTransform(),
                transition: 'transform 0.5s ease-in-out'
            };

        }
        return {};
    }

    render() {
        if (this.props.layer.getOptions().isSvg) {
            return <S.SvgLayer style={this.getTransformStyle()}>{this.props.children}</S.SvgLayer>;
        }
        return <S.DivLayer style={this.getTransformStyle()}>{this.props.children}</S.DivLayer>;
    }
}
