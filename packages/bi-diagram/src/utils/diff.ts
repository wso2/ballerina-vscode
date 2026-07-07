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

import { cloneDeep } from "lodash";
import { Branch, Flow, FlowNode, FlowNodeDiffState } from "./types";

export const DIFF_HUNK_NODE = "DIFF_HUNK";
export const DIFF_REMOVED_BRANCH_LABEL = "Removed";
export const DIFF_ADDED_BRANCH_LABEL = "Added";

type NodeMatch = "exact" | "container" | null;

/**
 * Merges the old and new flow models of the same function into a single flow model
 * where removed and added nodes are grouped into synthetic DIFF_HUNK container nodes.
 * Unchanged nodes come from the new model. Removed/added subtrees are stamped with
 * `diffState` so widgets can render them accordingly.
 */
export function mergeFlowModelsForDiff(oldFlow: Flow, newFlow: Flow): Flow {
    const hunkCounter = { count: 0 };
    const oldNodes = cloneDeep(oldFlow.nodes ?? []);
    const newNodes = cloneDeep(newFlow.nodes ?? []);
    return {
        ...newFlow,
        nodes: mergeNodeLists(oldNodes, newNodes, hunkCounter),
    };
}

/**
 * Stamps every node in the flow (recursively through branches) with the given diff state.
 * Used to tint whole ADDITION/DELETION views. Returns a new flow; input is not mutated.
 */
export function stampDiffState(flow: Flow, state: FlowNodeDiffState): Flow {
    const nodes = cloneDeep(flow.nodes ?? []);
    nodes.forEach((node) => stampNodeDeep(node, state));
    return { ...flow, nodes };
}

function stampNodeDeep(node: FlowNode, state: FlowNodeDiffState): void {
    node.diffState = state;
    node.branches?.forEach((branch) => branch.children?.forEach((child) => stampNodeDeep(child, state)));
}

// Whitespace is stripped entirely so formatter-only differences never register as changes.
function normalizeSource(text: string): string {
    return text.replace(/\s+/g, "");
}

// Full comment lines (`// ...` and doc `# ...`) are trivia: statement sourceCode from the LS
// includes leading comments, so a note edit must not read as a change to the statement itself.
function stripCommentLines(text: string): string {
    return text
        .split("\n")
        .filter((line) => {
            const trimmed = line.trim();
            return !trimmed.startsWith("//") && !trimmed.startsWith("#");
        })
        .join("\n");
}

function isComment(node: FlowNode): boolean {
    return node.codedata?.node === "COMMENT";
}

function nodeKey(node: FlowNode): string {
    // Comments pair positionally regardless of text — a note edit is not a code change.
    if (isComment(node)) {
        return "kind:COMMENT";
    }
    const source = node.codedata?.sourceCode;
    if (source) {
        const normalized = normalizeSource(stripCommentLines(source));
        if (normalized) {
            return normalized;
        }
    }
    return `kind:${node.codedata?.node}|label:${node.metadata?.label ?? ""}`;
}

function hasBranches(node: FlowNode): boolean {
    return Array.isArray(node.branches) && node.branches.length > 0;
}

// Header of a container node: the source up to the first block opening brace,
// e.g. `if count > 5`, `while true`, `foreach var item in items`.
function containerHeaderKey(node: FlowNode): string {
    const source = node.codedata?.sourceCode;
    if (!source) {
        return `kind:${node.codedata?.node}`;
    }
    const normalized = normalizeSource(stripCommentLines(source));
    const braceIndex = normalized.indexOf("{");
    return braceIndex >= 0 ? normalized.slice(0, braceIndex) : normalized;
}

function matchNodes(oldNode: FlowNode, newNode: FlowNode): NodeMatch {
    if (oldNode.codedata?.node !== newNode.codedata?.node) {
        return null;
    }
    // The function start event is never part of the diff; always pair it.
    if (newNode.codedata?.node === "EVENT_START") {
        return "exact";
    }
    if (nodeKey(oldNode) === nodeKey(newNode)) {
        return "exact";
    }
    if (hasBranches(oldNode) && hasBranches(newNode) && containerHeaderKey(oldNode) === containerHeaderKey(newNode)) {
        return "container";
    }
    return null;
}

