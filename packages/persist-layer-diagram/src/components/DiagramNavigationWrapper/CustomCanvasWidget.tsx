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

// tslint:disable: jsx-no-lambda jsx-no-multiline-js no-unused-expression
import * as React from 'react';

import styled from '@emotion/styled';
import { CanvasEngine, SmartLayerWidget } from '@projectstorm/react-canvas-core'

import { CustomTransformLayerWidget } from "./CustomTransformLayer";

export interface DiagramProps {
    engine: CanvasEngine;
    className?: string;
    isNodeFocused?: boolean;
}

// tslint:disable-next-line:no-namespace
namespace S {
    export const Canvas = styled.div`
      position: relative;
      cursor: move;
      overflow: hidden;
    `;
}

export class CustomCanvasWidget extends React.Component<DiagramProps> {
    ref: React.RefObject<HTMLDivElement>;
    keyUp: any;
    keyDown: any;
    canvasListener: any;
    selectedNode: any

    constructor(props: DiagramProps) {
        super(props);

        this.ref = React.createRef();
        this.state = {
            action: null,
            diagramEngineListener: null
        };
    }

    componentWillUnmount() {
        this.props.engine.deregisterListener(this.canvasListener);
        this.props.engine.setCanvas(null);

        document.removeEventListener('keyup', this.keyUp);
        document.removeEventListener('keydown', this.keyDown);
    }

    registerCanvas() {
        this.props.engine.setCanvas(this.ref.current);
        this.props.engine.iterateListeners(list => {
            list.rendered && list.rendered();
        });
    }

    componentDidUpdate() {
        this.registerCanvas();
    }

    componentDidMount() {
        this.canvasListener = this.props.engine.registerListener({
            repaintCanvas: () => {
                this.forceUpdate();
            }
        });

        this.keyDown = (event: any) => {
            this.props.engine.getActionEventBus().fireAction({ event });
        };
        this.keyUp = (event: any) => {
            this.props.engine.getActionEventBus().fireAction({ event });
        };

        document.addEventListener('keyup', this.keyUp);
        document.addEventListener('keydown', this.keyDown);
        this.registerCanvas();
    }

    render() {
        const engine = this.props.engine;
        const model = engine.getModel();

        return (
            <S.Canvas
                className={this.props.className}
                ref={this.ref}
                onWheel={event => {
                    this.props.engine.getActionEventBus().fireAction({ event });
                }}
                onMouseDown={event => {
                    this.props.engine.getActionEventBus().fireAction({ event });
                }}
                onMouseUp={event => {
                    this.props.engine.getActionEventBus().fireAction({ event });
                }}
                onMouseMove={event => {
                    this.props.engine.getActionEventBus().fireAction({ event });
                }}
                onTouchStart={event => {
                    this.props.engine.getActionEventBus().fireAction({ event });
                }}
                onTouchEnd={event => {
                    this.props.engine.getActionEventBus().fireAction({ event });
                }}
                onTouchMove={event => {
                    this.props.engine.getActionEventBus().fireAction({ event });
                }}
            >
                {model.getLayers().map(layer => {
                    return (
                        <CustomTransformLayerWidget
                            layer={layer}
                            key={layer.getID()}
                            isNodeFocused={this.props.isNodeFocused}
                        >
                            <SmartLayerWidget layer={layer} engine={this.props.engine} key={layer.getID()} />
                        </CustomTransformLayerWidget>
                    );
                })}
            </S.Canvas>
        );
    }
}
