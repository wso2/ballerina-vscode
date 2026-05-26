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
import { CollapseViewState } from "./collapse";
import { ControlFlowState } from './controlflow';
import { DraftStatementViewState } from "./draft";
import { PlusViewState } from "./plus";
import { SimpleBBox } from "./simple-bbox";
import { ViewState } from "./view-state";
export class BlockViewState extends ViewState {
    public plusButtons: PlusViewState[] = [];
    public connectors = new Map();
    /**
     * @deprecated This property will be removed with the new fold logic implementation
     */
    public collapseView: CollapseViewState = undefined; // TODO: Remove this property

    /**
     * @deprecated This property will be removed with the new fold logic implementation
     */
    public collapsedFrom: number = 0; // TODO: Remove this property


    public collapsedViewStates: CollapseViewState[] = [];
    public isEndComponentAvailable = false;
    public isEndComponentInMain = false;
    public draft: [number, DraftStatementViewState] = undefined;
    public isElseBlock: boolean = false;
    public isDoBlock: boolean = false;
    public isOnErrorBlock: boolean = false;
    public controlFlow = new ControlFlowState();
    public isResource: boolean = false;
    public isCallerAvailable: boolean = false;
    public hasWorkerDecl: boolean = false;
    public workerArrows: SimpleBBox[] = [];
    public workerIndicatorLine: SimpleBBox = new SimpleBBox();
    public functionNodeFilePath?: string = undefined;
    public functionNodeSource?: string = undefined;
    public parentBlock?: any = undefined;
    public expandOffSet?: number = 0;
    public expandConnectorHeight?: number = 0;
    public containsAction?: boolean = false;

    constructor() {
        super();
    }
}
