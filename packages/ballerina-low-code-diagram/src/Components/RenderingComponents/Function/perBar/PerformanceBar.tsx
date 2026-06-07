import React, { useContext, useEffect, useState } from "react";

import { ANALYZE_TYPE } from "@wso2/ballerina-core";
import { FunctionDefinition } from "@wso2/syntax-tree";

import { Context } from "../../../../Context/diagram";

import { generatePerfData } from "./PerformanceUtil";
import "./style.scss";

interface PerformanceProps {
    model: FunctionDefinition;
}

export function PerformanceBar(props: PerformanceProps) {
    const { model } = props;
    const diagramContext = useContext(Context);
    const openPerformanceChart = diagramContext?.api?.edit?.openPerformanceChart;
    const { diagramCleanDraw } = diagramContext?.actions;
    const showTooltip = diagramContext?.api?.edit?.showTooltip;
    const [tooltip, setTooltip] = useState(undefined);

    const { concurrency, latency, tps, analyzeType, isDataAvailable } = generatePerfData(model);

    const onClickPerformance = async () => {
        let fullPath = "";
        for (const path of model.relativeResourcePath) {
            const p = path as any;
            if (p.kind === "ResourcePathSegmentParam") {
                fullPath += p.source;
            } else {
                fullPath += p.value;
            }
        }

        if (openPerformanceChart) {
            await openPerformanceChart(`${model.functionName.value.toUpperCase()} /${fullPath}`,
                model.position, diagramCleanDraw);
        }
    };
    const element = (
        <p className={"more"} onClick={onClickPerformance}>{"Reveal performance-critical path"}</p>
    );

    const content = "Click here to open the performance forecast";

    useEffect(() => {
        if (model && showTooltip) {
            setTooltip(showTooltip(element, content));
        }
    }, [model]);

    const perBar = (
        <div className={"performance-bar"}>
            <div className={"rectangle"}>&nbsp;</div>
            <p>
                {`Forecasted performance of the ${isRealtime() ? "performance-critical" : "selected"} path: User Count: ${concurrency} | Latency: ${latency} | Tps: ${tps}`}
            </p>
            {isRealtime() && (tooltip ? tooltip : element)}
        </div>
    );

    return (
        isDataAvailable && perBar
    );

    function isRealtime() {
        return analyzeType === ANALYZE_TYPE.REALTIME;
    }
}
