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

import { DiagramModel } from "@projectstorm/react-diagrams-core";
import * as dagre from "dagre";
import { GraphLabel } from "dagre";
import _forEach from "lodash/forEach";

export interface DagreEngineOptions {
    graph?: GraphLabel;
    nodeMargin?: number;
}
// TODO: Remove this
export class DagreEngine {
    options: DagreEngineOptions;

    constructor(options: DagreEngineOptions = {}) {
        this.options = options;
    }

    redistribute(model: DiagramModel) {
        // Create a new directed graph
        var g = new dagre.graphlib.Graph({
            multigraph: true,
            compound: true,
        });
        g.setGraph(this.options.graph || {});
        g.setDefaultEdgeLabel(function () {
            return {};
        });

        // set nodes
        _forEach(model.getNodes(), (node) => {
            g.setNode(node.getID(), { width: node.width, height: node.height });
        });

        _forEach(model.getLinks(), (link) => {
            // set edges
            if (link.getSourcePort() && link.getTargetPort()) {
                g.setEdge({
                    v: link.getSourcePort().getNode().getID(),
                    w: link.getTargetPort().getNode().getID(),
                    name: link.getID(),
                });
            }
        });

        // layout the graph
        dagre.layout(g);

        g.nodes().forEach((v) => {
            const node = g.node(v);
            model.getNode(v).setPosition(node.x - node.width / 2, node.y - node.height / 2);
        });
    }
}
