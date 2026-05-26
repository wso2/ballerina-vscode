/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export const createPlaceholderPlugin = (placeholderText: string) => {
    return new Plugin({
        props: {
            decorations(state) {
                const doc = state.doc;
                // Check if document is empty (only has an empty paragraph)
                if (doc.childCount === 1 && doc.firstChild?.isTextblock && doc.firstChild.content.size === 0) {
                    const placeholderDecoration = Decoration.widget(1, () => {
                        const span = document.createElement("span");
                        span.className = "placeholder";
                        span.textContent = placeholderText;
                        return span;
                    }, { side: -1 });
                    return DecorationSet.create(doc, [placeholderDecoration]);
                }
                return DecorationSet.empty;
            }
        }
    });
};
