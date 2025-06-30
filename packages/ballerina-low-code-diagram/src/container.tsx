
import React, { useContext } from "react";

import { CanvasDiagram } from "./CanvasContainer";
import { Context } from "./Context/diagram";
import { getSTComponent } from "./Utils";

export default function LowCodeDiagramRenderer() {
    const { props: {syntaxTree} } = useContext(Context);
    const child = getSTComponent(syntaxTree);

    return (
        <CanvasDiagram>
            {child}
        </CanvasDiagram>
    );
}
