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
// tslint:disable: jsx-no-multiline-js jsx-wrap-multiline
import React, { useEffect, useState } from "react";

import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";

import { IntermediatePortModel } from "./IntermediatePortModel";
import { Button, Codicon, Icon } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";


export interface IntermediatePortWidgetProps {
	engine: DiagramEngine;
	port: IntermediatePortModel;
}

export const IntermediatePortWidget: React.FC<IntermediatePortWidgetProps> = (props: IntermediatePortWidgetProps) =>  {
	const { engine, port } = props;
	const [ active, setActive ] = useState(false);
	const [ disableNewLinking, setDisableNewLinking] = useState<boolean>(false);

	const hasLinks = Object.entries(port.links).length > 0;
	useEffect(() => {
		port.registerListener({
			eventDidFire(event) {
				if (event.function === "mappingStartedFrom" || event.function === "mappingFinishedTo") {
					setActive(true);
				} else if (event.function === "link-selected") {
					setActive(true);
				} else if (event.function === "link-unselected") {
					setActive(false);
				}
			},
		})
	}, []);

	useEffect(() => {
		port.registerListener({
			eventDidFire(event) {
				if (event.function === "disableNewLinking") {
					setDisableNewLinking(true);
				} else if (event.function === "enableNewLinking") {
					setDisableNewLinking(false);
				}
			},
		})
	}, []);

	const RadioButton = (checked: boolean) => (
		checked ? (
			<Button appearance="icon">
				<Icon name="radio-button-checked" />
			</Button>
		) : (
			<Button appearance="icon">
				<Icon name="radio-button-unchecked" />
			</Button>
		)
	);

	const RadioButtonChecked = styled(() => RadioButton(true))`
		user-select: none;
		pointer-events: auto;
	`;

	const RadioButtonUnchecked = styled(() => RadioButton(false))`
		user-select: none;
		pointer-events: auto;
	`;

	return <PortWidget
		port={port}
		engine={engine}
		style={{
			cursor: disableNewLinking ? "not-allowed" : "pointer",
			display: "inline",
			color: active ? "#C25B56" : (hasLinks ? "#96C0CE" : "#FEF6EB")
		}}
	>
		{active ? (
			<Button>
				<Codicon name="circle-filled" />
			</Button>
		) : (hasLinks ? <RadioButtonChecked /> : <RadioButtonUnchecked />)}
	</PortWidget>
}
