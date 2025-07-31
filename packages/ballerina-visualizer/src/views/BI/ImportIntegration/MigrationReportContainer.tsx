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

import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

interface MigrationReportContainerProps {
    htmlContent: string;
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
    }>;
    manualValidationActivities: Array<{
        activityName: string;
        frequency: number;
    }>;
}

const EXAMPLE_JSON: MigrationReportJSON = {
    coverageOverview: {
        coveragePercentage: 100,
        totalActivities: 5,
        migratableActivities: 5,
        nonMigratableActivities: 0,
    },
    manualWorkEstimation: [
        {
            scenario: "Best Case",
            workingDays: "1 day",
            weeks: "1 week",
        },
        {
            scenario: "Average Case",
            workingDays: "3 days",
            weeks: "1 week",
        },
        {
            scenario: "Worst Case",
            workingDays: "5 days",
            weeks: "1 week",
        },
    ],
    elementType: "Activity",
    unsupportedActivities: [],
    manualValidationActivities: [
        {
            activityName: "JDBC",
            frequency: 1,
        },
    ],
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

    // 1. Coverage Overview Section
    const coverageSection = `
## 📊 Migration Coverage Overview
- **Overall Coverage:** ${data.coverageOverview.coveragePercentage}%
- **Total Activities:** ${data.coverageOverview.totalActivities}
- **Migratable Activities:** ${data.coverageOverview.migratableActivities}
- **Non-migratable Activities:** ${data.coverageOverview.nonMigratableActivities}
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
    
    - 1.0 day per each new unsupported ${data.elementType} for analysis, implementation, and testing
        
    - 1.0 hour per each repeated unsupported ${data.elementType} for implementation
        
    - 2 minutes per each line of code generated
        
    - Assumes minimal complexity and straightforward implementations
        
- Average case scenario:
    
    - 2.0 days per each new unsupported ${data.elementType} for analysis, implementation, and testing
        
    - 2.0 hour per each repeated unsupported ${data.elementType} for implementation
        
    - 5 minutes per each line of code generated
        
    - Assumes medium complexity with moderate implementation challenges
        
- Worst case scenario:
    
    - 3.0 days per each new unsupported ${data.elementType} for analysis, implementation, and testing
        
    - 4.0 hour per each repeated unsupported ${data.elementType} for implementation
        
    - 10 minutes per each line of code generated
        
    - Assumes high complexity with significant implementation challenges`;

    const estimationSection = estimationTable + "\n\n" + estimationNotes;

    // 3. Unsupported Activities Section
    let unsupportedSection = "## ⚠️ Currently Unsupported Activities\n";
    if (data.unsupportedActivities.length === 0) {
        unsupportedSection += "No unsupported activities found.";
    } else {
        const tableRows = data.unsupportedActivities
            .map((activity) => `<tr><td><code>${activity.activityName}</code></td><td>${activity.frequency}</td></tr>`)
            .join("");
        unsupportedSection += `
<table>
  <thead>
    <tr>
      <th>Activity Name</th>
      <th>Frequency</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>
        `;
    }

    // 4. Manual Validation Section
    let validationSection = "## ✍️ Activities that need manual validation\n";
    if (data.manualValidationActivities.length === 0) {
        validationSection += "No activities require manual validation.";
    } else {
        const tableRows = data.manualValidationActivities
            .map((activity) => `<tr><td><code>${activity.activityName}</code></td><td>${activity.frequency}</td></tr>`)
            .join("");
        validationSection += `
<table>
  <thead>
    <tr>
      <th>Activity Name</th>
      <th>Frequency</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>
        `;
    }

    return styles + [coverageSection, estimationSection, unsupportedSection, validationSection].join("\n\n---\n\n");
};
const MigrationReportContainer: React.FC<MigrationReportContainerProps> = ({ htmlContent }) => {
    const markdownContent = generateMarkdown(EXAMPLE_JSON);

    return <ReactMarkdown rehypePlugins={[rehypeRaw]} children={markdownContent} />;
};

export default MigrationReportContainer;
