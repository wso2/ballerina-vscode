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
import { PortModelAlignment } from "@projectstorm/react-diagrams";

import { GraphqlNodeBasePort } from "../../Port/GraphqlNodeBasePort";
import { RecordComponent } from "../../resources/model";
import { GraphqlDesignNode } from "../BaseNode/GraphqlDesignNode";

export const RECORD_NODE = "recordNode";

export class RecordNodeModel extends GraphqlDesignNode {
    readonly recordObject: RecordComponent;


    constructor(recordObject: RecordComponent) {
        super(RECORD_NODE, recordObject.name);
        this.recordObject = recordObject;

        this.addPort(new GraphqlNodeBasePort(this.recordObject.name, PortModelAlignment.LEFT));
        this.addPort(new GraphqlNodeBasePort(this.recordObject.name, PortModelAlignment.RIGHT));
        this.addPort(new GraphqlNodeBasePort(this.recordObject.name, PortModelAlignment.TOP));

        this.recordObject.recordFields.forEach(field => {
            this.addPort(new GraphqlNodeBasePort(field.name, PortModelAlignment.LEFT));
            this.addPort(new GraphqlNodeBasePort(field.name, PortModelAlignment.RIGHT));
        });
    }
}
