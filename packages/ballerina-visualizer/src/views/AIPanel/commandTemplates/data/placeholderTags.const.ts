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

import { Command } from '@wso2/ballerina-core';
import { Tag } from '../models/tag.model';
import { commandTemplates } from './commandTemplates.const';

type CommandTemplates = typeof commandTemplates;

export type PlaceholderTagMap = {
    [C in keyof CommandTemplates]: {
        [T in CommandTemplates[C][number]['id']]: {
            [P in Extract<CommandTemplates[C][number], { id: T }>['placeholders'][number]['id']]: Tag[];
        };
    };
};

// NOTE: if the placeholders are known at compiletime, define here, otherwise inject at runtime.
export const placeholderTags: PlaceholderTagMap = {
    [Command.Code]: {
        'wildcard': {},
        'generate-code': {
            usecase: [],
        },
        'generate-from-readme': {},
    },
    [Command.Tests]: {
        'tests-for-service': {
            servicename: [],
        },
        'tests-for-function': {
            methodPath: [],
        },
    },
    [Command.DataMap]: {
        'mappings-for-records': {
            inputRecords: [],
            outputRecord: [],
            functionName: [],
        },
        'mappings-for-function': {
            functionName: []
        }
    },
    [Command.TypeCreator]: {
        'types-for-attached': {}
    },
    [Command.Healthcare]: {
        'wildcard': {},
    },
    [Command.Ask]: {
        'wildcard': {},
    },
    [Command.NaturalProgramming]: {
    },
    [Command.OpenAPI]: {
        'wildcard': {},
    },
};
