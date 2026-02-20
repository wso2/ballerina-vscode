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

import React, { useEffect, useState } from 'react';
import { ComponentModel, PersistERModel } from '@wso2/ballerina-core';
import { DiagramEngine, DiagramModel } from '@projectstorm/react-diagrams';
import { ProgressRing, ThemeColors } from '@wso2/ui-toolkit';
import { CMEntity as Entity } from '@wso2/ballerina-core';
import { modelMapper, generateEngine } from './utils';
import { DiagramControls, OverlayLayerModel, PersistDiagramContext, PromptScreen } from './components';
import { ERRONEOUS_MODEL, NO_ENTITIES_DETECTED, dagreEngine } from './resources';
import { DiagramContainer, useStyles } from './utils/CanvasStyles';

import './resources/assets/font/fonts.css';
import { NavigationWrapperCanvasWidget } from "./components/DiagramNavigationWrapper/NavigationWrapperCanvasWidget";

interface PersistDiagramProps {
    getPersistModel: () => Promise<PersistERModel>;
    selectedRecordName: string;
    showProblemPanel: () => void;
    collapsedMode?: boolean;
}

export function PersistDiagram(props: PersistDiagramProps) {
    const { getPersistModel, selectedRecordName, showProblemPanel, collapsedMode: externalCollapsedMode } = props;

    const [diagramEngine] = useState<DiagramEngine>(generateEngine);
    const [diagramModel, setDiagramModel] = useState<DiagramModel>(undefined);
    const [selectedNodeId, setSelectedNodeId] = useState<string>(undefined);
    const [hasDiagnostics, setHasDiagnostics] = useState<boolean>(false);
    const [userMessage, setUserMessage] = useState<string>(undefined);
    const [collapsedMode, setIsCollapsedMode] = useState<boolean>(externalCollapsedMode || false);
    const [focusedNodeId, setFocusedNodeId] = useState<string>(undefined);

    const styles = useStyles();

    useEffect(() => {
        refreshDiagram();
        const nodeId = selectedRecordName ? `$anon/.:0.0.0:${selectedRecordName}` : '';
        if (nodeId !== selectedNodeId) {
            setSelectedNodeId(nodeId);
        }
        setFocusedNodeId(undefined);
    }, [props]);

    useEffect(() => {
        if (externalCollapsedMode !== undefined && externalCollapsedMode !== collapsedMode) {
            setIsCollapsedMode(externalCollapsedMode);
            if (diagramModel) {
                autoDistribute(diagramModel);
            }
        }
    }, [externalCollapsedMode]);

    useEffect(() => {
        if (diagramEngine.getCanvas()) {
            function handleEscapePress(event: KeyboardEvent) {
                if (event.key === 'Escape' && selectedNodeId) {
                    setSelectedNodeId(undefined);
                }
            }
            document.addEventListener('keydown', handleEscapePress);
        }
    }, [diagramModel, diagramEngine.getCanvas()]);

    const refreshDiagram = () => {
        getPersistModel().then(response => {
            const pkgModel: Map<string, ComponentModel> = new Map(Object.entries(response.persistERModel));
            const entities: Map<string, Entity> = new Map(Object.entries(pkgModel.get('entities')));
            setHasDiagnostics(response.diagnostics.length > 0);
            if (entities.size) {
                const model = modelMapper(entities);
                model.addLayer(new OverlayLayerModel());
                diagramEngine.setModel(model);
                setDiagramModel(model);
                autoDistribute(model);
            } else if (response.diagnostics.length && !diagramModel) {
                setUserMessage(ERRONEOUS_MODEL);
            } else if (!response.diagnostics?.length) {
                setDiagramModel(undefined);
                setUserMessage(NO_ENTITIES_DETECTED);
            }
        });
    }

    const autoDistribute = (model: DiagramModel) => {
        setTimeout(() => {
            dagreEngine.redistribute(diagramEngine.getModel());
            if (diagramEngine.getCanvas()?.getBoundingClientRect) {
                diagramEngine.zoomToFitNodes({ margin: 10, maxZoom: 1 });
            }
            diagramEngine.repaintCanvas();
            diagramEngine.getModel().removeLayer(diagramEngine.getModel().getLayers().find(layer => layer instanceof OverlayLayerModel));
            diagramEngine.setModel(model);
        }, 300);
    };

    let ctx = {
        collapsedMode,
        selectedNodeId,
        setSelectedNodeId,
        setHasDiagnostics,
        hasDiagnostics,
        focusedNodeId,
        setFocusedNodeId
    }

    const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (focusedNodeId && event.target === diagramEngine.getCanvas()) {
            setFocusedNodeId(undefined);
        }
    };

    return (
        <PersistDiagramContext {...ctx}>
            <DiagramContainer onClick={handleCanvasClick}>
                {diagramEngine?.getModel() && diagramModel ?
                    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                        <NavigationWrapperCanvasWidget
                            diagramEngine={diagramEngine}
                            className={styles.canvas}
                            focusedNode={diagramEngine?.getModel()?.getNode(focusedNodeId)}
                        />
                        <DiagramControls
                            engine={diagramEngine}
                            refreshDiagram={refreshDiagram}
                            showProblemPanel={showProblemPanel}
                        />
                    </div> :
                    userMessage ?
                        <PromptScreen
                            userMessage={userMessage}
                            showProblemPanel={hasDiagnostics ? showProblemPanel : undefined}
                        /> :
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                            <ProgressRing sx={{ color: ThemeColors.PRIMARY }} />
                        </div>
                }
            </DiagramContainer>
        </PersistDiagramContext>
    );
}
