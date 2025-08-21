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
import {
    CoverageBadge,
    CoverageContainer,
    CoverageHeader,
    CoverageLabel,
    CoveragePercentage,
    CoverageProgressBar,
    CoverageProgressFill,
    CoverageStat,
    CoverageStats,
} from "../styles";
import { MigrationReportJSON } from "../types";
import { getCoverageColor, getCoverageLevel } from "../utils";


interface CoverageSummaryProps {
    reportData: MigrationReportJSON;
}

export const CoverageSummary: React.FC<CoverageSummaryProps> = ({ reportData }) => {
    const { coverageOverview } = reportData;
    const coverageLevel = getCoverageLevel(coverageOverview.coverageLevel);
    const coverageColor = getCoverageColor(coverageOverview.coverageLevel);

    return (
        <CoverageContainer>
            <CoverageHeader>
                <div>
                    <CoveragePercentage coverageColor={coverageColor}>
                        {coverageOverview.coveragePercentage}%
                    </CoveragePercentage>
                    <CoverageLabel>Overall Coverage</CoverageLabel>
                </div>
                <CoverageStats>
                    <CoverageStat>
                        <span>Total {coverageOverview.unitName}(s):</span>
                        <strong>{coverageOverview.totalElements}</strong>
                    </CoverageStat>
                    <CoverageStat>
                        <span>Migratable {coverageOverview.unitName}(s):</span>
                        <strong>{coverageOverview.migratableElements}</strong>
                    </CoverageStat>
                    <CoverageStat>
                        <span>Non-migratable {coverageOverview.unitName}(s):</span>
                        <strong>{coverageOverview.nonMigratableElements}</strong>
                    </CoverageStat>
                </CoverageStats>
            </CoverageHeader>
            <CoverageProgressBar>
                <CoverageProgressFill percentage={coverageOverview.coveragePercentage} coverageColor={coverageColor} />
            </CoverageProgressBar>
            <CoverageBadge>{coverageLevel}</CoverageBadge>
        </CoverageContainer>
    );
};