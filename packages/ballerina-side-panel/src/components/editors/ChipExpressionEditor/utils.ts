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

import { INPUT_MODE_MAP, InputMode } from "./types";

export const getInputModeFromTypes = (valueTypeConstraint: string | string[]): InputMode => {
    if (!valueTypeConstraint) return;
    let types: string[];
    if (typeof valueTypeConstraint === 'string') {
        if (valueTypeConstraint.includes('|')) {
            types = valueTypeConstraint.split('|').map(t => t.trim());
        } else {
            types = [valueTypeConstraint];
        }
    } else {
        types = valueTypeConstraint;
    }

    for (let i = 0; i < types.length; i++) {
        if (INPUT_MODE_MAP[types[i]]) {
            return INPUT_MODE_MAP[types[i]];
        }
    }
    return;
};

export const getDefaultExpressionMode = (valueTypeConstraint: string | string[]): InputMode => {
    if (!valueTypeConstraint) throw new Error("Value type constraint is undefined");
    return getInputModeFromTypes(valueTypeConstraint);
}
