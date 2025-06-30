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
import { IOType, Mapping, TypeKind } from "@wso2/ballerina-core";
import { useDMSearchStore } from "../../../store/store";

export const getSearchFilteredInput = (dmType: IOType, varName?: string) => {
	const searchValue = useDMSearchStore.getState().inputSearch;
	if (!searchValue) {
		return dmType;
	}

	if (varName?.toLowerCase()?.includes(searchValue.toLowerCase())) {
		return dmType
	} else if (dmType.kind === TypeKind.Record || dmType.kind === TypeKind.Array) {
		const filteredType = getFilteredSubFields(dmType, searchValue);
		if (filteredType) {
			return filteredType
		}
	}
}

export const getSearchFilteredOutput = (outputType: IOType) => {
	const searchValue = useDMSearchStore.getState().outputSearch;
	if (!outputType) {
		return null
	}
	if (!searchValue) {
		return outputType;
	}

	let searchType: IOType = outputType;

	if (searchType.kind === TypeKind.Array) {
		const subFields = searchType.member?.fields
			?.map(item => getFilteredSubFields(item, searchValue))
			.filter(item => item);

		return {
			...searchType,
			memberType: {
				...searchType.member,
				fields: subFields || []
			}
		}
	} else if (searchType.kind === TypeKind.Record) {
		const subFields = searchType.fields
			?.map(item => getFilteredSubFields(item, searchValue))
			.filter(item => item);

		return {
			...searchType,
			fields: subFields || []
		}
	}
	return  null;
}

export const getFilteredSubFields = (field: IOType, searchValue: string) => {
	if (!field) {
		return null;
	}

	if (!searchValue) {
		return field;
	}

	if (field.kind === TypeKind.Record) {
		const matchedSubFields: IOType[] = field.fields
			?.map((fieldItem) => getFilteredSubFields(fieldItem, searchValue))
			.filter((fieldItem): fieldItem is IOType => fieldItem !== null);

		const matchingName = field.variableName?.toLowerCase().includes(searchValue.toLowerCase());
		if (matchingName || matchedSubFields?.length > 0) {
			return {
				...field,
				fields: matchingName ? field.fields : matchedSubFields
			}
		}
	} else if (field.kind === TypeKind.Array) {
		const matchedSubFields: IOType[] = field.member?.fields
			?.map((fieldItem) => getFilteredSubFields(fieldItem, searchValue))
			.filter((fieldItem): fieldItem is IOType => fieldItem !== null);

		const matchingName = field.variableName?.toLowerCase().includes(searchValue.toLowerCase());
		if (matchingName || matchedSubFields?.length > 0) {
			return {
				...field,
				memberType: {
					...field.member,
					fields: matchingName ? field.member?.fields : matchedSubFields
				}
			}
		}
	} else {
		return field.variableName?.toLowerCase()?.includes(searchValue.toLowerCase()) ? field : null
	}

	return null;
}

export function hasNoOutputMatchFound(outputType: IOType, filteredOutputType: IOType): boolean {
	const searchValue = useDMSearchStore.getState().outputSearch;

	if (!searchValue) {
		return false;
	} else if (outputType.kind === TypeKind.Record && filteredOutputType.kind === TypeKind.Record) {
		return filteredOutputType?.fields.length === 0;
	} else if (outputType.kind === TypeKind.Array && filteredOutputType.kind === TypeKind.Array) {
		// Handle array output
	}
	return false;
}

export function getFilteredMappings(mappings: Mapping[], searchValue: string): Mapping[] {
    return mappings.flatMap(mapping => {
        const outputField = mapping.output.split(".").pop();
        const isCurrentMappingMatched = searchValue === "" || 
            outputField.toLowerCase().includes(searchValue.toLowerCase());
        
        // Get nested mappings from elements
        const nestedMappings = mapping.elements?.flatMap(element => 
            getFilteredMappings(element.mappings, searchValue)
        ) || [];
        
        // Return current mapping if matched, along with any nested matches
        return isCurrentMappingMatched ? [mapping, ...nestedMappings] : nestedMappings;
    });
}
