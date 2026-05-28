import { VisibleEndpoint } from "@wso2/syntax-tree";

import { StatementViewState } from "../ViewState";

export interface ErrorSnippet {
    diagnosticMsgs?: string,
    code?: string,
    severity?: string
}

export interface Endpoint {
    visibleEndpoint: VisibleEndpoint;
    actions?: StatementViewState[];
    firstAction?: StatementViewState;
    isExpandedPoint?: boolean;
    offsetValue?: number;
    isParent?: boolean;
}

export interface TooltipContent {
    heading?: string,
    content?: string,
    example?: string,
    code?: string
}
