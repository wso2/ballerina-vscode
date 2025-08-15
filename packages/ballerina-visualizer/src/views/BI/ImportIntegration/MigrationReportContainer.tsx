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

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ColorThemeKind } from "@wso2/ballerina-core";
import type { MigrationReportJSON, ReportElement } from "./MigrationProgressView";

interface MigrationReportContainerProps {
    report: MigrationReportJSON;
}


/**
 * Custom hook to manage VS Code theme integration
 */
const useVSCodeTheme = () => {
    const { rpcClient } = useRpcContext();
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const applyCurrentTheme = async () => {
            try {
                const themeKind = await rpcClient.getVisualizerRpcClient().getThemeKind();
                const isDarkTheme = themeKind === ColorThemeKind.Dark || themeKind === ColorThemeKind.HighContrast;
                setIsDark(isDarkTheme);
            } catch (error) {
                // Fallback to dark theme if unable to detect
                setIsDark(true);
            }
        };

        // Apply theme on mount
        applyCurrentTheme();

        // Listen for theme changes
        const unsubscribe = rpcClient.onProjectContentUpdated(() => {
            applyCurrentTheme();
        });

        return unsubscribe;
    }, [rpcClient]);

    return isDark;
};

const getPluralElement = (element: string) => {
    if (element === "activity") {
        return "activities";
    }
    return `${element}s`;
};

const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Generates a markdown string from the migration report JSON data.
 * @param data - The migration report data.
 * @returns A formatted markdown string.
 */
