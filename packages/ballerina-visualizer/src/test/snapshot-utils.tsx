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

import { prettyDOM } from "@testing-library/dom";

/**
 * Emotion-normalized snapshot helpers (ported from
 * packages/bi-diagram/src/test/Diagram.test.tsx).
 *
 * Why this exists: a plain DOM snapshot is brittle against Emotion's generated
 * class hashes (`css-1a2b3c`). When `styled` definitions move — e.g. during a
 * refactor that EXTRACTS sub-components — the hash can change even though the
 * rendered structure is identical. These helpers rewrite every `css-<hash>` to
 * a deterministic `css-0`, `css-1`, ... in first-appearance order, so the
 * snapshot reflects STRUCTURE, not volatile hashes. Component extraction that
 * preserves the rendered DOM therefore produces an unchanged snapshot.
 */

/**
 * Extract the Emotion CSS rules from <style data-emotion> tags, filtered to only
 * the class hashes actually present in the given container.
 */
export function getEmotionStyles(container: HTMLElement): string {
    const domContent = container.innerHTML;
    const usedHashes = new Set<string>();
    const hashRegex = /css-([a-z0-9]+)/g;
    let match: RegExpExecArray | null;
    while ((match = hashRegex.exec(domContent)) !== null) {
        usedHashes.add(match[1]);
    }

    // Emotion uses insertRule (speedy mode) so CSS lives in styleSheets.cssRules, not textContent.
    const relevantRules: string[] = [];
    const styleTags = document.querySelectorAll("style[data-emotion]");
    styleTags.forEach((tag) => {
        if (tag instanceof HTMLStyleElement && tag.sheet) {
            try {
                Array.from(tag.sheet.cssRules).forEach((rule) => {
                    const ruleText = rule.cssText;
                    const ruleHashMatch = /\.css-([a-z0-9]+)/.exec(ruleText);
                    if (ruleHashMatch && usedHashes.has(ruleHashMatch[1])) {
                        relevantRules.push(ruleText);
                    }
                });
            } catch (e) {
                // CORS may block access to cssRules
            }
        }
    });
    return relevantRules.sort().join("\n");
}

/**
 * Build a deterministic mapping from each `css-<hash>` to `css-<index>`, ordered
 * by first appearance in the content.
 */
export function buildHashMap(content: string): Map<string, string> {
    const hashRegex = /css-([a-z0-9]+)/g;
    const seen = new Set<string>();
    const ordered: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = hashRegex.exec(content)) !== null) {
        if (!seen.has(match[1])) {
            seen.add(match[1]);
            ordered.push(match[1]);
        }
    }
    const map = new Map<string, string>();
    ordered.forEach((hash, i) => { map.set(`css-${hash}`, `css-${i}`); });
    return map;
}

/**
 * Apply a hash mapping to normalize Emotion class names in content.
 */
export function applyHashMap(content: string, hashMap: Map<string, string>): string {
    if (hashMap.size === 0) return content;
    const pattern = new RegExp(
        [...hashMap.keys()].sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
        'g'
    );
    return content.replace(pattern, (m) => hashMap.get(m) ?? m);
}

/**
 * Produce a deterministic, Emotion-normalized snapshot string for a rendered
 * container: combines the relevant Emotion styles with the sanitized DOM.
 *
 * Volatile attributes are stripped so refactors and handler renames don't churn
 * the snapshot. `id` is stripped because this form derives ids from the handler
 * name (e.g. `id="ftp-onCreate-..."`).
 */
export function buildSnapshot(container: HTMLElement): string {
    const emotionStyles = getEmotionStyles(container);

    const prettyDom = prettyDOM(container, 1000000, {
        filterNode() {
            return true;
        },
    });

    // Remove ANSI color codes from prettyDOM output.
    const cleanDom = (prettyDom as string).replace(/\x1b\[\d+m/g, "");

    // Build hash map from the DOM (first-appearance order) and reuse it for styles.
    const hashMap = buildHashMap(cleanDom);

    // Strip non-deterministic / refactor-sensitive attributes.
    let sanitizedDom = cleanDom
        .replaceAll(/\s+(id|for|name|aria-label|aria-labelledby|aria-describedby|current-value|appearance)="[^"]*"/g, "")
        .replaceAll(/<vscode-button\s+>/g, "<vscode-button>");

    sanitizedDom = applyHashMap(sanitizedDom, hashMap);
    const normalizedStyles = applyHashMap(emotionStyles, hashMap);

    return normalizedStyles.trim()
        ? `/* Emotion Styles */\n${normalizedStyles}\n\n/* DOM */\n${sanitizedDom}`
        : sanitizedDom;
}
