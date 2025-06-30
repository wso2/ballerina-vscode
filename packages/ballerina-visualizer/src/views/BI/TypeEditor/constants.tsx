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

import { Icon } from "@wso2/ui-toolkit";
import type { TypeHelperOperator } from "@wso2/type-editor";

export const TYPE_HELPER_OPERATORS: TypeHelperOperator[] = [
    {
        name: 'Convert type to array',
        getIcon: () => <Icon name="type-array" />,
        insertType: 'global',
        insertText: '[]',
        insertLocation: 'end'
    },
    {
        name: 'Add union type',
        getIcon: () => <Icon name="type-union" />,
        insertType: 'local',
        insertText: '|'
    },
    {
        name: 'Convert to nil type',
        getIcon: () => <Icon name="type-optional" />,
        insertType: 'global',
        insertText: '?',
        insertLocation: 'end'
    },
    {
        name: 'Convert to readonly type',
        getIcon: () => <Icon name="type-readonly" />,
        insertType: 'global',
        insertText: 'readonly',
        insertLocation: 'start'
    }
];
