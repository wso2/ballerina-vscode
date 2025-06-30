import { LinePosition } from "@wso2/ballerina-core";
import {
    CaptureBindingPattern,
    LetExpression,
    ModulePart,
    NodePosition,
    STKindChecker,
    STNode
} from "@wso2/syntax-tree";
import {
    Location,
    LocationLink
} from "vscode-languageserver-types";

import { FnDefInfo } from "../components/Diagram/utils/fn-definition-store";
import { LangClientRpcClient } from "@wso2/ballerina-rpc-client";

export interface FunctionInfo {
    fnDefInfo: FnDefInfo;
    fnNamePosition: NodePosition;
}

export function isObject(item: unknown) {
    return (typeof item === "object" && !Array.isArray(item) && item !== null);
}

export function isPositionsEquals(position1: NodePosition, position2: NodePosition): boolean {
    return position1?.startLine === position2?.startLine &&
        position1?.startColumn === position2?.startColumn &&
        position1?.endLine === position2?.endLine &&
        position1?.endColumn === position2?.endColumn;
}

export function containsWithin(
    filePath1: string,
    filePath2: string,
    position1: NodePosition,
    position2: NodePosition) {
    return (filePath1 === filePath2) &&
    (position1.startLine >= position2.startLine &&
        position1.endLine <= position2.endLine)
}

export function genLetClauseVariableName(intermediateClauses: (STNode)[]): string {
    const baseName = 'variable';
    let index = 0;
    const allVariableNames: string[] = []

    for (const clause of intermediateClauses) {
        if (STKindChecker.isLetClause(clause)) {
            for (const item of clause.letVarDeclarations) {
                if (STKindChecker.isLetVarDecl(item)) {
                    allVariableNames.push(item.typedBindingPattern.bindingPattern.source.trim())
                }
            }
        }else if (STKindChecker.isJoinClause(clause)){
            allVariableNames.push((clause?.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName?.value)
        }
    }
    while (allVariableNames.includes(`${baseName}${index ? index : ""}`)){
        index++;
    }

    return `${baseName}${index ? index : ""}`;
}

export function genLetExpressionVariableName(letExpressions: LetExpression[]): string {
    const baseName = 'variable';
    let varName = baseName;
    let index = 0;

    if (!letExpressions.some(expr => expr === undefined)) {
        for (const expr of letExpressions) {
            for (const decl of expr.letVarDeclarations) {
                if (STKindChecker.isLetVarDecl(decl) && decl.typedBindingPattern.bindingPattern.source.trim() === varName) {
                    index++;
                    varName = baseName + index.toString();
                }
            }
        }
    }
    return varName;
}

export async function getFnDefsForFnCalls(
    fnCallPositions: LinePosition[],
    fileUri: string,
    langServerRpcClient: LangClientRpcClient): Promise<FnDefInfo[]> {

    const fnDefs: FnDefInfo[] = [];
    const fnInfo: Map<string, FunctionInfo[]> = new Map();
    for (const position of fnCallPositions) {
        const definition = await langServerRpcClient.definition({
            position: {
                line: position.line,
                character: position.offset
            },
            textDocument: {
                uri: fileUri
            }
        });
        const reply = definition.location;
        let defLoc: Location;
        if (Array.isArray(reply)) {
            if (!reply.length) {
                return [];
            }
            if (isLocationLink(reply[0])) {
                defLoc = {
                    uri: reply[0].targetUri,
                    range: reply[0].targetRange
                };
            } else {
                defLoc = reply[0];
            }
        } else {
            defLoc = reply;
        }
        const fnNamePosition: NodePosition = {
            startLine: defLoc.range.start.line,
            startColumn: defLoc.range.start.character,
            endLine: defLoc.range.end.line,
            endColumn: defLoc.range.end.character
        }

        const fnEntry: FunctionInfo = {
            fnDefInfo: {
                fnCallPosition: position,
                fnDefPosition: undefined,
                fnName: "",
                fileUri: defLoc.uri,
                isExprBodiedFn: false,
            },
            fnNamePosition
        }
        if (fnInfo.has(defLoc.uri)) {
            const existingDefs = fnInfo.get(defLoc.uri);
            existingDefs.push(fnEntry);
            fnInfo.set(defLoc.uri, existingDefs);
        } else {
            fnInfo.set(defLoc.uri, [fnEntry]);
        }
    }

    for (const [key, value] of fnInfo) {
        const stResp = await langServerRpcClient.getST({
            documentIdentifier: {
                uri: key
            }
        });

        if (stResp.parseSuccess) {
            const modPart = stResp.syntaxTree as ModulePart;
            modPart.members.forEach((mem) => {
                if (STKindChecker.isFunctionDefinition(mem)) {
                    const fnNamePosition = mem.functionName.position as NodePosition;
                    const filteredFnDef = value.find(v => {
                        return isPositionsEquals(v.fnNamePosition, fnNamePosition)
                    });
                    if (filteredFnDef) {
                        filteredFnDef.fnDefInfo.isExprBodiedFn = STKindChecker.isExpressionFunctionBody(mem.functionBody);
                        filteredFnDef.fnDefInfo.fnDefPosition = mem.position;
                        filteredFnDef.fnDefInfo.fnName = mem.functionName.value;
                        fnDefs.push(filteredFnDef.fnDefInfo);
                    }
                }
            });
        }
    }

    return fnDefs;
}

export function hasErrorDiagnosis(stNode: STNode): boolean {
    const diagnostics = stNode.typeData?.diagnostics;
    return diagnostics?.some((diag: any) => {
        const severity = diag?.diagnosticInfo?.severity;
        return severity !== "WARNING";
    });
}

function isLocationLink(obj: any): obj is LocationLink {
    return obj.targetUri !== undefined && obj.targetRange !== undefined;
}
