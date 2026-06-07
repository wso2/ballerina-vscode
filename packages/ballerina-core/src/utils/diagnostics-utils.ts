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
import { NodePosition } from "@wso2/syntax-tree";
import { Diagnostic } from "vscode-languageserver-types";

export function getSelectedDiagnostics(
    diagnostics: Diagnostic[],
    targetPosition: NodePosition,
    snippetColumn: number,
    inputLength: number,
    startExtraColumns: number = 0,
    endExtraColumns: number = 0,
    startExtraRows: number = 0,
    endExtraRows: number = 0,
): Diagnostic[] {
    const { startLine, endLine, startColumn } = targetPosition || {};
    const inputStartCol = startColumn + snippetColumn - startExtraColumns - 1;
    const inputEndCol = startColumn + snippetColumn + inputLength + endExtraColumns - 1;
    const inputStartLine = startLine + startExtraRows;
    const inputEndLine = endLine + endExtraRows;

    const filteredDiagnostics = diagnostics.filter((diagnostic) => {
        const isError = diagnostic.severity === 1;
        const { start, end } = diagnostic.range || {};
        const diagnosticStartCol = start?.character;
        const diagnosticEndCol = end?.character;
        const diagnosticStartLine = start?.line;
        const diagnosticEndLine = end?.line;
        return isError && inputStartLine <= diagnosticStartLine && inputEndLine >= diagnosticEndLine && diagnosticEndCol >= inputStartCol && diagnosticStartCol <= inputEndCol;
    });

    return filteredDiagnostics;
}

/** Messages to be ignored when displaying diagnostics in expression editor */
export const IGNORED_DIAGNOSTIC_MESSAGES: string[] = [`invalid token ';'`];

export function getFilteredDiagnostics(diagnostics: Diagnostic[], isCustomStatement: boolean, isStartWithSlash?: boolean) {
    const selectedDiagnostics =  diagnostics
        .filter(diagnostic =>
            !IGNORED_DIAGNOSTIC_MESSAGES.includes(diagnostic.message.toString()) && diagnostic.severity === 1);

    if (selectedDiagnostics.length && isStartWithSlash) {
        if (selectedDiagnostics[0]?.code === "BCE0400") {
            selectedDiagnostics[0].message = "resource path cannot begin with a slash"
        }
    }
    return selectedDiagnostics;
}
