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

// tslint:disable: jsx-no-lambda
import React from 'react';

import styled from "@emotion/styled";
import { Codicon, Icon } from '@wso2/ui-toolkit';

import { CanvasControlTooltip } from './CanvasControlTooltip';

interface ContainerControllerProps {
    zoomToFit: () => void;
    onZoom: (zoomIn: boolean) => void;
    onDownload?: () => void;
}

const ControlPanel: React.FC<any> = styled.div`
  bottom: 40px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: space-between;
  position: absolute;
  right: 30px;
  width: 32px;
  height: fit-content;
  min-height: max-content;

  .control-button {
    background-color: white !important;
    border: 1px solid #E0E2E9 !important;
    border-radius: 2px !important;
    height: 32px !important;
    width: 32px !important;
  }
`;


export function ContainerController(props: ContainerControllerProps) {
    const { onZoom, zoomToFit, onDownload } = props;

    return (
        <ControlPanel>
            <CanvasControlTooltip onClick={onDownload} tooltipTitle={'Download'}>
                <Icon
                    name="import"
                    sx={{ height: "fit-content", width: "fit-content" }}
                    iconSx={{ fontWeight: "bolder", fontSize: "20px", color: "var(--vscode-input-placeholderForeground)" }}
                />
            </CanvasControlTooltip>
            <CanvasControlTooltip onClick={zoomToFit} tooltipTitle={'Fit to screen'}>
                <Icon
                    name="fullscreen"
                    sx={{ height: "fit-content", width: "fit-content" }}
                    iconSx={{ fontWeight: "bolder", fontSize: "20px", color: "var(--vscode-input-placeholderForeground)" }}
                />
            </CanvasControlTooltip>
            <div>
                <CanvasControlTooltip onClick={() => { onZoom(true) }} tooltipTitle={'Zoom in'}>
                    <Codicon
                        name="add"
                        iconSx={{ fontWeight: "bolder", fontSize: "20px", color: "var(--vscode-input-placeholderForeground)" }}
                        sx={{ height: "fit-content", width: "fit-content" }}
                    />
                </CanvasControlTooltip>
                <CanvasControlTooltip onClick={() => { onZoom(false) }} tooltipTitle={'Zoom out'}>
                    <Codicon
                        name="remove"
                        iconSx={{ fontWeight: "bolder", fontSize: "20px", color: "var(--vscode-input-placeholderForeground)" }}
                        sx={{ height: "fit-content", width: "fit-content" }}
                    />
                </CanvasControlTooltip>
            </div>
        </ControlPanel>
    )
}
