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

import { NMD_Metadata as Metadata } from "../../interfaces/metadata-types";
// import { Node } from "../../interfaces/bi";

export function encodeMetadata(obj: Metadata): string {
    return btoa(encodeURIComponent(JSON.stringify(obj)));
}

export function decodeMetadata(str: string): Metadata {
    return JSON.parse(decodeURIComponent(atob(str)));
}

// export function getNodeMetadata(node: Node): Metadata | undefined {
//     if (!node.metadata) return undefined;
//     // if metadata is already encoded, decode it first
//     if (typeof node.metadata === "string") return decodeMetadata(node.metadata);
//     return node.metadata;
// }

// export function getEncodedNodeMetadata(node: Node): string | undefined {
//     if (!node.metadata) return undefined;
//     // if metadata is already encoded, return it
//     if (typeof node.metadata === "string") return node.metadata;
//     return encodeMetadata(node.metadata);
// }
