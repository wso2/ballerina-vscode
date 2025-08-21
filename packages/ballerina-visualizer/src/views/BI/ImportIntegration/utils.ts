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

import { CoverageLevel, MigrationReportJSON } from "./types";

export const SELECTION_TEXT = "To begin, choose a source platform from the options above.";
export const IMPORT_DISABLED_TOOLTIP = "Please select a source project from the options above to continue.";
export const IMPORT_ENABLED_TOOLTIP = "Begin converting your selected project and view the progress.";

export const EXAMPLE_REPORT_JSON: MigrationReportJSON = {
    coverageOverview: {
        unitName: "activity",
        coveragePercentage: 86,
        coverageLevel: CoverageLevel.MEDIUM,
        totalElements: 22,
        migratableElements: 19,
        nonMigratableElements: 3
    },
    manualWorkEstimation: {
        unit: "days",
        headers: ["Work Type", "Best Case", "Average Case", "Worst Case"],
        rows: [
            {
                label: "Manual Conversion",
                values: [0, 0, 0],
            },
            {
                label: "Code Validation",
                values: [1, 2, 3],
            },
        ],
    },
};

export const sanitizeProjectName = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

export const getCoverageLevel = (level: CoverageLevel): string => {
    if (level === CoverageLevel.HIGH) return "HIGH COVERAGE";
    if (level === CoverageLevel.MEDIUM) return "MEDIUM COVERAGE";
    return "LOW COVERAGE";
};

export const getCoverageColor = (level: CoverageLevel): string => {
    if (level === CoverageLevel.HIGH) return "var(--vscode-charts-green)";
    if (level === CoverageLevel.MEDIUM) return "var(--vscode-charts-orange)";
    return "var(--vscode-charts-red)";
};

export const getMigrationProgressHeaderData = (
    migrationCompleted: boolean,
    migrationSuccessful: boolean
) => {
    let headerText;
    let headerDesc;

    if (migrationCompleted && migrationSuccessful) {
        headerText = "Migration Completed Successfully!";
        headerDesc =
            "Your integration project has been successfully migrated. You can now proceed to the final step to create and open your project.";
    } else if (migrationCompleted && !migrationSuccessful) {
        headerText = "Migration Failed";
        headerDesc = "The migration process encountered errors and could not be completed.";
    } else {
        headerText = "Migration in Progress...";
        headerDesc = "Please wait while we set up your new integration project.";
    }

    return { headerText, headerDesc };
};