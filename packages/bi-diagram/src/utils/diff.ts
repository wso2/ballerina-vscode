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

type NodeMatch = "exact" | "container" | "container-modified" | "modified" | null;

// Exact matches outrank header-equal containers, which outrank content edits, so an
// unchanged sibling is always preferred as an alignment anchor over a modified pairing.
function matchScore(match: NodeMatch): number {
    switch (match) {
        case "exact":
            return 3;
        case "container":
            return 2;
        case "container-modified":
        case "modified":
            return 1;
        default:
            return 0;
    }
}

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

/**
 * Display text of a COMMENT node — shared by the note chip and the diff merge
 * so edit detection and rendering always read the same accessors.
 * (Lives here rather than utils/node.ts to keep this module free of UI imports.)
 */
export function getCommentText(node: FlowNode): string {
    const properties = node.properties as Record<string, { value?: unknown }> | undefined;
    const value = properties?.comment?.value;
    return node.metadata?.description || (typeof value === "string" ? value : "");
}

// Comment text normalized for comparison: whitespace-collapsed, sourceCode fallback.
function commentText(node: FlowNode): string {
    const raw = getCommentText(node) || node.codedata?.sourceCode || "";
    return raw.replace(/\s+/g, " ").trim();
}

// Memoized: alignNodes compares every old/new node pair, so keys are requested O(n·m) times.
const nodeKeyCache = new WeakMap<FlowNode, string>();
function nodeKey(node: FlowNode): string {
    const cached = nodeKeyCache.get(node);
    if (cached !== undefined) {
        return cached;
    }
    const key = computeNodeKey(node);
    nodeKeyCache.set(node, key);
    return key;
}

