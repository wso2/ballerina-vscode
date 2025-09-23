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
import * as React from "react";

import { DiagramEngine } from "@projectstorm/react-diagrams";

import { DefaultLinkSegmentWidget } from "./DefaultLinkSegmentWidget";
import { DataMapperLinkModel } from "./DataMapperLink";

interface DefaultLinkWidgetProps {
    diagramEngine: DiagramEngine;
    link: DataMapperLinkModel;
}

export function DefaultLinkWidget(props: DefaultLinkWidgetProps) {
    const [selected, setSelected] = React.useState<boolean>(false);
    const refPaths = React.useRef<React.RefObject<SVGPathElement>[]>([]);

    // Use a layout effect to update rendered paths after DOM mutations
    React.useLayoutEffect(() => {
        const paths = refPaths.current
            .map(ref => ref.current)
            .filter((path): path is SVGPathElement => path !== null);
        
        if (paths.length > 0) {
            props.link.setRenderedPaths(paths);
        }
    });

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
