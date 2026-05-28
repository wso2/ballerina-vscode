import * as React from "react";

import { STNode } from "@wso2/syntax-tree";

import { DefaultConfig } from "../../../Visitors/default";
import { TRIGGER_RECT_SVG_HEIGHT, TRIGGER_SVG_HEIGHT, TRIGGER_SVG_WIDTH } from "../ActionInvocation/TriggerSVG";

import { DoubleArrowHeadLine } from "./DoubleArrowHeadLine";
import { ResponseTimer } from "./ResponseTImer";
import { COUNTERLEFT_SVG_HEIGHT } from "./ResponseTImer/CounterLeftSVG";
import { StatusCode } from "./StatusCode";
import "./style.scss";
import { SuccesFailure } from "./SuccessFailureRate";
import { SUCCESS_LABEL_SVG_WIDTH } from "./SuccessFailureRate/SuccessSVG";
import { getMetrics, getTrace } from "./Util";

export interface MetricsProps {
    syntaxTree: STNode;
    lineStartX: number;
    lineStartY: number;
    actionLineWidth: number;
    triggerSVGX: number;
    triggerSVGY: number;
}

export function Metrics(props: MetricsProps) {
    const { syntaxTree, actionLineWidth, lineStartX, lineStartY, triggerSVGX, triggerSVGY } = props;
    const metrics = getMetrics(syntaxTree);
    const trace = getTrace(syntaxTree);
    const successText = {
        x: lineStartX + actionLineWidth / 2 - SUCCESS_LABEL_SVG_WIDTH / 2,
        y: lineStartY + DefaultConfig.metrics.successTextPadding
    };
    const doubleArrlowLine = {
        startX: triggerSVGX + TRIGGER_SVG_WIDTH + (2 * DefaultConfig.textLine.padding),
        startY: triggerSVGY,
        endX: triggerSVGX + TRIGGER_SVG_WIDTH + (2 * DefaultConfig.textLine.padding),
        endY: triggerSVGY + TRIGGER_RECT_SVG_HEIGHT
    }
    const responseTime = {
        x: doubleArrlowLine.startX + DefaultConfig.metrics.responseTimePadding,
        y: doubleArrlowLine.startY + COUNTERLEFT_SVG_HEIGHT
    };

    const getElement = () => {
        if (trace?.duration){
            const { duration, httpStatusCode, errorStatus, errorMsg } = trace;
            return (
                <g className={"metrics"}>
                    <DoubleArrowHeadLine className={"arrow-line"} direction={"vertical"} {...doubleArrlowLine} />
                    <StatusCode httpStatusCode={httpStatusCode} errorStatus={errorStatus} errorMsg={errorMsg} {...successText} />
                    <ResponseTimer responseTime={duration} {...responseTime} />
                </g>
            );
        }else if (metrics?.totalCount){
            const { totalCount = 0, successRate = 0, failRate = 0, meanTimeMS = 0 } = metrics;
            const successRateRounded = Math.round(successRate);
            const errorRateRounded = Math.round(failRate);
            return (
                <g className={"metrics"}>
                    <SuccesFailure successRate={successRateRounded} failureRate={errorRateRounded} {...successText} />
                    <DoubleArrowHeadLine className={"arrow-line"} direction={"vertical"} {...doubleArrlowLine} />
                    <ResponseTimer responseTime={meanTimeMS} {...responseTime} />
                </g>
            );
        } else {
            return (<g />);
        };
    };

    return (getElement())
}
