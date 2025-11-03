/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
// tslint:disable: jsx-no-lambda jsx-no-multiline-js
import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';

import { DiagramEngine } from "@projectstorm/react-diagrams";

import { DefaultLinkSegmentWidget } from "./DefaultLinkSegmentWidget";
import { DataMapperLinkModel } from "./DataMapperLink";
import { createFocusLinkedNodesEventPayload, FOCUS_LINKED_NODES_EVENT } from "../../utils/link-focus-utils";

interface DefaultLinkWidgetProps {
    diagramEngine: DiagramEngine;
    link: DataMapperLinkModel;
}

/**
 * Handles focusing on linked nodes when a link is selected.
 * Validates the link's ports and nodes, creates the focus event payload,
 * and dispatches the custom focus event.
 */
const handleLinkSelectionFocus = (
    link: DataMapperLinkModel,
    diagramEngine: DiagramEngine
): void => {
    // Validate that the link has both source and target ports
    const sourcePort = link.getSourcePort();
    const targetPort = link.getTargetPort();
    
    if (!sourcePort || !targetPort) {
        return;
    }
    
    // Validate that both ports have associated nodes
    const sourceNode = sourcePort.getNode();
    const targetNode = targetPort.getNode();
    
    if (!sourceNode || !targetNode) {
        return;
    }
    
    // Create the focus event payload
    const payload = createFocusLinkedNodesEventPayload(
        sourceNode.getID(),
        targetNode.getID(),
        sourcePort.getName(),
        targetPort.getName()
    );
    
    // Validate that the nodes exist in the diagram model
    const model = diagramEngine.getModel();
    const modelSourceNode = model.getNode(payload.sourceNodeId);
    const modelTargetNode = model.getNode(payload.targetNodeId);
    
    if (!modelSourceNode || !modelTargetNode) {
        return;
    }
    
    // Dispatch the focus event
    const customEvent = new CustomEvent(FOCUS_LINKED_NODES_EVENT, { 
        detail: payload 
    });
    document.dispatchEvent(customEvent);
};

export function DefaultLinkWidget(props: DefaultLinkWidgetProps) {
    const [selected, setSelected] = useState<boolean>(false);
    const refPaths = useRef<React.RefObject<SVGPathElement>[]>([]);
    const isLinkSelected = props.link.isSelected();

    // Use a layout effect to update rendered paths after DOM mutations
    useLayoutEffect(() => {
        const paths = refPaths.current
            .map(ref => ref.current)
            .filter((path): path is SVGPathElement => path !== null);
        
        if (paths.length > 0) {
            props.link.setRenderedPaths(paths);
        }
    });

    useEffect(() => {
        // When a link is selected, focus on the connected nodes
        if (isLinkSelected && props.link && props.diagramEngine) {
            handleLinkSelectionFocus(props.link, props.diagramEngine);
        }
    }, [isLinkSelected, props.link, props.diagramEngine]);

    const generateLink = React.useCallback((
        path: string,
        extraProps: React.Attributes,
        id: string | number
    ): JSX.Element => {
        const ref = React.createRef<SVGPathElement>();
        refPaths.current.push(ref);
        
        return (
            <DefaultLinkSegmentWidget
                key={`link-${id}`}
                path={path}
                selected={selected}
                diagramEngine={props.diagramEngine}
                factory={props.diagramEngine.getFactoryForLink(
                    props.link
                )}
                link={props.link}
                forwardRef={ref}
                onSelection={(selectedState) => {
                    setSelected(selectedState);
                }}
                extras={extraProps}
            />
        );
    }, [selected, props.diagramEngine, props.link]);

    // Reset refs for this render
    refPaths.current = [];
    
    const svgPath = props.link.getSVGPath();
    
    if (!svgPath) {
        return <g data-default-link-test={props.link.getID()} />;
    }

    const linkSegment = generateLink(svgPath, {}, 0);

    return <g data-default-link-test={props.link.getID()}>{linkSegment}</g>;
}
