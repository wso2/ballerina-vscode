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
// tslint:disable: jsx-no-multiline-js
import React, { useContext, useState } from "react";

import { Context } from "../../../../Context/diagram";
import { ViewMode } from "../../../../Context/types";
import { FunctionHeader } from "../FunctionHeader/FunctionHeader";

import FitToScreenSVG from "./images/fit-to-screen";
import InteractionMode from "./images/interaction-mode";
import StatementMode from "./images/statement-mode";
import ZoomInSVG from "./images/zoom-in";
import ZoomOutSVG from "./images/zoom-out";
import './styles.scss';


interface PanAndZoomProps {
    viewMode: ViewMode;
    toggleViewMode: () => void;
}

const defaultZoomStatus = {
    scale: 1,
    panX: 34,
    panY: 23,
};

const MAX_ZOOM: number = 2;
const MIN_ZOOM: number = 0.6
const ZOOM_STEP: number = 0.1;

export default function PanAndZoom(props: React.PropsWithChildren<PanAndZoomProps>) {
    const { viewMode, toggleViewMode } = props;
    const diagramContext = useContext(Context);
    const { onDiagramDoubleClick } = diagramContext.props;
    const [zoomStatus, setZoomStatus] = useState(defaultZoomStatus);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const containerRef = React.useRef(null);


    function handleDoubleClick() {
        if (onDiagramDoubleClick) {
            onDiagramDoubleClick();
        }
    }

    const onPanStart = (e: React.MouseEvent) => {
        setPanStart({ x: e.clientX, y: e.clientY });
        setIsPanning(true);
        if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
    }

    const onPan = (e: React.MouseEvent) => {
        if (isPanning) {
            setZoomStatus({
                ...zoomStatus,
                panX: zoomStatus.panX + e.clientX - panStart.x,
                panY: zoomStatus.panY + e.clientY - panStart.y,
            });
            setPanStart({ x: e.clientX, y: e.clientY });
        }
    }

    const onPanEnd = () => {
        setIsPanning(false);
        if (containerRef.current) containerRef.current.style.cursor = 'default';
    }

    const zoomIn = () => {
        setZoomStatus({
            ...zoomStatus,
            scale: zoomStatus.scale + ZOOM_STEP >= MAX_ZOOM ? MAX_ZOOM : zoomStatus.scale + ZOOM_STEP
        });
    }

    const zoomOut = () => {
        setZoomStatus({
            ...zoomStatus,
            scale: zoomStatus.scale - ZOOM_STEP <= MIN_ZOOM ? MIN_ZOOM : zoomStatus.scale - ZOOM_STEP
        });
    }

    const resetZoomStatus = () => {
        setZoomStatus(defaultZoomStatus)
    }

    const handleZoomAndPanWithWheel = (e: React.WheelEvent) => {
        if (e.metaKey || e.ctrlKey) {
            // zoom logic
            const delta = Math.sign(e.deltaY);
            if (delta === 1) {
                zoomOut();
            } else if (delta === -1) {
                zoomIn();
            }
        } else {
            // pan logic
            setZoomStatus({
                ...zoomStatus,
                panX: zoomStatus.panX + -e.deltaX,
                panY: zoomStatus.panY + -e.deltaY,
            });
        }
    }

    const transform: string = `scale(${zoomStatus.scale}) translate(${zoomStatus.panX}px, ${zoomStatus.panY}px)`;

    return (
        <div className={'design-container-outer'} style={{ display: "flex", flexDirection: "column" }}>
            <FunctionHeader />
            <div style={{ display: "flex", flexDirection: "row", padding: '0 10px 0 0' }}>
                <div
                    className={'diagram-container-outer'}
                    ref={containerRef}
                    onWheel={handleZoomAndPanWithWheel}
                    onPointerDown={onPanStart}
                    onPointerMove={onPan}
                    onPointerUp={onPanEnd}
                >
                    <div
                        className={'diagram-container-inner'}
                        style={{
                            transform,
                        }}
                    >
                        <div className={'design-container'} onDoubleClick={handleDoubleClick}>
                            {props.children}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'end' }} className="tools">
                    <div className={'zoom-control-wrapper'} onClick={toggleViewMode}>
                        {viewMode === ViewMode.STATEMENT ? <InteractionMode /> : <StatementMode />}
                    </div>
                    <div className={'zoom-control-wrapper'} onClick={zoomIn}>
                        <ZoomInSVG />
                    </div>
                    <div className={'zoom-control-wrapper'} onClick={zoomOut}>
                        <ZoomOutSVG />
                    </div>
                    <div className={'zoom-control-wrapper'} onClick={resetZoomStatus}>
                        <FitToScreenSVG />
                    </div>
                </div>
            </div>
        </div>
    )

}
