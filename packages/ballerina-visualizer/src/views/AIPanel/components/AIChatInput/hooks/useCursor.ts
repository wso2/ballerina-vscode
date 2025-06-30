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

import { useCallback, RefObject } from "react";

/**
 * A hook that encapsulates cursor manipulation logic for a contentEditable element.
 *
 * @param divRef A ref object pointing to the contentEditable <div>.
 */
export function useCursor(divRef: RefObject<HTMLDivElement>) {
    /**
     * Returns the current cursor position (number of characters from the start).
     */
    const getCursorPosition = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();

            if (divRef.current) {
                preCaretRange.selectNodeContents(divRef.current);
            }
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            return preCaretRange.toString().length;
        }
        return 0;
    }, [divRef]);

    /**
     * Moves cursor to the specified `position` within the <div> text.
     */
    const setCursorToPosition = useCallback((element: HTMLDivElement, position: number) => {
        const range = document.createRange();
        const selection = window.getSelection();

        // Clamp
        const maxLength = element.textContent?.length ?? 0;
        const clampedPos = Math.max(Math.min(position, maxLength), 0);

        let currentPos = 0;
        let found = false;

        for (const node of element.childNodes) {
            const nodeTextLength = node.textContent?.length ?? 0;
            if (currentPos + nodeTextLength >= clampedPos) {
                // If position is inside this node
                if (node.nodeType === Node.TEXT_NODE) {
                    range.setStart(node, clampedPos - currentPos);
                } else {
                    range.setStart(node, Math.min(clampedPos - currentPos, node.childNodes.length));
                }
                found = true;
                break;
            }
            currentPos += nodeTextLength;
        }

        // If position exceeds total text, place cursor at the end
        if (!found) {
            range.setStart(element, element.childNodes.length);
        }

        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
    }, []);

    /**
     * Removes any substring overlap if the text about to be inserted partially
     * matches text at the left of the cursor.
     */
    const removeOverlapAtCursor = useCallback((range: Range, text: string) => {
        let container = range.endContainer;
        let offset = range.endOffset;

        // If we're inside an element, try to get the child node at cursor position
        if (container.nodeType === Node.ELEMENT_NODE) {
            const element = container as HTMLElement;
            const childNode = element.childNodes[offset - 1] || element.childNodes[offset];
            if (childNode?.nodeType === Node.TEXT_NODE) {
                container = childNode;
                offset = (childNode as Text).data.length;
            }
        }

        if (container.nodeType === Node.TEXT_NODE) {
            const textNode = container as Text;
            const textBeforeCursor = textNode.data.slice(0, offset);

            let overlapLength = 0;
            for (let i = 1; i <= textBeforeCursor.length; i++) {
                const slice = textBeforeCursor.slice(-i);
                if (text.startsWith(slice)) {
                    overlapLength = i;
                }
            }

            if (overlapLength > 0) {
                range.setStart(textNode, offset - overlapLength);
                range.setEnd(textNode, offset);
                range.deleteContents();
            }
        }
    }, []);

    return {
        getCursorPosition,
        setCursorToPosition,
        removeOverlapAtCursor,
    };
}
