import { BezierCurve, Point } from "@projectstorm/geometry";
import { DefaultLinkModel } from "@projectstorm/react-diagrams";
import { STNode } from "@wso2/syntax-tree";
import { Diagnostic } from "vscode-languageserver-types";

import { IntermediatePortModel } from "../../Port";
import { calculateControlPointOffset } from "../../utils/diagram-utils";

export const LINK_TYPE_ID = "datamapper-link";

export class DataMapperLinkModel extends DefaultLinkModel {

	constructor(public value?: STNode, public diagnostics: Diagnostic[] = [],
		public isActualLink: boolean = false, public notContainsLabel?: boolean) {
		super({
			type: LINK_TYPE_ID,
			width: 1,
			curvyness: 0,
			locked: true,
			color: "var(--vscode-debugIcon-breakpointDisabledForeground)"
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
		return this.diagnostics.length > 0 ;
	}
}
