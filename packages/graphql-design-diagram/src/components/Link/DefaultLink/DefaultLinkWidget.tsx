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

// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import React, { useEffect, useState } from "react";

import { DiagramEngine } from "@projectstorm/react-diagrams";
import { ThemeColors } from "@wso2/ui-toolkit";

import { DefaultLinkModel } from "./DefaultLinkModel";


interface WidgetProps {
    engine: DiagramEngine,
    link: DefaultLinkModel
}

export function DefaultLinkWidget(props: WidgetProps) {
    const { link, engine } = props;

    const [isSelected, setIsSelected] = useState<boolean>(false);

    useEffect(() => {
        link.initLinks(engine);

        link.registerListener({
            'SELECT': selectPath,
            'UNSELECT': unselectPath
        });

    }, [link]);

    const onMouseOver = (event: React.MouseEvent<SVGPathElement | HTMLDivElement>) => {
        selectPath();
    };

    const onMouseLeave = () => {
        unselectPath();
    };

    const selectPath = () => {
        link.selectLinkedNodes();
        setIsSelected(true);
    };

    const unselectPath = () => {
        link.resetLinkedNodes();
        setIsSelected(false);
    };


    return (
        <g>
            <polygon
                points={link.getArrowHeadPoints()}
                fill={isSelected ? ThemeColors.SECONDARY : ThemeColors.PRIMARY}
            />

            <path
                data-testid={link.getSourcePort().getName() + "-" + link.getTargetPort().getName()}
                id={link.getID()}
                cursor={'pointer'}
                d={link.getCurvePath()}
                fill="none"
                pointerEvents="all"
                onMouseLeave={onMouseLeave}
                onMouseOver={onMouseOver}
                stroke={isSelected ? ThemeColors.SECONDARY : ThemeColors.PRIMARY}
                strokeWidth={1}
            />
        </g>
    );
}
