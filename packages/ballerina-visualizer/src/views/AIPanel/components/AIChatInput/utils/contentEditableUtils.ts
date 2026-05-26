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

import { getCommand } from "../../../commandTemplates/utils/utils";
import { ChatBadgeType } from "../../ChatBadge";
import { Input } from "./inputUtils";

/**
 * A collection of generic DOM-based utilities for a contentEditable field. 
 */

/**
 * Safely get the current Range object, or `null` if not available.
 */
export const getSelectionRange = (): Range | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    return selection.getRangeAt(0);
}

/**
 * Replace any existing ranges in window.getSelection() with the given range.
 */
export const setSelectionRange = (range: Range) => {
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
}

/**
 * Select the first occurrence of `text` inside the contentEditable element.
 */
export function selectText(rootEl: HTMLDivElement, text: string) {
    if (!rootEl || !text) return;

    rootEl.focus();

    requestAnimationFrame(() => {
        const fullText = rootEl.innerText || "";
        const index = fullText.indexOf(text);
        if (index === -1) return; // Not found

        const selection = window.getSelection();
        if (!selection) return;

        const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
        let currentOffset = 0;

        while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            const nodeText = node.textContent || "";
            const nextOffset = currentOffset + nodeText.length;

            if (index >= currentOffset && index + text.length <= nextOffset) {
                const startInNode = index - currentOffset;
                const endInNode = startInNode + text.length;

                const range = document.createRange();
                range.setStart(node, startInNode);
                range.setEnd(node, endInNode);

                selection.removeAllRanges();
                selection.addRange(range);
                break;
            }
            currentOffset = nextOffset;
        }
    });
}

/**
 * Replace the first occurrence of `targetText` with `replacementText`.
 * Preserves the cursor position at the end of the replaced segment.
 */
export const replaceTextWith = (
    rootEl: HTMLDivElement,
    targetText: string,
    replacementText: string,
    onChange?: (val: { text: string }) => void
) => {
    if (!rootEl || !targetText) return;
    rootEl.focus();

    requestAnimationFrame(() => {
        const fullText = rootEl.innerText || "";
        const index = fullText.indexOf(targetText);
        if (index === -1) return;

        const selection = window.getSelection();
        if (!selection) return;

        const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
        let currentOffset = 0;

        while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            const nodeText = node.textContent || "";
            const nextOffset = currentOffset + nodeText.length;

            if (index >= currentOffset && index + targetText.length <= nextOffset) {
                // Found the text in this node — replace in-place
                const startInNode = index - currentOffset;
                const endInNode = startInNode + targetText.length;

                // Modify the text node
                const before = nodeText.slice(0, startInNode);
                const after = nodeText.slice(endInNode);
                node.textContent = before + replacementText + after;

                // Move the cursor right after the replacement
                const newCursorOffset = before.length + replacementText.length;
                const range = document.createRange();
                range.setStart(node, newCursorOffset);
                range.collapse(true);
                setSelectionRange(range);

                // Trigger onChange with the updated HTML
                const newValue = rootEl.innerHTML;
                onChange?.({ text: newValue });

                break;
            }

            currentOffset = nextOffset;
        }
    });
}

/**
 * Determine if the user’s cursor is directly next to a <div> element, as per the original logic.
 */
