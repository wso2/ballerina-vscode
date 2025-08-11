import styled from "@emotion/styled";
import { VSCodeTag } from "@vscode/webview-ui-toolkit/react";

export const VariableTypeIndicator = styled(VSCodeTag)`
    ::part(control) {
        text-transform: none;
        font-size: 10px;
        height: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
`;