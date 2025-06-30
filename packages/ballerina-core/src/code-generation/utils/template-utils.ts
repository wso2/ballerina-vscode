/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { compile } from "handlebars";
import templates from "../templates";

export interface TemplateStructure {
    name: TemplateKey;
    config: { [key: string]: any };
}

export type TemplateKey = 'ASYNC_SEND_ACTION' | 'ASYNC_RECEIVE_ACTION' | 'CODE_BLOCK_NODE' | 'ANNOTATION' | 'SWITCH_NODE' |
    'IF_BLOCK' | 'ELSE_BLOCK' | 'ELSEIF_BLOCK' | 'CALLER_ACTION' | 'CALLER_BLOCK' | 'RESPOND' | 'RETURN_BLOCK' | 'TRANSFORM_NODE' |
    'TRANSFORM_FUNCTION' | 'START_NODE' | 'UNION_EXPRESSION' | 'FUNCTION_RETURN' | "TRANSFORM_FUNCTION_CALL" | "TRANSFORM_FUNCTION_WITH_BODY";


export function getComponentSource(template : TemplateStructure) : string {
    const hbTemplate = compile(templates[template.name]);
    return hbTemplate(template.config);
}
