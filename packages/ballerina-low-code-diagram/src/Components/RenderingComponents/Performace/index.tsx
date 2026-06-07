import * as React from "react"

import { STNode } from "@wso2/syntax-tree";

import { DefaultConfig } from "../../../Visitors/default";
import { TRIGGER_RECT_SVG_HEIGHT, TRIGGER_SVG_HEIGHT, TRIGGER_SVG_WIDTH } from "../ActionInvocation/TriggerSVG";
import { PerformanceLabel } from "../Metrics/ResponseTImer";
import { COUNTERLEFT_SVG_HEIGHT } from "../Metrics/ResponseTImer/CounterLeftSVG";

import "./style.scss";
import { getPerformance } from "./Util";

export interface PerformanceProps {
    syntaxTree: STNode;
    triggerSVGX: number;
    triggerSVGY: number;
}

export function Performance(props: PerformanceProps) {
    const { syntaxTree, triggerSVGX, triggerSVGY } = props;
    const performace = getPerformance(syntaxTree);

    const responseTime = {
        x: triggerSVGX + TRIGGER_SVG_WIDTH + (2 * DefaultConfig.textLine.padding) + DefaultConfig.metrics.responseTimePadding,
        y: triggerSVGY + TRIGGER_SVG_HEIGHT / 2 - TRIGGER_RECT_SVG_HEIGHT / 2 + TRIGGER_RECT_SVG_HEIGHT / 2 - COUNTERLEFT_SVG_HEIGHT / 2
    };

    if (!performace?.latency) {
        return (<g/>);
    } else {
        const { latency } = performace;

        return (
            <g className={"performance"}>
                <PerformanceLabel responseTime={latency} {...responseTime}/>
            </g>
        );

    }
}
