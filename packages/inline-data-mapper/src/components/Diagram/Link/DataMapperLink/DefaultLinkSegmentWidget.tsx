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
import * as React from "react";

import { DefaultLinkSegmentWidgetProps } from "@projectstorm/react-diagrams";

import { IntermediatePortModel } from "../../Port";

import { DataMapperLinkModel } from "./DataMapperLink";

export class DefaultLinkSegmentWidget extends React.Component<DefaultLinkSegmentWidgetProps> {
    render() {
        const isSelected = !(this.props.link as DataMapperLinkModel).notContainsLabel &&
            (this.props.selected || this.props.link.isSelected());

        const Bottom = React.cloneElement(
            this.props.factory.generateLinkSegment(
                this.props.link,
                false,
                this.props.path
            ),
            {
                ref: this.props.forwardRef,
                strokeWidth: isSelected ? 2 : 1,
                cursor: !(this.props.link as DataMapperLinkModel).notContainsLabel ? "pointer" : "inherit"
            }
        );

        const sourcePortName =
            this.props.link.getSourcePort() instanceof IntermediatePortModel
                ? this.props.link.getSourcePort().getOptions().type
                : this.props.link.getSourcePort().getName();
        const targetPortName =
            this.props.link.getTargetPort() instanceof IntermediatePortModel
                ? this.props.link.getTargetPort().getOptions().type
                : this.props.link.getTargetPort().getName();

        const Top = React.cloneElement(Bottom, {
            strokeLinecap: "round",
            onMouseLeave: () => {
                this.props.onSelection(false);
            },
            onMouseEnter: () => {
                this.props.onSelection(true);
            },
            ...this.props.extras,
            ref: null,
            "data-linkid": this.props.link.getID(),
            "data-testid": `link-from-${sourcePortName}-to-${targetPortName}`,
            "data-diagnostics": !!(this.props.link as DataMapperLinkModel)?.diagnostics?.length,
            strokeOpacity: isSelected ? 0.1 : 0,
            strokeWidth: 10, // Note: Original strokeWidth was 20
            onContextMenu: () => {
                if (!this.props.link.isLocked()) {
                    event.preventDefault();
                    this.props.link.remove();
                }
            },
        });

        return (
            <>
                {Bottom}
                {Top}
            </>
        );
    }
}
