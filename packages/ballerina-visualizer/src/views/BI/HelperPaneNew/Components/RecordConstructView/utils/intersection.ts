/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { TypeField } from "@wso2/ballerina-core";

// `readonly & record { ... }` arrives from the language server as an
// `intersection` whose members are a `readonly` marker and the inner record.
// The record editor only knows how to render `record`, so we unwrap the
// inner record before handing it to the form. The send path uses that same
// inner record directly — `typeInfo` carries the `readonly & record` identity,
// and the LS rejects `intersection` typeName when generating a record literal.

export function isIntersectionRecord(tf: TypeField | null | undefined): boolean {
    if (!tf || tf.typeName !== "intersection" || !Array.isArray(tf.members)) {
        return false;
    }
    return tf.members.some(m => m?.typeName === "record");
}

export function unwrapIntersectionRecord(tf: TypeField): TypeField {
    if (!isIntersectionRecord(tf)) {
        return tf;
    }
    const record = tf.members!.find(m => m?.typeName === "record")!;
    const merged: TypeField = { ...record };
    if (tf.name !== undefined) merged.name = tf.name;
    if (tf.typeInfo !== undefined) merged.typeInfo = tf.typeInfo;
    if (tf.documentation !== undefined && record.documentation === undefined) {
        merged.documentation = tf.documentation;
    }
    if (tf.optional !== undefined) merged.optional = tf.optional;
    if (tf.defaultable !== undefined) merged.defaultable = tf.defaultable;
    if (tf.selected !== undefined) merged.selected = tf.selected;
    return merged;
}

