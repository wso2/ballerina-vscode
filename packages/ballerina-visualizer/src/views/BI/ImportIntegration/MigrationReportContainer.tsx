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

interface MigrationReportContainerProps {
    reportJSONString: string;
}

interface MigrationReportJSON {
    coverageOverview: {
        coveragePercentage: number;
        totalActivities: number;
        migratableActivities: number;
        nonMigratableActivities: number;
    };
    manualWorkEstimation: Array<{
        scenario: string;
        workingDays: string;
        weeks: string;
    }>;
    elementType: string;
    unsupportedActivities: Array<{
        activityName: string;
        frequency: number;
        blocks: Array<{
            fileName: string;
            code: string;
        }>;
    }>;
    manualValidationActivities: Array<{
        activityName: string;
        frequency: number;
    }>;
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
    const ELEMENT_STRING = data.elementType.toLowerCase();
    const ELEMENTS_STRING = getPluralElement(ELEMENT_STRING);
    const ELEMENT_STRING_CAPITALIZED = capitalizeFirstLetter(ELEMENT_STRING);
    const ELEMENTS_STRING_CAPITALIZED = capitalizeFirstLetter(ELEMENTS_STRING);


    // 1. Coverage Overview Section
    const coverageSection = `
## 📊 Migration Coverage Overview
- **Overall Coverage:** ${data.coverageOverview.coveragePercentage}%
- **Total ${ELEMENTS_STRING_CAPITALIZED}:** ${data.coverageOverview.totalActivities}
- **Migratable ${ELEMENTS_STRING_CAPITALIZED}:** ${data.coverageOverview.migratableActivities}
- **Non-migratable ${ELEMENTS_STRING_CAPITALIZED}:** ${data.coverageOverview.nonMigratableActivities}
    `;

    // 2. Manual Work Estimation Table
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

    const estimationNotes = `- Best case scenario:
    
    - 1.0 day per each new unsupported ${ELEMENT_STRING} for analysis, implementation, and testing
        
    - 1.0 hour per each repeated unsupported ${ELEMENT_STRING} for implementation
        
    - 2 minutes per each line of code generated
        
    - Assumes minimal complexity and straightforward implementations
        
- Average case scenario:
    
    - 2.0 days per each new unsupported ${ELEMENT_STRING} for analysis, implementation, and testing
        
    - 2.0 hour per each repeated unsupported ${ELEMENT_STRING} for implementation
        
    - 5 minutes per each line of code generated
        
    - Assumes medium complexity with moderate implementation challenges
        
- Worst case scenario:
    
    - 3.0 days per each new unsupported ${ELEMENT_STRING} for analysis, implementation, and testing
        
    - 4.0 hour per each repeated unsupported ${ELEMENT_STRING} for implementation
        
    - 10 minutes per each line of code generated
        
    - Assumes high complexity with significant implementation challenges`;

    const estimationSection = estimationTable + "\n\n" + estimationNotes;

    // 3. Unsupported ${ELEMENTS_STRING_CAPITALIZED} Section
    let unsupportedSection = `## ⚠️ Currently Unsupported ${ELEMENTS_STRING_CAPITALIZED}\n`;
    if (data.unsupportedActivities.length === 0) {
        unsupportedSection += `No unsupported ${ELEMENTS_STRING} found.`;
    } else {
        const tableRows = data.unsupportedActivities
            .map((activity) => `<tr><td><code>${activity.activityName}</code></td><td>${activity.frequency}</td></tr>`)
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

        // Add note about unsupported ${ELEMENTS_STRING}
        unsupportedSection +=
            `\n- **Note:** These ${ELEMENTS_STRING} are expected to be supported in future versions of the migration tool.\n\n`;

        // Add detailed code blocks after the table
        unsupportedSection += `\n### ${ELEMENTS_STRING_CAPITALIZED} that required manual Conversion\n`;
        data.unsupportedActivities.forEach((activity) => {
            if (activity.blocks && activity.blocks.length > 0) {
                unsupportedSection += `\n#### 🔸 ${activity.activityName}\n`;
                activity.blocks.forEach((block) => {
                    unsupportedSection += `\n**File:** \`${block.fileName}\`\n\n`;
                    unsupportedSection += "```xml\n";
                    unsupportedSection += block.code;
                    unsupportedSection += "\n```\n\n";
                });
            }
        });
    }

    // 4. Manual Validation Section
    let validationSection = `## ✍️ ${ELEMENTS_STRING_CAPITALIZED} that need manual validation\n`;
    if (data.manualValidationActivities.length === 0) {
        validationSection += `No ${ELEMENTS_STRING} require manual validation.`;
    } else {
        const tableRows = data.manualValidationActivities
            .map((activity) => `<tr><td><code>${activity.activityName}</code></td><td>${activity.frequency}</td></tr>`)
            .join("");
        validationSection += `
<table>
  <thead>
    <tr>
      <th>${data.elementType} Name</th>
      <th>Frequency</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>
        `;

        // Note about manual validation ${ELEMENTS_STRING}
        validationSection += `\n- **Note:** These ${ELEMENTS_STRING} are converted but may require manual review or adjustments.\n\n`;
    }

    return styles + [coverageSection, estimationSection, unsupportedSection, validationSection].join("\n\n---\n\n");
};
const MigrationReportContainer: React.FC<MigrationReportContainerProps> = ({ reportJSONString }) => {
    const isDark = useVSCodeTheme();

    try {
        const parsedData: MigrationReportJSON = JSON.parse(reportJSONString);
        const markdownContent = generateMarkdown(parsedData);

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
