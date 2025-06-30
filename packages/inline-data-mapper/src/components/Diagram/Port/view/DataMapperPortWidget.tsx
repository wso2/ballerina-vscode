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
import React, { useEffect, useState } from "react";

import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";

import { DataMapperLinkModel } from "../../Link"
import { IntermediatePortModel } from "../IntermediatePort";
import { InputOutputPortModel } from "../model/InputOutputPortModel";
import { useDMExpressionBarStore } from "../../../../store/store";
import { RadioButtonChecked, RadioButtonUnchecked } from "./DataMapperPortRadioButton";
import { useShallow } from "zustand/react/shallow";

export interface DataMapperPortWidgetProps {
	engine: DiagramEngine;
	port: IntermediatePortModel | InputOutputPortModel;
	disable?: boolean;
	dataTestId?: string;
	handlePortState?: (portState: PortState) => void ;
	hasFirstSelectOutput?: (inputBeforeOutput: boolean) => void;
}

export enum PortState {
	PortSelected,
	LinkSelected,
	Unselected
}

export const DataMapperPortWidget: React.FC<DataMapperPortWidgetProps> = (props: DataMapperPortWidgetProps) =>  {
	const { engine, port, disable, dataTestId, handlePortState, hasFirstSelectOutput } = props;
	const [ portState, setPortState ] = useState<PortState>(PortState.Unselected);
	const [ disableNewLinking, setDisableNewLinking] = useState<boolean>(false);

	const isDisabled = disable || (port instanceof InputOutputPortModel && port.isDisabled());

	const { resetExprBarFocus } = useDMExpressionBarStore(
		useShallow(state => ({
			resetExprBarFocus: state.resetFocus
		}))
	);

	const hasLinks = Object.entries(port.links).length > 0;
	const isPortSelected = portState === PortState.PortSelected;

	const hasError = Object.entries(port.links).some((link) => {
		if (link[1] instanceof DataMapperLinkModel){
			return link[1].hasError();
		}
		return false;
	});

	useEffect(() => {
			port.registerListener({
				eventDidFire(event) {
					if (event.function === "mappingStartedFrom" || event.function === "mappingFinishedTo") {
						setPortState(PortState.PortSelected);
						if (handlePortState) {
							handlePortState(PortState.PortSelected);
							resetExprBarFocus();
						}
					} else if (event.function === "link-selected") {
						setPortState(PortState.LinkSelected);
						if (handlePortState) {
							handlePortState(PortState.LinkSelected);
							resetExprBarFocus();
						}
					} else if (event.function === "link-unselected"
						|| event.function === "mappingStartedFromSelectedAgain") {
						setPortState(PortState.Unselected);
						if (handlePortState) {
							handlePortState(PortState.Unselected);
						}
						resetExprBarFocus();
					} else if (event.function === "firstClickedOnOutput") {
						hasFirstSelectOutput(true);
						setTimeout(() => hasFirstSelectOutput(false), 1500);
					} else if (event.function === "disableNewLinking") {
						setDisableNewLinking(true);
					} else if (event.function === "enableNewLinking") {
						setDisableNewLinking(false);
					}
				},
			})
	}, []);

	let portColor = defaultPortColor;
	if (isPortSelected) {
		portColor = portActiveColor;
	} else if (hasLinks) {
		portColor = hasError ? errorPortColor : portActiveColor;
	}

	const containerProps = {
		'data-testid': dataTestId,
		active: isPortSelected,
		color: portColor
	};

	if (isDisabled) {
		return <RadioButtonUnchecked disabled={isDisabled} data-testid={dataTestId}/>;
	} else if (disableNewLinking) {
		return (
			<PortWidget
				port={port}
				engine={engine}
			>
				<DisabledNewLinkingPortContainer {...containerProps}>
					{hasLinks ? <RadioButtonChecked /> : <RadioButtonUnchecked /> }
				</DisabledNewLinkingPortContainer>
			</PortWidget>
		);
	}

	const isChecked = hasLinks || isPortSelected;

	return (
		<PortWidget
			port={port}
			engine={engine}
		>
			<ActivePortContainer {...containerProps}>
				{isChecked ? <RadioButtonChecked /> : <RadioButtonUnchecked />}
			</ActivePortContainer>
		</PortWidget>
	);
}

interface PortsContainerProps {
	active: boolean;
	color: string;
}

const defaultPortColor = "var(--vscode-foreground)";
const errorPortColor = "var(--vscode-errorForeground)";
const portActiveColor = "var(--vscode-list-focusAndSelectionOutline, var(--vscode-contrastActiveBorder, var(--vscode-editorLink-activeForeground, var(--vscode-list-focusOutline))))";

const ActivePortContainer = styled.div((props: PortsContainerProps) => ({
	cursor: "pointer",
	display: "flex",
	strokeOpacity: props.active ? 0.1 : 0,
	color: props.color,
	"&:hover": {
		color: portActiveColor
	}
}));

const DisabledNewLinkingPortContainer = styled.div((props: PortsContainerProps) => ({
	cursor: "not-allowed",
	display: "flex",
	color: props.color,
}));
