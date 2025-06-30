import { RemoteMethodCallAction, STNode, Visitor } from "@wso2/syntax-tree";
export class InvocationPerformanceVisitor implements Visitor {
    public invocations: STNode[] = [];


    beginVisitRemoteMethodCallAction(node: RemoteMethodCallAction) {
        this.invocations.push(node);
    }

    public getPerformanceNode() {
        return this.invocations.find((node) => ((node as any).performance !== undefined));
    }
}
