import { STKindChecker, STNode, traversNode } from "@wso2/syntax-tree";

import { InvocationMetricsVisitor } from "../../../Visitors";

export function getMetrics(model: STNode){
    let metrics: any;
    if (model) {
        const findMetricsVisitor = new InvocationMetricsVisitor();
        traversNode(model, findMetricsVisitor);
        const metricsNode = findMetricsVisitor.getMetricsNode();
        if (metricsNode && STKindChecker.isRemoteMethodCallAction(metricsNode)) {
            metrics = (metricsNode as any).metrics;
        }
    }
    return metrics;
}

export function getTrace(model: STNode){
    let trace: any;
    if (model) {
        const findMetricsVisitor = new InvocationMetricsVisitor();
        traversNode(model, findMetricsVisitor);
        const traceNode = findMetricsVisitor.getMetricsNode();
        if (traceNode && STKindChecker.isRemoteMethodCallAction(traceNode)) {
            trace = (traceNode as any).trace;
        }
    }
    return trace;
}
