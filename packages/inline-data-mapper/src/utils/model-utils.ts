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

import { IDMModel, IOType, Mapping } from "@wso2/ballerina-core";
import { BaseVisitor } from "../visitors/BaseVisitor";

export function traverseNode(model: IDMModel, visitor: BaseVisitor) {
    visitor.beginVisit?.(model);

    // Visit input types
    if (model.inputs.length > 0) {
        for (const inputType of model.inputs) {
            traverseIOType(inputType, model, visitor);
        }
    }

    // Visit output type
    traverseIOType(model.output, model, visitor);

    // Visit mappings
    traverseMappings(model.mappings, undefined, model, visitor);

    visitor.endVisit?.(model);
}

function traverseIOType(ioType: IOType, parent: IDMModel, visitor: BaseVisitor) {
    if (!!ioType.category) {
        visitor.beginVisitInputType?.(ioType, parent);
        visitor.endVisitInputType?.(ioType, parent);
    } else {
        visitor.beginVisitOutputType?.(ioType, parent);
        visitor.endVisitOutputType?.(ioType, parent);
    }
}

function traverseMappings(mappings: Mapping[], parentMapping: Mapping, parentModel: IDMModel, visitor: BaseVisitor) {
    for (const mapping of mappings) {
        visitor.beginVisitMapping?.(mapping, parentMapping, parentModel);

        if (mapping?.elements.length > 0) {
            const mappingElelements = mapping.elements;

            for (const element of mappingElelements) {
                traverseMappings(element.mappings, mapping, parentModel, visitor);
            }
        }

        visitor.endVisitMapping?.(mapping, parentMapping, parentModel);
    }
}
