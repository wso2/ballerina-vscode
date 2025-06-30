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
import Mousetrap from "mousetrap";

export class KeyboardNavigationManager {
    path: string;
    content: string;
    undoStack: Map<string, string[]>;
    redoStack: Map<string, string[]>;
    trap: Mousetrap.MousetrapInstance;
    static instance : KeyboardNavigationManager;

    private constructor() {
        this.undoStack = new Map();
        this.redoStack = new Map();
        this.trap = new Mousetrap();
    }

    public static getClient() {
        if (!this.instance){
            this.instance = new KeyboardNavigationManager();
        }
        return this.instance;
    }

    public bindNewKey(key: string | string[], callbackFunction: (args: any) => void, args?: any) {
        this.trap.bind(key, () => {
            callbackFunction(args);
            return false;
        });
    }

    public resetMouseTrapInstance() {
        this.trap.reset()
    }
}
