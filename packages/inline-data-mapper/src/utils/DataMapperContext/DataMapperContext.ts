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
import { IDMModel, Mapping } from "@wso2/ballerina-core";
import { View } from "../../components/DataMapper/Views/DataMapperView";

export interface IDataMapperContext {
    model: IDMModel;
    views: View[];
    addView: (view: View) => void;
    applyModifications: (mappings: Mapping[]) => Promise<void>;
    addArrayElement: (targetField: string) => Promise<void>;
}

export class DataMapperContext implements IDataMapperContext {

    constructor(
        public model: IDMModel,
        public views: View[] = [],
        public addView: (view: View) => void,
        public applyModifications: (mappings: Mapping[]) => Promise<void>,
        public addArrayElement: (targetField: string) => Promise<void>
    ){}
}
