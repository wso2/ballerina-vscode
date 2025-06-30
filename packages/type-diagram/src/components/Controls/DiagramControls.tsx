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

import React from 'react';
import styled from '@emotion/styled';
import { DiagramEngine } from '@projectstorm/react-diagrams';
import { toJpeg } from 'html-to-image';

import { Icon, ThemeColors } from '@wso2/ui-toolkit';

interface ControlProps {
    engine: DiagramEngine;
    refreshDiagram: () => void;
    showProblemPanel: () => void;
}

namespace ControlsStyles {
    export const Container = styled.div`
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 8px;

        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 1000;
    `;

    export const GroupContainer = styled.div`
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 0;

        & > *:not(:last-child) {
            border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
        }

        & > *:first-child {
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
        }

        & > *:last-child {
            border-top-left-radius: 0;
            border-top-right-radius: 0;
        }

        & > *:not(:first-child):not(:last-child) {
            border-radius: 0;
        }
    `;

    export const Button = styled.div`
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 8px;
        border-radius: 4px;
        background-color: ${ThemeColors.SURFACE};
        fill: ${ThemeColors.ON_SURFACE};
        width: 32px;
        height: 32px;
        cursor: pointer;

        &:hover {
            background-color: ${ThemeColors.SURFACE_CONTAINER};
        }

        &:active {
            background-color: ${ThemeColors.SURFACE_CONTAINER};
        }
    `;
}

export function DiagramControls(props: ControlProps) {
    const { engine, refreshDiagram } = props;

    const downloadDiagram = () => {
        const canvas: HTMLDivElement = engine.getCanvas();
        if (!canvas) {
            return;
        }

        toJpeg(canvas, { cacheBust: true, quality: 0.95, width: canvas.scrollWidth, height: canvas.scrollHeight })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = 'er-diagram.jpeg';
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.log(err.message);
            });
    }

    const onZoom = (zoomIn: boolean) => {
        let delta: number = zoomIn ? +5 : -5;
        engine.getModel().setZoomLevel(engine.getModel().getZoomLevel() + delta);
        engine.repaintCanvas();
    }

    const zoomToFit = () => {
        engine.zoomToFitNodes({ margin: 10, maxZoom: 1 });
    }

    return (
        <ControlsStyles.Container>
            <ControlsStyles.Button onClick={downloadDiagram} title='Download'>
                <Icon name="bi-download" iconSx={{ fontSize: "16px"}}/>
            </ControlsStyles.Button>
            <ControlsStyles.Button onClick={refreshDiagram} title='Refresh'>
                <Icon name="bi-retry" iconSx={{ fontSize: "16px"}}/>
            </ControlsStyles.Button>
            <ControlsStyles.Button onClick={zoomToFit} title='Zoom to fit nodes'>
                <Icon name="bi-fit-screen" iconSx={{ fontSize: "16px"}}/>
            </ControlsStyles.Button>
            <ControlsStyles.GroupContainer>
                <ControlsStyles.Button onClick={() => onZoom(true)} title='Zoom in'>
                    <Icon name="bi-plus" iconSx={{ fontSize: "16px"}}/>
                </ControlsStyles.Button>
                <ControlsStyles.Button onClick={() => onZoom(false)} title='Zoom out'>
                    <Icon name="bi-minus" iconSx={{ fontSize: "16px"}} />
                </ControlsStyles.Button>
            </ControlsStyles.GroupContainer>
        </ControlsStyles.Container>
    )
}
