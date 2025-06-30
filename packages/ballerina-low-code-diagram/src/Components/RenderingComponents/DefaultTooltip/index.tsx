import React, { ReactElement } from "react";

import { ErrorSnippet, TooltipContent } from "../../../Types/type";

interface DefaultTooltipProps {
    text?: any,
    diagnostic?: ErrorSnippet,
    children?: React.ReactElement<any, any>;
}

export function DefaultTooltip(props: DefaultTooltipProps) {
    const { children, text, diagnostic } = props;
    return (
        <g>
            {text && text.heading && <title>{text.heading}</title>}
            {text && !text.heading && text.code && <title>{text.code}</title>}
            {!text && diagnostic && diagnostic.diagnosticMsgs && <title>{diagnostic.diagnosticMsgs}</title>}
            {children}
        </g>
    );
}
