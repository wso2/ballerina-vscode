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
import { BezierCurve, Point } from "@projectstorm/geometry";
import { DefaultLinkModel } from "@projectstorm/react-diagrams";

import { IntermediatePortModel } from "../../Port";
import { calculateControlPointOffset } from "../../utils/diagram-utils";
import { IDMDiagnostic } from "@wso2/ballerina-core";

export const LINK_TYPE_ID = "datamapper-link";

export class DataMapperLinkModel extends DefaultLinkModel {

	constructor(
		public value?: string,
		public diagnostics: IDMDiagnostic[] = [],
		public isActualLink: boolean = false,
		public notContainsLabel?: boolean
	) {
		super({
			type: LINK_TYPE_ID,
			width: 1,
			curvyness: 0,
			locked: true,
			color: "#00c0ff"
		});

		if (isActualLink){
			this.setColor('var(--vscode-list-focusAndSelectionOutline, var(--vscode-contrastActiveBorder, var(--vscode-editorLink-activeForeground, var(--vscode-list-focusOutline))))');
		}

		if (diagnostics.length > 0){
			this.setColor('var(--vscode-errorForeground)');
		}

	}

	getSVGPath(): string {
		const screenWidth = window.innerWidth;
		let controlPointOffset = calculateControlPointOffset(screenWidth);
		if (this.points.length === 2) {
			const curve = new BezierCurve();
			const sourcePoint: Point = new Point(this.getFirstPoint().getPosition().x + 5,
				this.getFirstPoint().getPosition().y);
			const targetPoint: Point = new Point(this.getLastPoint().getPosition().x - 5,
				this.getLastPoint().getPosition().y);
			curve.setSource(sourcePoint);
			curve.setTarget(targetPoint);

			if (this.sourcePort instanceof IntermediatePortModel) {
				curve.setSourceControl(sourcePoint);
				curve.setTargetControl(targetPoint);
			} else {
				const srcControl = sourcePoint.clone();
				srcControl.translate(controlPointOffset, 0);
				const targetControl = targetPoint.clone();
				targetControl.translate(-controlPointOffset, 0);
				curve.setSourceControl(srcControl);
				curve.setTargetControl(targetControl);
			}
			return curve.getSVGCurve();
		}
	}

	public hasError(): boolean {
		return this.diagnostics.length > 0;
	}
}
