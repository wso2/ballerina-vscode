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

import { Branch, FlowNode } from "./types";

const WORKFLOW_NODE_KINDS = new Set(["WORKFLOW_RUN", "ACTIVITY_CALL", "SEND_DATA", "WAIT_DATA"]);

export function getNodeIdFromModel(node: FlowNode, prefix?: string) {
    if (!node) {
        return null;
    }
    if (prefix) {
        return `${prefix}-${node.id}`;
    }
    return node.id;
}

export function getBranchLabel(branch: Branch): string {
    return branch.properties?.condition?.value?.toString().trim() || branch.label;
}

export function getCustomNodeId(nodeId: string, label: string, branchIndex?: number, suffix?: string) {
    return `${nodeId}-${label}${branchIndex ? `-${branchIndex}` : ""}${suffix ? `-${suffix}` : ""}`;
}

export function reverseCustomNodeId(customNodeId: string) {
    const parts = customNodeId.split("-");
    const nodeId = parts[0];
    const label = parts[1];
    const branchIndex = parts.length > 3 ? parseInt(parts[3]) : undefined;
    const suffix = parts.length > 4 ? parts.slice(4).join("-") : undefined;
    return { nodeId, label, branchIndex, suffix };
}

export function getBranchInLinkId(nodeId: string, branchLabel: string, branchIndex: number) {
    return `${nodeId}-${branchLabel}-branch-${branchIndex}-in-link`;
}

const nodeContainsNonEmptyDiagnostics = (node: FlowNode) => {
    if (!node?.properties) {
        return false;
    }
    return Object.keys(node.properties).some((key) => {
        const property = node.properties[key];
        if (property?.types?.length === 1 && property.types[0].fieldType === "REPEATABLE_LIST") {
            const diagnostics = property.value?.map((item: any) => item?.diagnostics?.diagnostics).flat().filter(dg => dg?.severity === "ERROR");
            return diagnostics?.length > 0;
        }
        return (property?.diagnostics?.diagnostics?.length > 0);
    });
}

export function nodeHasError(node: FlowNode) {
    if (!node) {
        return false;
    }

    // Check node
    if (node.diagnostics && node.diagnostics.hasDiagnostics) {
        if (node.diagnostics.diagnostics) {
            return node.diagnostics.diagnostics?.some((diagnostic) => diagnostic.severity === "ERROR");
        }
        else if (nodeContainsNonEmptyDiagnostics(node)) {
            return true;
        }
    }

    // Check branch properties
    if (node.branches) {
        return node.branches.some((branch) => {
            if (!branch.properties) {
                return false;
            }
            return Object.values(branch.properties).some((property) =>
                property?.diagnostics?.diagnostics?.some((diagnostic) => diagnostic.severity === "ERROR")
            );
        });
    }

    // Check properties
    if (node.properties) {
        const hasPropertyError = Object.values(node.properties).some((property) =>
            property?.diagnostics?.diagnostics?.some((diagnostic) => diagnostic.severity === "ERROR")
        );
        if (hasPropertyError) {
            return true;
        }
    }

    return false;
}

export function isWorkflowNode(nodeOrKind?: FlowNode | string) {
    if (!nodeOrKind) {
        return false;
    }

    const nodeKind = typeof nodeOrKind === "string" ? nodeOrKind : nodeOrKind.codedata?.node;
    return typeof nodeKind === "string" && WORKFLOW_NODE_KINDS.has(nodeKind);
}

export function getNodeTitle(node: FlowNode) {
    const getPropertyString = (key: string): string | undefined => {
        const value = (node.properties as any)?.[key]?.value;
        return typeof value === "string" ? value.trim() : undefined;
    };
    const getFunctionName = (value?: string): string | undefined => {
        if (!value) {
            return undefined;
        }

        return value
            .trim()
            .replace(/^["']|["']$/g, "")
            .split(":")
            .pop()
            ?.split("(")[0]
            ?.trim();
    };

    if (node.codedata?.node === "WAIT") {
        const directExpression = getPropertyString("expression");
        if (directExpression) {
            return `wait : ${directExpression}`;
        }

        const futuresValue = (node.properties as any)?.["futures"]?.value;
        if (futuresValue && typeof futuresValue === "object") {
            for (const future of Object.values(futuresValue as Record<string, any>)) {
                const expression = future?.value?.expression?.value;
                if (typeof expression === "string" && expression.trim()) {
                    return `wait : ${expression.trim()}`;
                }
            }
        }
        return "wait";
    }

    if (node.codedata?.node === "ACTIVITY_CALL") {
        const activityFunction =
            getFunctionName(getPropertyString("activityFunction")) ||
            getFunctionName(typeof node.codedata?.symbol === "string" ? node.codedata.symbol : undefined);
        if (activityFunction) {
            return activityFunction;
        }
    }

    if (node.codedata?.node === "WORKFLOW_RUN") {
        const processFunction = getFunctionName(getPropertyString("processFunction"));
        if (processFunction) {
            return `Run ${processFunction}`;
        }
    }

    const label = node.metadata.label.includes(".") ? node.metadata.label.split(".").pop() : node.metadata.label;

    if (node.codedata?.org === "ballerina" || node.codedata?.org === "ballerinax") {
        const module = node.codedata.module?.includes(".")
            ? node.codedata.module.split(".").pop()
            : node.codedata.module;
        return `${module} : ${label}`;
    }
    return label;
}

export function getRawTemplate(text: string) {
    const rawTemplateRegex = /^`.+$`/
    const isRawTemplate = text.match(rawTemplateRegex)?.[0];
    if (!isRawTemplate) {
        return `\`${text}\``;
    }

    return text;
}