const generateMarkdown = (data: MigrationReportJSON): string => {
    const styles = `
<style>
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1em;
    margin-bottom: 1em;
  }
  th, td {
    border: 1px solid var(--vscode-editorGroup-border);
    padding: 8px;
    text-align: left;
    color: var(--vscode-foreground);
  }
  th {
    background-color: var(--vscode-editorWidget-background);
    font-weight: bold;
  }
  tr:nth-child(even) {
    background-color: var(--vscode-list-hoverBackground);
  }
</style>
    `;

    // 1. Manual Work Estimation Table
    const estimationTableRows = data.manualWorkEstimation
        .map((row) => `<tr><td>${row.scenario}</td><td>${row.workingDays}</td><td>${row.weeks}</td></tr>`)
        .join("");
    const estimationTable = `
## 📝 Manual Work Estimation
<table>
  <thead>
    <tr>
      <th>Scenario</th>
      <th>Working Days</th>
      <th>Weeks (approx.)</th>
    </tr>
  </thead>
  <tbody>
    ${estimationTableRows}
  </tbody>
</table>
    `;

    // Generate estimation scenarios section based on element parameters
    const generateEstimationNotes = () => {
        const scenarios = ['bestCase', 'averageCase', 'worstCase'] as const;
        const scenarioLabels = ['Best case scenario:', 'Average case scenario:', 'Worst case scenario:'];
        
        let estimationNotes = '**Estimation Scenarios:** Time measurement: 1 day = 8 hours, 5 working days = 1 week\n';
        
        scenarios.forEach((scenario, index) => {
            estimationNotes += `- ${scenarioLabels[index]}\n\n`;
            
            // Collect all parameters from all elements for this scenario
            const uniqueElementLines: string[] = [];
            const repeatedElementLines: string[] = [];
            const codeLines: string[] = [];
            let complexityDescription = '';
            
            data.elements.forEach(element => {
                const params = element.estimationParameters[scenario];
                const elementType = element.elementType.toLowerCase();
                
                // Only add if value is not 0
                if (params.perUniqueElement.value > 0) {
                    uniqueElementLines.push(`${params.perUniqueElement.value} ${params.perUniqueElement.unit} per each new unsupported ${elementType} for analysis, implementation, and testing`);
                }
                
                if (params.perEachRepeatedElement.value > 0) {
                    repeatedElementLines.push(`${params.perEachRepeatedElement.value} ${params.perEachRepeatedElement.unit} per each repeated unsupported ${elementType} for implementation`);
                }
                
                if (params.perEachLineOfCode.value > 0) {
                    codeLines.push(`${params.perEachLineOfCode.value} ${params.perEachLineOfCode.unit} per each line of code generated`);
                }
            });
            
            // Add all collected lines
            [...uniqueElementLines, ...repeatedElementLines, ...codeLines].forEach(line => {
                estimationNotes += `    - ${line}\n        \n`;
            });
            
            // Add complexity assumption
            switch (scenario) {
                case 'bestCase':
                    complexityDescription = 'Assumes minimal complexity and straightforward implementations';
                    break;
                case 'averageCase':
                    complexityDescription = 'Assumes medium complexity with moderate implementation challenges';
                    break;
                case 'worstCase':
                    complexityDescription = 'Assumes high complexity with significant implementation challenges';
                    break;
            }
            
            estimationNotes += `    - ${complexityDescription}\n        \n`;
        });
        
        return estimationNotes;
    };

    const estimationSection = estimationTable + "\n\n" + generateEstimationNotes();
    const sections: string[] = [estimationSection];

    // 2. Process each element type
    data.elements.forEach((element) => {
        const ELEMENT_STRING = element.elementType.toLowerCase();
        const ELEMENTS_STRING = getPluralElement(ELEMENT_STRING);
        const ELEMENT_STRING_CAPITALIZED = capitalizeFirstLetter(ELEMENT_STRING);
        const ELEMENTS_STRING_CAPITALIZED = capitalizeFirstLetter(ELEMENTS_STRING);

        // Unsupported Elements Section
        let unsupportedSection = `## ⚠️ Currently Unsupported ${ELEMENTS_STRING_CAPITALIZED}\n`;
        if (element.unsupportedElements.length === 0) {
            unsupportedSection += `No unsupported ${ELEMENTS_STRING} found.`;
        } else {
            const tableRows = element.unsupportedElements
                .map((unsupportedElement) => `<tr><td><code>${unsupportedElement.elementName}</code></td><td>${unsupportedElement.frequency}</td></tr>`)
                .join("");
            unsupportedSection += `
<table>
  <thead>
    <tr>
      <th>${ELEMENT_STRING_CAPITALIZED} Name</th>
      <th>Frequency</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>
            `;

            // Add note about unsupported elements
            unsupportedSection += `\n- **Note:** These ${ELEMENTS_STRING} are expected to be supported in future versions of the migration tool.\n\n`;

            // Add detailed code blocks after the table
            unsupportedSection += `\n### ${ELEMENTS_STRING_CAPITALIZED} that required manual Conversion\n`;
            element.unsupportedElements.forEach((unsupportedElement) => {
                if (unsupportedElement.blocks && unsupportedElement.blocks.length > 0) {
                    unsupportedSection += `\n#### 🔸 ${unsupportedElement.elementName}\n`;
                    unsupportedElement.blocks.forEach((block) => {
                        unsupportedSection += `\n**File:** \`${block.fileName}\`\n\n`;
                        unsupportedSection += "```xml\n";
                        unsupportedSection += block.code;
                        unsupportedSection += "\n```\n\n";
                    });
                }
            });
        }
        sections.push(unsupportedSection);

        // Manual Validation Section
        let validationSection = `## ✍️ ${ELEMENTS_STRING_CAPITALIZED} that need manual validation\n`;
        if (element.manualValidationElements.length === 0) {
            validationSection += `No ${ELEMENTS_STRING} require manual validation.`;
        } else {
            const tableRows = element.manualValidationElements
                .map((validationElement) => `<tr><td><code>${validationElement.elementName}</code></td><td>${validationElement.frequency}</td></tr>`)
                .join("");
            validationSection += `
<table>
  <thead>
    <tr>
      <th>${ELEMENT_STRING_CAPITALIZED} Name</th>
      <th>Frequency</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>
            `;

            // Note about manual validation elements
            validationSection += `\n- **Note:** These ${ELEMENTS_STRING} are converted but may require manual review or adjustments.\n\n`;
        }
        sections.push(validationSection);
    });

    return styles + sections.join("\n\n---\n\n");
};
const MigrationReportContainer: React.FC<MigrationReportContainerProps> = ({ report }) => {
    const isDark = useVSCodeTheme();

    try {
        const markdownContent = generateMarkdown(report);

        return (
            <ReactMarkdown
                rehypePlugins={[rehypeRaw]}
                children={markdownContent}
                components={{
                    code(props) {
                        const { children, className, node, ...rest } = props;
                        const match = /language-(\w+)/.exec(className || "");
                        const codeContent = String(children).replace(/\n$/, "");

                        if (match) {
                            // Block code with syntax highlighting
                            return (
                                <SyntaxHighlighter
                                    {...rest}
                                    PreTag="div"
                                    children={codeContent}
                                    language={match[1]}
                                    style={isDark ? vscDarkPlus : vs}
                                    customStyle={{
                                        background: "var(--vscode-textCodeBlock-background)",
                                        color: "var(--vscode-editor-foreground)",
                                        border: "1px solid var(--vscode-editorWidget-border)",
                                        borderRadius: "4px",
                                        fontSize: "var(--vscode-editor-font-size)",
                                        fontFamily:
                                            'var(--vscode-editor-font-family, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace)',
                                        margin: "1em 0",
                                        padding: "16px",
                                        overflow: "auto",
                                    }}
                                    codeTagProps={{
                                        style: {
                                            background: "transparent",
                                            color: "inherit",
                                            fontFamily: "inherit",
                                            fontSize: "inherit",
                                            padding: "0",
                                            border: "none",
                                            borderRadius: "0",
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                        },
                                    }}
                                />
                            );
                        }

                        // Inline code
                        return (
                            <code
                                {...rest}
                                className={className}
                                style={{
                                    backgroundColor: "var(--vscode-textCodeBlock-background)",
                                    color: "var(--vscode-textPreformat-foreground)",
                                    padding: "2px 4px",
                                    borderRadius: "3px",
                                    fontSize: "0.9em",
                                    fontFamily:
                                        'var(--vscode-editor-font-family, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace)',
                                    wordBreak: "break-word",
                                }}
                            >
                                {children}
                            </code>
                        );
                    },
                }}
            />
        );
    } catch (error) {
        return (
            <div style={{ color: "var(--vscode-errorForeground)", padding: "16px" }}>
                <h3>Error parsing migration report</h3>
                <p>Failed to parse the provided JSON content. Please ensure the content is valid JSON.</p>
                <details>
                    <summary>Error details</summary>
                    <pre
                        style={{
                            backgroundColor: "var(--vscode-textCodeBlock-background)",
                            color: "var(--vscode-textPreformat-foreground)",
                            padding: "8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            overflow: "auto",
                        }}
                    >
                        {error instanceof Error ? error.message : "Unknown error"}
                    </pre>
                </details>
            </div>
        );
    }
};

export default MigrationReportContainer;
