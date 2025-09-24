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
        if (isLinkSelected && props.link && props.link.getSourcePort() && props.link.getTargetPort()) {
            const sourcePort = props.link.getSourcePort();
            const targetPort = props.link.getTargetPort();
            
            if (sourcePort && targetPort && sourcePort.getNode() && targetPort.getNode()) {
                // Create a custom event to focus on the linked nodes
                const payload = createFocusLinkedNodesEventPayload(
                    sourcePort.getNode().getID(),
                    targetPort.getNode().getID(),
                    sourcePort.getName(),
                    targetPort.getName()
                );
                
                // Use a custom approach to handle the focus event
                // Get the nodes and ports from the model
                if (props.diagramEngine) {
                    const model = props.diagramEngine.getModel();
                    const sourceNode = model.getNode(payload.sourceNodeId);
                    const targetNode = model.getNode(payload.targetNodeId);
                    
                    if (sourceNode && targetNode) {
                        // Dispatch a custom event that will be handled by our listener
                        const customEvent = new CustomEvent(FOCUS_LINKED_NODES_EVENT, { 
                            detail: payload 
                        });
                        document.dispatchEvent(customEvent);
                    }
                }
            }
        }
    }, [isLinkSelected]);

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
