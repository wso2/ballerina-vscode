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

import { MutableRefObject } from 'react';
import { TypeHelperCategory } from '.';

export const isTypePanelOpen = (activePanelIndex: number) => {
    return activePanelIndex === 0;
};

export const getTypeCreateText = (
    typeName: string,
    referenceTypes: TypeHelperCategory[],
    newTypeName: MutableRefObject<string>
) => {
    if (!typeName) {
        newTypeName.current = '';
        return 'Create New Type';
    }

    const isValidType = typeName.match(/^[a-zA-Z_'][a-zA-Z0-9_]*$/);
    if (!isValidType) {
        newTypeName.current = '';
        return 'Create New Type';
    }

    let typeExists: boolean = false;
    for (const category of referenceTypes) {
        if (category.items.find((item) => item.name === typeName)) {
            typeExists = true;
            break;
        }
    }

    if (!typeExists) {
        newTypeName.current = typeName;
        return `Add Type: ${typeName}`;
    } else {
        newTypeName.current = '';
        return 'Create New Type';
    }
};
