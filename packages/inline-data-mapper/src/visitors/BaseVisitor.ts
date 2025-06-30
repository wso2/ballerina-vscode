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

export interface BaseVisitor {
    beginVisit?(node: IDMModel, parent?: IDMModel): void;
    endVisit?(node: IDMModel, parent?: IDMModel): void;
    
    beginVisitInputType?(node: IOType, parent?: IDMModel): void;
    endVisitInputType?(node: IOType, parent?: IDMModel): void;

    beginVisitOutputType?(node: IOType, parent?: IDMModel): void;
    endVisitOutputType?(node: IOType, parent?: IDMModel): void;

    beginVisitMapping?(node: Mapping, parentMapping: Mapping, parentModel?: IDMModel): void;
    endVisitMapping?(node: Mapping, parentMapping: Mapping, parentModel?: IDMModel): void;
}
