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

import React, { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import hljs from "highlight.js";
import yaml from "highlight.js/lib/languages/yaml";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import Badge from "./ChatBadge";
// @ts-ignore
import ballerina from "../../../languages/ballerina.js";
import { SYSTEM_BADGE_SECRET, SYSTEM_ERROR_SECRET } from "./AIChatInput/constants";
import ErrorBox from "./ErrorBox";
import { ColorThemeKind } from "@wso2/ballerina-core";

// Register custom languages with highlight.js
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("ballerina", ballerina);

// Escapes all HTML tags except the custom  tag
const escapeHtmlForCustomTags = (markdown: string): string => {
    return markdown.replace(/<\/?(?!badge\b|error\b)(\w+)[^>]*>/g, (match) =>
        match.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    );
};


interface MarkdownRendererProps {
    markdownContent: string;
}

const markdownWrapperStyle: React.CSSProperties = {
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdownContent }) => {
    const { rpcClient } = useRpcContext();

    useEffect(() => {
        /**
         * Injects the appropriate highlight.js theme stylesheet based on the current theme.
         */
        const injectHighlightTheme = (theme: string) => {
            const existingTheme = document.getElementById("hljs-theme");
            if (existingTheme) existingTheme.remove();

            const themeLink = document.createElement("link");
            themeLink.id = "hljs-theme";
            themeLink.rel = "stylesheet";
            themeLink.href =
                theme === "light"
                    ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css"
                    : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css";
            document.head.appendChild(themeLink);

            // Add background override once
            if (!document.getElementById("hljs-override")) {
                const overrideStyle = document.createElement("style");
                overrideStyle.id = "hljs-override";
                overrideStyle.innerHTML = `.hljs { background: var(--vscode-editor-background) !important; }`;
                document.head.appendChild(overrideStyle);
            }
        };

        /**
         * Applies theme on initial load and theme changes.
         */
        const applyCurrentTheme = async () => {
            const themeKind = await rpcClient.getVisualizerRpcClient().getThemeKind(); // Returns "light" or "dark"
            let extractedTheme: string;
            switch (themeKind) {
                case ColorThemeKind.Light:
                case ColorThemeKind.HighContrastLight:
                    extractedTheme = "light";
                    break;
                default:
                    extractedTheme = "dark";
                    break;
            }
            injectHighlightTheme(extractedTheme);
        };

        rpcClient.onProjectContentUpdated(() => {
            applyCurrentTheme();
        });

        applyCurrentTheme();
    }, [rpcClient]);

    /**
     * Custom rendering for <code> blocks with syntax highlighting
     */
    const MarkdownCodeRenderer = {
        code({ inline, className, children }: { inline?: boolean; className?: string; children: React.ReactNode }) {
            const codeContent = (Array.isArray(children) ? children.join("") : children) ?? "";
            const match = /language-(\w+)/.exec(className || "");

            if (!inline && match) {
                const language = match[1];

                // Apply syntax highlighting if language is registered
                if (hljs.getLanguage(language)) {
                    return (
                        <pre>
                            <code
                                className={`hljs ${language}`}
                                dangerouslySetInnerHTML={{
                                    __html: hljs.highlight(codeContent.toString(), { language }).value,
                                }}
                            />
                        </pre>
                    );
                }

                // Fallback: render as plain text
                return (
                    <pre>
                        <code className="hljs">{codeContent}</code>
                    </pre>
                );
            }

            // Inline code with word wrapping
            return (
                <code className={className} style={markdownWrapperStyle}>
                    {children}
                </code>
            );
        },
    };

    // Custom components for markdown elements
    const getMarkdownComponents = (markdownContent: string) => ({
        badge: ({ node, children }: any) => {
            const propsMap = node?.properties || {};
            const isSystemBadge = propsMap.dataSystem === "true" && propsMap.dataAuth === SYSTEM_BADGE_SECRET;
            const badgeType = propsMap.dataType;

            if (isSystemBadge) {
                return <Badge badgeType={badgeType}>{children}</Badge>;
            }

            const start = node?.position?.start?.offset;
            const end = node?.position?.end?.offset;

            if (typeof start === "number" && typeof end === "number") {
                const rawTag = markdownContent.slice(start, end);

                return rawTag;
            }

            // Fallback if position data is missing
            return `<badge>${children}</badge>`;
        },
        error: ({ node, children }: any) => {
            const propsMap = node?.properties || {};
            const isSystemError = propsMap.dataSystem === "true" && propsMap.dataAuth === SYSTEM_ERROR_SECRET;

            if (isSystemError) {
                return <ErrorBox>{children}</ErrorBox>;
            }

            const start = node?.position?.start?.offset;
            const end = node?.position?.end?.offset;

            if (typeof start === "number" && typeof end === "number") {
                const rawTag = markdownContent.slice(start, end);

                return rawTag;
            }

            // Fallback if position data is missing
            return `<error>${children}</error>`;
        },
    });

    // Escape HTML except <badge> tags
    const safeContent = escapeHtmlForCustomTags(markdownContent);

    return (
        <div style={markdownWrapperStyle}>
            <ReactMarkdown
                rehypePlugins={[rehypeRaw]}
                components={{
                    ...MarkdownCodeRenderer,
                    ...getMarkdownComponents(markdownContent),
                }}
            >
                {safeContent}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
