import React, { useCallback, useContext, useState } from "react";

import { STNode } from "@wso2/syntax-tree";

import { Context } from "../Context/diagram";
import { SelectedPosition } from "../Context/types";
import { getNodeSignature } from "../Utils";
import expandTracker from "../Utils/expand-tracker";

/**
 * A custom hook for diagram components which returns a boolean indicating if a given
 * STNode is the one which is selected for viewing in diagram navigator (eg: tree view
 * in vscode or breadcrumbs).
 * Additonaly, it knows how to scroll into the diagram for the given node, if a ref
 * object for the container is provided.
 *
 * @param node STNode to check against.
 * @param containerRef Container ref to scroll to, if the passed node is selected.
 * @returns Returns true if the passed node is the currently selected node for viewing
 */
export function useSelectedStatus(node: STNode, containerRef?: React.MutableRefObject<any>): [status: boolean, updateStatus: (nextState: boolean) => void] {
    const {
        props: { selectedPosition }
    } = useContext(Context);
    const [isSelected, setSelected] = React.useState(selectedPosition ? isNodeSelected(selectedPosition, node) : false);
    const [isExpanded, setIsExpanded] = useState(node && !node.viewState.collapsed || isSelected);

    React.useEffect(() => {
        if (selectedPosition) {
            const selected = isNodeSelected(selectedPosition, node);
            setSelected(selected);
            if (selected && containerRef) {
                containerRef.current?.scrollIntoView();
            }
        }
    }, [selectedPosition, node]);

    React.useEffect(() => {
        if (!expandTracker.isExpanded(getNodeSignature(node))) {
            setIsExpanded(isSelected);
        }
    }, [isSelected]);

    React.useEffect(() => {
        if (isExpanded) {
            expandTracker.addExpandedSignature(getNodeSignature(node));
        } else {
            expandTracker.removeExpandedSignature(getNodeSignature(node));
        }
    }, [isExpanded]);

    return [isExpanded, setIsExpanded];
}

export function isNodeSelected(selectedPosition: SelectedPosition, node: any): boolean {
    let lineOffset: number = 0;
    if (node?.leadingMinutiae && node?.leadingMinutiae.length > 0) {
        for (const minutiae of node.leadingMinutiae) {
            if (minutiae.kind === "END_OF_LINE_MINUTIAE") {
                lineOffset += 1;
            }
        }
    }

    return selectedPosition?.startLine >= (node.position?.startLine - lineOffset)
        && selectedPosition?.startLine <= node.position?.endLine;
}

export function useOverlayRef(): [
    HTMLDivElement,
    (node: HTMLDivElement) => void] {
    const [overlayDiv, setOverlayDiv] = useState<HTMLDivElement>(undefined);
    const ref = useCallback((node: React.SetStateAction<HTMLDivElement>) => {
        if (node !== null) {
            setOverlayDiv(node);
        }
    }, []);
    return [overlayDiv, ref];
}