export const isCursorNextToDiv = (rootEl: HTMLDivElement): boolean => {
    const selectionRange = getSelectionRange();
    if (!selectionRange || !selectionRange.collapsed) return false;

    const { startContainer, startOffset } = selectionRange;

    // Case 1: Cursor is inside a text node
    if (startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = startContainer as Text;
        const textBeforeCursor = textNode.data.slice(0, startOffset);
        if (textBeforeCursor) return false;

        let previousSibling = textNode.previousSibling;
        while (previousSibling) {
            if (previousSibling.nodeType === Node.TEXT_NODE) {
                const siblingText = (previousSibling as Text).textContent || "";
                if (siblingText.length === 0) {
                    previousSibling = previousSibling.previousSibling;
                    continue;
                }
                return false;
            }
            break;
        }
        return (
            previousSibling?.nodeType === Node.ELEMENT_NODE &&
            (previousSibling as HTMLElement).tagName === "DIV"
        );
    }

    // Case 2: Cursor is inside an element node (not text), directly after a <div>
    if (startContainer.nodeType === Node.ELEMENT_NODE) {
        const element = startContainer as HTMLElement;
        if (startOffset === 0) {
            let previous = element.previousSibling;
            while (previous) {
                if (previous.nodeType === Node.TEXT_NODE) {
                    const text = (previous as Text).textContent || "";
                    if (text.length === 0) {
                        previous = previous.previousSibling;
                        continue;
                    }
                    return false;
                }
                break;
            }
            return (
                previous?.nodeType === Node.ELEMENT_NODE &&
                (previous as HTMLElement).tagName === "DIV"
            );
        }

        const childBeforeCursor = element.childNodes[startOffset - 1];
        if (!childBeforeCursor) return false;

        let node = childBeforeCursor;
        while (node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = (node as Text).textContent || "";
                if (text.length === 0) {
                    node = node.previousSibling;
                    continue;
                }
                return false;
            }
            break;
        }

        return node?.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "DIV";
    }

    return false;
}

/**
 * Inserts raw text at the current cursor, optionally removing overlap via `removeOverlapAtCursor`.
 */
export const insertTextAtCursor = (
    rootEl: HTMLDivElement,
    text: string,
    removeOverlapAtCursor: (range: Range, overlapText: string) => void,
    onChange?: (val: { text: string;[key: string]: any }) => void,
    extraParams?: { [key: string]: any }
) => {
    if (!rootEl || !text) return;
    rootEl.focus();

    requestAnimationFrame(() => {
        const range = getSelectionRange();
        if (!range || !range.collapsed || !rootEl.contains(range.endContainer)) return;

        removeOverlapAtCursor(range, text);

        // eslint-disable-next-line deprecation/deprecation
        document.execCommand("insertText", false, text);

        const newValue = rootEl.innerHTML;
        onChange?.({ ...extraParams, text: newValue });
    });
}

/**
 * Inserts an arbitrary HTML string at the cursor, optionally with suffix text.
 * Overlap removal can be applied before insertion (e.g., if the content partially 
 * matches what's already at the cursor).
 */
export const insertHTMLWithSuffixAtCursor = (
    rootEl: HTMLDivElement,
    {
        html,
        suffixText,
        removeOverlapAtCursor,
        overlapText,
        onChange,
        extraParams
    }: {
        html: string;
        suffixText?: string;
        removeOverlapAtCursor: (range: Range, overlapText: string) => void;
        overlapText?: string;
        onChange?: (val: { text: string;[key: string]: any }) => void;
        extraParams?: { [key: string]: any };
    }
) => {
    if (!rootEl || !html) return;
    const range = getSelectionRange();
    if (!range || !range.collapsed || !rootEl.contains(range.endContainer)) return;

    // If we expect an overlap (like with a typed snippet), remove it
    if (overlapText) {
        removeOverlapAtCursor(range, overlapText);
    }

    // Convert the HTML string into live DOM nodes
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // We expect a single root node from the provided HTML (like <span> or <div>)
    const nodeToInsert = tempDiv.firstChild;
    if (!nodeToInsert) return;

    rootEl.focus();

    // Insert the main HTML node
    range.insertNode(nodeToInsert);

    // Optionally append suffix text
    let suffixNode: Text | null = null;
    if (suffixText) {
        suffixNode = document.createTextNode(suffixText);
        range.setStartAfter(nodeToInsert);
        range.setEndAfter(nodeToInsert);
        range.insertNode(suffixNode);
    }

    // Move cursor after everything
    if (suffixNode) {
        range.setStartAfter(suffixNode);
        range.setEndAfter(suffixNode);
    } else {
        range.setStartAfter(nodeToInsert);
        range.setEndAfter(nodeToInsert);
    }
    setSelectionRange(range);

    // Fire onChange
    const newValue = rootEl.innerHTML;
    onChange?.({ ...extraParams, text: newValue });
}

/**
 * Check if the previous element in the DOM is a badge of the given `badgeType`.
 * (We assume the "badge" node might have `data-badge-type` in the DOM.)
 */
