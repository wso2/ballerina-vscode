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

import {
    FormField,
    keywords,
} from "@wso2/ballerina-core";


export function isRequiredParam(param: FormField): boolean {
    return !(param.optional || param.defaultable);
}

export function isAllDefaultableFields(recordFields: FormField[]): boolean {
    return recordFields?.every((field) => field.defaultable || (field.fields && isAllDefaultableFields(field.fields)));
}

export function isAnyFieldSelected(recordFields: FormField[]): boolean {
    return recordFields?.some((field) => field.selected || (field.fields && isAnyFieldSelected(field.fields)));
}

export function getSelectedUnionMember(unionFields: FormField): FormField {
    let selectedMember = unionFields.members?.find((member) => member.selected === true);
    if (!selectedMember) {
        selectedMember = unionFields.members?.find(
            (member) => getUnionFormFieldName(member) === unionFields.selectedDataType
        );
    }
    if (!selectedMember) {
        selectedMember = unionFields.members?.find(
            (member) => member.typeName === unionFields.value?.replace(/['"]+/g, "")
        );
    }
    if (!selectedMember && unionFields.members && unionFields.members.length > 0) {
        selectedMember = unionFields.members[0];
    }
    return selectedMember;
}

export function getFieldName(fieldName: string): string {
    return keywords.includes(fieldName) ? "'" + fieldName : fieldName;
}

export function getUnionFormFieldName(field: FormField): string {
    return field.name || field.typeInfo?.name || field.typeName;
}

export function checkFormFieldValue(field: FormField): boolean {
    return field.value !== undefined && field.value !== null;
}

export function updateFieldsSelection(fields: FormField[], selected: boolean): void {
    if (!fields || !fields.length) return;

    fields.forEach(field => {
        // When selecting: only select required fields
        // When deselecting: deselect all fields (both required and optional)
        if (!selected || isRequiredParam(field)) {
            field.selected = selected;
        }

        // Recursively process nested fields
        if (field.fields && field.fields.length > 0) {
            updateFieldsSelection(field.fields, selected);
        }
    });
}
