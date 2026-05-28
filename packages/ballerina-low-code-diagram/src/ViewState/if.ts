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
import { DefaultConfig } from "../Visitors/default";

import { BlockViewState } from "./block";
import { ElseViewState } from "./else";
import { SimpleBBox } from "./simple-bbox";
import { StatementViewState } from "./statement";

export class IfViewState extends StatementViewState {
    public headIf: SimpleBBox = new SimpleBBox();
    public ifBody: BlockViewState = new BlockViewState();
    public defaultElseVS: ElseViewState = undefined;
    public offSetBetweenIfElse: number = DefaultConfig.horizontalGapBetweenComponents;
    public offSetAtBottom: number = 25;
    public verticalOffset: number = DefaultConfig.offSet;
    public isElseIf: boolean = false;
    public elseIfTopHorizontalLine: SimpleBBox = new SimpleBBox();
    public elseIfBottomHorizontalLine: SimpleBBox = new SimpleBBox();
    public elseIfHeadWidthOffset: number = 0;
    public elseIfHeadHeightOffset: number = 0;
    public elseIfLifeLine: SimpleBBox = new SimpleBBox();
    public childElseIfViewState: IfViewState[];
    public childElseViewState: ElseViewState;
    public isMainIfBody: boolean = false;

    constructor() {
        super();
        this.childElseIfViewState = [];
    }
}
