import { LayerModel, LayerModelGenerics } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams';

import { OverlayModel } from './OverlayModel/OverlayModel';

export interface OverlayLayerModelGenerics extends LayerModelGenerics {
	CHILDREN: OverlayModel;
	ENGINE: DiagramEngine;
}

export class OverlayLayerModel<G extends OverlayLayerModelGenerics = OverlayLayerModelGenerics> extends LayerModel<G> {
	constructor() {
		super({
			type: 'diagram-overlays',
			isSvg: false,
			transformed: true
		});
	}

	addModel(model: G['CHILDREN']): void {
		if (!(model instanceof OverlayModel)) {
			throw new Error('Can only add overlays to this layer');
		}
		model.registerListener({
			entityRemoved: () => {
				// (this.getParent() as DiagramModel).removeNode(model);
			}
		});
		super.addModel(model);
	}

	getChildModelFactoryBank(engine: G['ENGINE']) {
		return engine.getNodeFactories();
	}

	getOverlayItems() {
		return this.getModels();
	}
}
