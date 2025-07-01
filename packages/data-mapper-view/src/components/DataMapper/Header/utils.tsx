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
import { INPUT_FIELD_FILTER_LABEL, OUTPUT_FIELD_FILTER_LABEL, SearchTerm, SearchType } from "./HeaderSearchBox";

export function getInputOutputSearchTerms(searchTerm: string): [SearchTerm, SearchTerm] {
    const inputFilter = INPUT_FIELD_FILTER_LABEL;
    const outputFilter = OUTPUT_FIELD_FILTER_LABEL;
    const searchSegments = searchTerm.split(" ");

    const inputSearchTerm = searchSegments.find(segment => segment.startsWith(inputFilter));
    const outputSearchTerm = searchSegments.find(segment => segment.startsWith(outputFilter));

    const searchTerms = searchSegments.filter(segment =>
        !segment.startsWith(inputFilter) && !segment.startsWith(outputFilter));
    const searchTermItem: SearchTerm = {
        searchText: searchTerms.join(" "),
        searchType: undefined,
        isLabelAvailable: false
    };

    return [
        inputSearchTerm ? {
            searchText: inputSearchTerm.substring(inputFilter.length),
            searchType: SearchType.INPUT,
            isLabelAvailable: true
        } : {...searchTermItem, searchType: SearchType.INPUT},
        outputSearchTerm ? {
            searchText: outputSearchTerm.substring(outputFilter.length),
            searchType: SearchType.OUTPUT,
            isLabelAvailable: true
        } : {...searchTermItem, searchType: SearchType.OUTPUT}
    ];
}
