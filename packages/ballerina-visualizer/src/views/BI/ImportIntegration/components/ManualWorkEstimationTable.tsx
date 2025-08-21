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

import { VSCodeDataGrid, VSCodeDataGridCell, VSCodeDataGridRow } from "@vscode/webview-ui-toolkit/react";
import { Codicon, Typography } from "@wso2/ui-toolkit";
import React from "react";
import {
    EstimationTableContainer,
    ReportButtonsContainer,
    SaveReportButton,
    ViewReportButton,
} from "../styles";
import { MigrationReportJSON } from "../types";


interface ManualWorkEstimationTableProps {
    reportData: MigrationReportJSON;
    onViewReport: () => void;
    onSaveReport: () => void;
}

export const ManualWorkEstimationTable: React.FC<ManualWorkEstimationTableProps> = ({
    reportData,
    onViewReport,
    onSaveReport,
}) => {
    const { manualWorkEstimation } = reportData;

    return (
        <EstimationTableContainer>
            <Typography variant="h3">Manual Work Estimation ({manualWorkEstimation.unit})</Typography>
            <VSCodeDataGrid
                style={{
                    border: "1px solid var(--vscode-widget-border)",
                    borderRadius: "4px",
                }}
            >
                <VSCodeDataGridRow row-type="header" style={{ borderBottom: "1px solid var(--vscode-widget-border)" }}>
                    {manualWorkEstimation.headers.map((header, index) => (
                        <VSCodeDataGridCell
                            key={index}
                            cell-type="columnheader"
                            grid-column={`${index + 1}`}
                            style={{
                                borderRight:
                                    index < manualWorkEstimation.headers.length - 1
                                        ? "1px solid var(--vscode-widget-border)"
                                        : "none",
                                padding: "8px 12px",
                            }}
                        >
                            {header}
                        </VSCodeDataGridCell>
                    ))}
                </VSCodeDataGridRow>
                {manualWorkEstimation.rows.map((row, i) => (
                    <VSCodeDataGridRow
                        key={i}
                        style={{
                            borderBottom:
                                i < manualWorkEstimation.rows.length - 1
                                    ? "1px solid var(--vscode-widget-border)"
                                    : "none",
                        }}
                    >
                        <VSCodeDataGridCell
                            grid-column="1"
                            style={{
                                borderRight: "1px solid var(--vscode-widget-border)",
                                padding: "8px 12px",
                            }}
                        >
                            {row.label}
                        </VSCodeDataGridCell>
                        {row.values.map((value, j) => (
                            <VSCodeDataGridCell
                                key={j}
                                grid-column={`${j + 2}`}
                                style={{
                                    borderRight:
                                        j < row.values.length - 1 ? "1px solid var(--vscode-widget-border)" : "none",
                                    padding: "8px 12px",
                                }}
                            >
                                {value}
                            </VSCodeDataGridCell>
                        ))}
                    </VSCodeDataGridRow>
                ))}
            </VSCodeDataGrid>
            <ReportButtonsContainer>
                <ViewReportButton onClick={onViewReport} appearance="secondary">
                    <Codicon name="file-text" />
                    &nbsp;View Full Report
                </ViewReportButton>
                <SaveReportButton onClick={onSaveReport} appearance="secondary">
                    <Codicon name="save" />
                    &nbsp;Save Report
                </SaveReportButton>
            </ReportButtonsContainer>
        </EstimationTableContainer>
    );
};