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
import { Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Node } from 'prosemirror-model';

export const xmlTagDecorationPluginKey = new PluginKey('xmlTagDecoration');

function getDecorations(doc: Node): DecorationSet {
    const decorations: Decoration[] = [];

    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9_-]*)(?:\s[^>]*)?\/?>/g;

    doc.descendants((node, pos) => {
        if (!node.isText || !node.text) {
            return;
        }
        tagPattern.lastIndex = 0;

        let match;
        while ((match = tagPattern.exec(node.text)) !== null) {
            const from = pos + match.index;
            const to = from + match[0].length;

            let type: 'opening' | 'closing' | 'selfClosing' = 'opening';
            if (match[0].startsWith('</')) {
                type = 'closing';
            } else if (match[0].endsWith('/>')) {
                type = 'selfClosing';
            }

            decorations.push(
                Decoration.inline(from, to, {
                    class: `xml-tag xml-tag-${type}`,
                })
            );
        }
    });

    return DecorationSet.create(doc, decorations);
}

export function createXMLTagDecorationPlugin() {
    return new Plugin({
        key: xmlTagDecorationPluginKey,

        state: {
            init(_, state) {
                return getDecorations(state.doc);
            },
            apply(tr: Transaction, oldDecorationSet: DecorationSet, _oldState, newState) {
                if ((tr as any).docChanged) {
                    return getDecorations(newState.doc);
                }
                return oldDecorationSet.map((tr as any).mapping, (tr as any).doc);
            }
        },

        props: {
            decorations(state) {
                return this.getState(state);
            }
        }
    });
}
