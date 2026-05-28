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
import { OnFailClause } from "@wso2/syntax-tree";

import { STOP_SVG_HEIGHT } from "../Components/RenderingComponents/End/StopSVG";
import { START_SVG_HEIGHT } from "../Components/RenderingComponents/Start/StartSVG";
import { DefaultConfig } from "../Visitors/default";

import { BlockViewState } from "./block";
import { EndViewState } from "./end";
import { PlusViewState } from "./plus";
import { SimpleBBox } from "./simple-bbox";
import { ViewState } from "./view-state";

export class WorkerDeclarationViewState extends ViewState {
    public topOffset: number = START_SVG_HEIGHT / 2 ;
    public bottomOffset: number = STOP_SVG_HEIGHT + (2 * DefaultConfig.dotGap);
    public lifeLine: SimpleBBox = new SimpleBBox();
    public wrapper: SimpleBBox = new SimpleBBox();
    public trigger: SimpleBBox = new SimpleBBox();
    public workerLine: SimpleBBox = new SimpleBBox();
    public workerBody: BlockViewState = new BlockViewState();
    public end: EndViewState = new EndViewState();
    public initPlus: PlusViewState = undefined;
    public onFail: OnFailClause = undefined;

    constructor() {
        super();
    }
}