function mergeNodeLists(oldNodes: FlowNode[], newNodes: FlowNode[], hunkCounter: { count: number }): FlowNode[] {
    const aligned = alignNodes(oldNodes, newNodes);

    const merged: FlowNode[] = [];
    let oldIndex = 0;
    let newIndex = 0;

    const flushGap = (oldEnd: number, newEnd: number) => {
        const removedRun = oldNodes.slice(oldIndex, oldEnd);
        const addedRun = newNodes.slice(newIndex, newEnd);
        oldIndex = oldEnd;
        newIndex = newEnd;

        // Comments render as note chips on the following node, never as widgets, so a
        // comment-only lane would render nothing. Comment-only runs are kept out of hunks:
        // added comments flow through inline (chip on the next node), removed ones drop out.
        const removedLane = removedRun.some((node) => !isComment(node)) ? removedRun : [];
        const addedHasCode = addedRun.some((node) => !isComment(node));
        const addedLane = addedHasCode ? addedRun : [];
        if (removedLane.length > 0 || addedLane.length > 0) {
            merged.push(createDiffHunk(removedLane, addedLane, hunkCounter));
        }
        if (!addedHasCode) {
            merged.push(...addedRun);
        }
    };

    for (const pair of aligned) {
        flushGap(pair.oldIndex, pair.newIndex);
        const oldNode = oldNodes[pair.oldIndex];
        const newNode = newNodes[pair.newIndex];
        if (pair.match === "container") {
            merged.push({
                ...newNode,
                branches: mergeBranches(oldNode.branches ?? [], newNode.branches ?? [], hunkCounter),
            });
        } else {
            merged.push(newNode);
        }
        oldIndex = pair.oldIndex + 1;
        newIndex = pair.newIndex + 1;
    }
    flushGap(oldNodes.length, newNodes.length);

    return merged;
}

function mergeBranches(oldBranches: Branch[], newBranches: Branch[], hunkCounter: { count: number }): Branch[] {
    const unmatchedOld = [...oldBranches];
    const merged: Branch[] = newBranches.map((newBranch) => {
        const oldBranchIndex = unmatchedOld.findIndex(
            (oldBranch) => oldBranch.label === newBranch.label && oldBranch.codedata?.node === newBranch.codedata?.node
        );
        if (oldBranchIndex === -1) {
            newBranch.children?.forEach((child) => stampNodeDeep(child, "added"));
            return newBranch;
        }
        const oldBranch = unmatchedOld.splice(oldBranchIndex, 1)[0];
        return {
            ...newBranch,
            children: mergeNodeLists(oldBranch.children ?? [], newBranch.children ?? [], hunkCounter),
        };
    });

    // Branches removed in the new version are kept (stamped removed) so the user sees them.
    unmatchedOld.forEach((oldBranch) => {
        oldBranch.children?.forEach((child) => stampNodeDeep(child, "removed"));
        merged.push(oldBranch);
    });

    return merged;
}

function createDiffHunk(removedRun: FlowNode[], addedRun: FlowNode[], hunkCounter: { count: number }): FlowNode {
    removedRun.forEach((node) => stampNodeDeep(node, "removed"));
    addedRun.forEach((node) => stampNodeDeep(node, "added"));

    const branches: Branch[] = [];
    if (removedRun.length > 0) {
        branches.push(createHunkBranch(DIFF_REMOVED_BRANCH_LABEL, removedRun));
    }
    if (addedRun.length > 0) {
        branches.push(createHunkBranch(DIFF_ADDED_BRANCH_LABEL, addedRun));
    }

    hunkCounter.count += 1;
    return {
        // No dashes: custom ids derived from this (e.g. `<id>-lastNode` for the end node)
        // are parsed by reverseCustomNodeId, which splits on "-".
        id: `diffhunk${hunkCounter.count}`,
        metadata: { label: "", description: "" },
        codedata: { node: DIFF_HUNK_NODE },
        branches,
        returning: false,
    };
}

function createHunkBranch(label: string, children: FlowNode[]): Branch {
    return {
        label,
        kind: "block",
        codedata: { node: "BODY" },
        repeatable: "ONE",
        properties: {},
        children,
    };
}

interface AlignedPair {
    oldIndex: number;
    newIndex: number;
    match: NodeMatch;
}

// Longest-common-subsequence alignment between the two node lists.
// Exact matches are weighted above container (header-only) matches so an unchanged
// sibling is preferred over pairing with a changed container of the same kind.
function alignNodes(oldNodes: FlowNode[], newNodes: FlowNode[]): AlignedPair[] {
    const n = oldNodes.length;
    const m = newNodes.length;
    const matchTable: NodeMatch[][] = [];
    for (let i = 0; i < n; i++) {
        matchTable.push([]);
        for (let j = 0; j < m; j++) {
            matchTable[i].push(matchNodes(oldNodes[i], newNodes[j]));
        }
    }

    const scores: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            const match = matchTable[i][j];
            const matchScore = match === "exact" ? 2 : match === "container" ? 1 : 0;
            scores[i][j] = Math.max(
                scores[i + 1][j],
                scores[i][j + 1],
                match ? scores[i + 1][j + 1] + matchScore : 0
            );
        }
    }

    const aligned: AlignedPair[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        const match = matchTable[i][j];
        const matchScore = match === "exact" ? 2 : match === "container" ? 1 : 0;
        if (match && scores[i][j] === scores[i + 1][j + 1] + matchScore) {
            aligned.push({ oldIndex: i, newIndex: j, match });
            i++;
            j++;
        } else if (scores[i + 1][j] >= scores[i][j + 1]) {
            i++;
        } else {
            j++;
        }
    }
    return aligned;
}