export const isPrevElementBadge = (rootEl: HTMLDivElement, badgeType: string): boolean => {
    // Note: we use a string type here because we can’t import BadgeType from React code in this utility
    // We assume the calling code will pass the correct string (like "PRIMARY", etc.).
    if (!rootEl) return false;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(rootEl);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    const fragment = preCaretRange.cloneContents();
    const nodes = Array.from(fragment.childNodes).reverse();

    let hasTrailingText = false;
    let prevElement: HTMLElement | null = null;

    for (const node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = (node as Text).nodeValue;
            if (text && text.trim().length > 0) {
                hasTrailingText = true;
                break;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            prevElement = node as HTMLElement;
            break;
        }
    }

    if (hasTrailingText || !prevElement) return false;
    return prevElement.dataset.badgeType === badgeType;
}

/**
 * Recursively walks through the DOM of `rootEl`, building an Input[] list.
 * - Text nodes become { content: string } if they have length > 0 (including spaces).
 * - Elements with `data-badge-type` become { badgeType, value }.
 * - Other elements get their children traversed further for text or badges.
 */
export const getContentAsInputList = (rootEl: HTMLDivElement): Input[] => {
    const results: Input[] = [];

    function processNode(node: Node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            // If text is non-empty (including spaces), push a TextInput
            if (text && text.length > 0) {
                results.push({ content: text });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;

            // If this node has a 'data-badge-type', treat it as a badge
            const badgeType = el.dataset.badgeType as ChatBadgeType | undefined;
            if (badgeType) {
                const display = el.textContent ?? "";
                const rawValue = el.dataset.rawValue;
                switch (badgeType) {
                    case ChatBadgeType.Command:
                        const command = getCommand(display);
                        if (command) {
                            results.push({
                                badgeType: ChatBadgeType.Command,
                                command: command,
                                display: display,
                                rawValue: rawValue,
                            });
                        } else {
                            results.push({
                                content: display,
                            });
                        }
                        break;
                    case ChatBadgeType.Tag:
                        results.push({
                            badgeType: ChatBadgeType.Tag,
                            display: display,
                            rawValue: rawValue,
                        });
                        break;
                }
            } else {
                // Otherwise, keep traversing child nodes
                for (const child of el.childNodes) {
                    processNode(child);
                }
            }
        }
        // nodeType === COMMENT_NODE, DOCUMENT_NODE, etc. are ignored
    }

    for (const child of rootEl.childNodes) {
        processNode(child);
    }

    return results;
}


/**
 * Handles the `keydown` event for a content-editable `div` with support for badge elements.
 * This function ensures that when the `Backspace` or `Delete` key is pressed, any badge elements
 * (identified by the `data-badge-type` attribute) that intersect with the current selection
 * are removed. It also updates the content and triggers the `onChange` callback with the new value.
 */
export const handleKeyDownWithBadgeSupport = (
    e: React.KeyboardEvent<HTMLDivElement>,
    container: HTMLDivElement | null,
    onChange: (val: { text: string }) => void
): (string[] | null) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !container) return null;

    const range = selection.getRangeAt(0);
    if (!range.collapsed && (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault();

        const badgeElements = container.querySelectorAll("[data-badge-type]");
        const badgesToRemove: Element[] = [];

        badgeElements.forEach((el) => {
            const badgeRange = document.createRange();
            badgeRange.selectNode(el);

            const intersects =
                range.compareBoundaryPoints(Range.END_TO_START, badgeRange) < 0 &&
                range.compareBoundaryPoints(Range.START_TO_END, badgeRange) > 0;

            if (intersects) {
                badgesToRemove.push(el);
            }
        });

        badgesToRemove.forEach((el) => el.remove());
        range.deleteContents();

        selection.removeAllRanges();
        selection.addRange(range);

        const newValue = container.innerHTML;
        onChange?.({ text: newValue });

        const removedBadgeTypes: string[] = badgesToRemove
            .filter((badge): badge is HTMLElement =>
                badge.nodeType === Node.ELEMENT_NODE && !!(badge as HTMLElement).dataset.badgeType
            )
            .map(badge => (badge as HTMLElement).dataset.badgeType as string);

        return removedBadgeTypes;
    }

    // Fallback: Allow normal key handling
    return null;
};
