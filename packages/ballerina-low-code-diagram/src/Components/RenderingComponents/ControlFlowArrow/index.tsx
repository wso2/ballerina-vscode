import React from 'react'

import { ControlFLowArrowSVG } from './ControlFLowArrowSVG';
import "./style.scss";

export interface ControlFlowArrowProps {
    x: number;
    y: number;
    w: number;
    isDotted: boolean;
    isLeft?: boolean;
}

export default function ControlFlowArrow(props: ControlFlowArrowProps) {
    const { isDotted, x, w, y, isLeft } = props;
    return (
        <g className="control-flow-line">
            <ControlFLowArrowSVG
                x1={x + w}
                x2={x}
                y={y}
                isDotted={isDotted}
                isLeft={isLeft}
            />
        </g>
    );
}

