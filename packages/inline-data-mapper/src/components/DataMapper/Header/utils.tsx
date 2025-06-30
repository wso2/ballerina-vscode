/*
 * Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein is strictly forbidden, unless permitted by WSO2 in accordance with
 * the WSO2 Commercial License available at http://wso2.com/licenses.
 * For specific language governing the permissions and limitations under
 * this license, please see the license as well as any agreement you’ve
 * entered into with WSO2 governing the purchase of this software and any
 * associated services.
 */
import { INPUT_FIELD_FILTER_LABEL, OUTPUT_FIELD_FILTER_LABEL, SearchTerm, SearchType } from "./HeaderSearchBox";
import { View } from "../Views/DataMapperView";

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

export function getFilterExpression(callExpr: any): Node | undefined {
    // const firstArg = callExpr.getArguments()[0];
    let filterExpr: Node;

    // if (firstArg && Node.isArrowFunction(firstArg)) {
    //     const arrowFnBody = firstArg.getBody();
    //     filterExpr = arrowFnBody;

    //     if (Node.isBlock(arrowFnBody)) {
    //         const returnStmt = arrowFnBody.getStatementByKind(SyntaxKind.ReturnStatement);
    //         filterExpr = returnStmt ? returnStmt.getExpression() : filterExpr;
    //     }
    // }

    return filterExpr;
}

export function extractLastPartFromLabel(targetLabel: string): string | null {
    const regexPatterns = [
        /\.([^.\['"\]]+)$/, // Matches the last part after a dot
        /\["([^"]+)"\]$/,   // Matches the last part inside double quotes brackets
        /\['([^']+)'\]$/    // Matches the last part inside single quotes brackets
    ];

    for (const pattern of regexPatterns) {
        const match = targetLabel.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return targetLabel;
}
