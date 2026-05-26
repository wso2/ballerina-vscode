import React from "react";

import LowCodeDiagramRenderer from "./container";
import { Provider as DiagramContext } from "./Context/diagram";
import { LowCodeDiagramProps } from "./Context/types";

export * from "./ViewState";
export * from "./Visitors";
export * from "./Components/RenderingComponents/Connector/Icon";
export { ModuleIconProps, ModuleIcon } from "./Components/RenderingComponents/Connector/ConnectorHeader/ModuleIcon";
export * from "./ReadOnlyDiagram";

export function LowCodeDiagram(props: LowCodeDiagramProps) {
    return (
        <DiagramContext {...props}>
            <LowCodeDiagramRenderer />
        </DiagramContext>
    );
}