function computeNodeKey(node: FlowNode): string {
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

// What a node *refers to*, independent of its content: the called symbol for calls
// (org/module/object/symbol) or the declared variable name. Two nodes with the same
// identity but different source are the same node with edited content, not a replacement.
// Returns null for kinds with no identity (RETURN, EXPRESSION, ...).
function nodeIdentityKey(node: FlowNode): string | null {
    const codedata = node.codedata;
    const symbolParts = [codedata?.org, codedata?.module, codedata?.object, codedata?.symbol].filter(Boolean);
    if (symbolParts.length > 0) {
        return `${codedata?.node}:${symbolParts.join("/")}`;
    }
    const properties = node.properties as Record<string, { value?: unknown }> | undefined;
    const variableName = properties?.variable?.value;
    if (typeof variableName === "string" && variableName) {
        return `${codedata?.node}:var:${variableName}`;
    }
    return null;
}

// Text before the first block opening brace, e.g. `if count > 5`, `while true`.
function headerBeforeBrace(text: string): string {
    const braceIndex = text.indexOf("{");
    return braceIndex >= 0 ? text.slice(0, braceIndex) : text;
}

/**
 * Human-readable source of a node for diff UI (the modified-node hover card):
 * containers show only their header, since their sourceCode holds the whole body.
 */
export function getDiffDisplaySource(node: FlowNode): string {
    const source = node.codedata?.sourceCode ?? "";
    const text = hasBranches(node) ? headerBeforeBrace(source) : source;
    return text.trim();
}

// Header of a container node, normalized for comparison.
const containerHeaderKeyCache = new WeakMap<FlowNode, string>();
function containerHeaderKey(node: FlowNode): string {
    const cached = containerHeaderKeyCache.get(node);
    if (cached !== undefined) {
        return cached;
    }
    const source = node.codedata?.sourceCode;
    const key = source
        ? headerBeforeBrace(normalizeSource(stripCommentLines(source)))
        : `kind:${node.codedata?.node}`;
    containerHeaderKeyCache.set(node, key);
    return key;
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
    if (hasBranches(oldNode) && hasBranches(newNode)) {
        // Same container kind: header equal → recurse silently; header edited (condition,
        // iterable, ...) → still recurse, but mark the container itself as modified.
        return containerHeaderKey(oldNode) === containerHeaderKey(newNode) ? "container" : "container-modified";
    }
    const identity = nodeIdentityKey(oldNode);
    if (identity && identity === nodeIdentityKey(newNode)) {
        return "modified";
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

        // A one-for-one replacement by the same kind of identity-less node (RETURN,
        // EXPRESSION, ...) is a content edit: render one modified node, not two lanes.
        // Identity-carrying kinds pair via matchNodes instead, so differing identities
        // (a genuinely different call or variable) still fall through to a hunk.
        const removedCode = removedRun.filter((node) => !isComment(node));
        const addedCode = addedRun.filter((node) => !isComment(node));
        if (removedCode.length === 1 && addedCode.length === 1 && isContentEdit(removedCode[0], addedCode[0])) {
            const removedComments = removedRun.filter(isComment);
            removedComments.forEach((node) => stampNodeDeep(node, "removed"));
            merged.push(...removedComments);
            for (const node of addedRun) {
                if (node === addedCode[0]) {
                    merged.push(markModified(node, removedCode[0]));
                } else {
                    stampNodeDeep(node, "added");
                    merged.push(node);
                }
            }
            return;
        }

        // Comments render as note chips on the following node, never as widgets, so a
        // comment-only lane would render nothing. Comment-only runs are kept out of hunks
        // and flow through inline, stamped so the chip renders the change.
        const removedLane = removedCode.length > 0 ? removedRun : [];
        const addedLane = addedCode.length > 0 ? addedRun : [];
        if (removedCode.length === 0) {
            removedRun.forEach((node) => stampNodeDeep(node, "removed"));
            merged.push(...removedRun);
        }
        if (removedLane.length > 0 || addedLane.length > 0) {
            merged.push(createDiffHunk(removedLane, addedLane, hunkCounter));
        }
        if (addedCode.length === 0) {
            addedRun.forEach((node) => stampNodeDeep(node, "added"));
            merged.push(...addedRun);
        }
    };

    for (const pair of aligned) {
        flushGap(pair.oldIndex, pair.newIndex);
        const oldNode = oldNodes[pair.oldIndex];
        const newNode = newNodes[pair.newIndex];
        if (pair.match === "container" || pair.match === "container-modified") {
            const mergedContainer: FlowNode = {
                ...newNode,
                branches: mergeBranches(oldNode.branches ?? [], newNode.branches ?? [], hunkCounter),
            };
            if (pair.match === "container-modified") {
                mergedContainer.diffState = "modified";
                mergedContainer.diffPreviousText = getDiffDisplaySource(oldNode) || undefined;
            }
            merged.push(mergedContainer);
        } else if (pair.match === "modified") {
            merged.push(markModified(newNode, oldNode));
        } else if (isComment(newNode) && commentText(oldNode) !== commentText(newNode)) {
            // Comments pair positionally, so an edited note lands here as an "exact" match.
            // Mark it modified so the note chip renders the old and new texts.
            merged.push(markModified(newNode, oldNode));
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

function isContentEdit(oldNode: FlowNode, newNode: FlowNode): boolean {
    return (
        oldNode.codedata?.node === newNode.codedata?.node &&
        !hasBranches(oldNode) &&
        !hasBranches(newNode) &&
        nodeIdentityKey(oldNode) === null &&
        nodeIdentityKey(newNode) === null
    );
}

function markModified(newNode: FlowNode, oldNode: FlowNode): FlowNode {
    const previousText = isComment(oldNode) ? commentText(oldNode) : getDiffDisplaySource(oldNode);
    return {
        ...newNode,
        diffState: "modified",
        diffPreviousText: previousText || undefined,
    };
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
            scores[i][j] = Math.max(
                scores[i + 1][j],
                scores[i][j + 1],
                match ? scores[i + 1][j + 1] + matchScore(match) : 0
            );
        }
    }

    const aligned: AlignedPair[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        const match = matchTable[i][j];
        if (match && scores[i][j] === scores[i + 1][j + 1] + matchScore(match)) {
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
