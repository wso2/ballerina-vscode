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

import styled from "@emotion/styled";
import { ImportIntegrationResponse } from "@wso2/ballerina-core";
import { Button, Codicon, Typography } from "@wso2/ui-toolkit";
import { useState, useEffect, useRef, useMemo } from "react";
import MigrationReportContainer from "./MigrationReportContainer";

const ButtonWrapper = styled.div`
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
`;

const ProgressContainer = styled.div`
    max-width: 660px;
    margin: 80px 120px;
    display: flex;
    flex-direction: column;
    gap: 40px;
    max-height: 100vh;
    overflow-y: auto;
    padding-bottom: 20px;
`;

const StepWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
    margin-top: 20px;
`;

const LogsContainer = styled.div`
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    padding: 16px;
    background-color: var(--vscode-editor-background);
    max-height: 300px;
    overflow-y: auto;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
`;

const LogEntry = styled.div`
    color: var(--vscode-foreground);
    margin-bottom: 4px;
    white-space: pre-wrap;
    word-break: break-word;
`;

const ReportContainer = styled.div`
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    padding: 16px;
    background-color: var(--vscode-editor-background);
    display: flex;
    flex-direction: column;

    & .container {
        flex-direction: column;
    }
`;

const CollapsibleHeader = styled.div`
    display: flex;
    cursor: pointer;
    gap: 8px;
    align-items: center;
    &:hover {
        opacity: 0.8;
    }
`;

const CardAction = styled.div`
    margin-left: auto;
`;

const CoverageContainer = styled.div`
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    padding: 24px;
    background-color: var(--vscode-editor-background);
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const CoverageHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const CoveragePercentage = styled.div<{ coverageColor: string }>`
    font-size: 48px;
    font-weight: bold;
    color: ${props => props.coverageColor};
`;

const CoverageLabel = styled.div`
    font-size: 14px;
    color: var(--vscode-descriptionForeground);
`;

const CoverageProgressBar = styled.div`
    width: 100%;
    height: 8px;
    background-color: var(--vscode-editorWidget-border);
    border-radius: 4px;
    overflow: hidden;
`;

const CoverageProgressFill = styled.div<{ percentage: number; coverageColor: string }>`
    height: 100%;
    width: ${props => props.percentage}%;
    background-color: ${props => props.coverageColor};
    transition: width 0.3s ease;
`;

const CoverageStats = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const CoverageStat = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 14px;
`;

const CoverageBadge = styled.div`
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    align-self: flex-start;
`;


export interface CoverageOverview {
    unitName: string;
    coveragePercentage: number;
    totalElements: number;
    migratableElements: number;
    nonMigratableElements: number;
}

export interface ManualWorkEstimation {
    scenario: string;
    workingDays: string;
    weeks: string;
}

export interface EstimationValue {
    value: number;
    unit: string;
}

export interface EstimationParameters {
    bestCase: {
        perUniqueElement: EstimationValue;
        perEachRepeatedElement: EstimationValue;
        perEachLineOfCode: EstimationValue;
    };
    averageCase: {
        perUniqueElement: EstimationValue;
        perEachRepeatedElement: EstimationValue;
        perEachLineOfCode: EstimationValue;
    };
    worstCase: {
        perUniqueElement: EstimationValue;
        perEachRepeatedElement: EstimationValue;
        perEachLineOfCode: EstimationValue;
    };
}

export interface CodeBlock {
    fileName: string;
    code: string;
}

export interface UnsupportedElement {
    elementName: string;
    frequency: number;
    blockName: string;
    blocks: CodeBlock[];
}

export interface ManualValidationElement {
    elementName: string;
    frequency: number;
}

export interface ReportElement {
    elementType: string;
    coverageOverview: CoverageOverview;
    estimationParameters: EstimationParameters;
    unsupportedElements: UnsupportedElement[];
    manualValidationElements: ManualValidationElement[];
}

export interface MigrationReportJSON {
    coverageOverview: CoverageOverview;
    manualWorkEstimation: ManualWorkEstimation[];
    elements: ReportElement[];
}

interface MigrationProgressProps {
    migrationState: string | null;
    migrationLogs: string[];
    migrationCompleted: boolean;
    migrationSuccessful: boolean;
    migrationResponse: ImportIntegrationResponse | null;
    onNext: () => void;
}

const EXAMPLE_REPORT_JSON : MigrationReportJSON = {
    "coverageOverview": {
        // Overview coverage that's on the top of the report
        "unitName": "activity",
        "coveragePercentage": 60,
        "totalElements": 5,
        "migratableElements": 5,
        "nonMigratableElements": 0
    },
    "manualWorkEstimation": [
        {
            "scenario": "Best Case",
            "workingDays": "1 day",
            "weeks": "1 week"
        },
        {
            "scenario": "Average Case",
            "workingDays": "3 days",
            "weeks": "1 week"
        },
        {
            "scenario": "Worst Case",
            "workingDays": "5 days",
            "weeks": "1 week"
        }
    ],
    "elements": [
        {
            "elementType": "Activity",
            "coverageOverview": {
                "unitName": "activity",
                "coveragePercentage": 75,
                "totalElements": 8,
                "migratableElements": 6,
                "nonMigratableElements": 2
            },
            "estimationParameters": {
                "bestCase": {
                    "perUniqueElement": {
                        "value": 1.0,
                        "unit": "hours"
                    },
                    "perEachRepeatedElement": {
                        "value": 0.5,
                        "unit": "hours"
                    },
                    "perEachLineOfCode": {
                        "value": 2.0,
                        "unit": "minutes"
                    }
                },
                "averageCase": {
                    "perUniqueElement": {
                        "value": 2.0,
                        "unit": "hours"
                    },
                    "perEachRepeatedElement": {
                        "value": 1.0,
                        "unit": "hours"
                    },
                    "perEachLineOfCode": {
                        "value": 5.0,
                        "unit": "minutes"
                    }
                },
                "worstCase": {
                    "perUniqueElement": {
                        "value": 4.0,
                        "unit": "hours"
                    },
                    "perEachRepeatedElement": {
                        "value": 2.0,
                        "unit": "hours"
                    },
                    "perEachLineOfCode": {
                        "value": 10.0,
                        "unit": "minutes"
                    }
                }
            },
            "unsupportedElements": [
                {
                    "elementName": "com.tibco.pe.core.LoopGroup",
                    "frequency": 2,
                    "blockName": "Activity Block",
                    "blocks": [
                        {
                            "fileName": "split_long_string.process",
                            "code": "<pd:group name=\"Group\" xmlns:pd=\"http://xmlns.tibco.com/bw/process/2003\">\n  <pd:type>com.tibco.pe.core.LoopGroup</pd:type>\n  <pd:description>Loop processing</pd:description>\n</pd:group>"
                        }
                    ]
                },
                {
                    "elementName": "com.tibco.pe.core.TransitionCondition",
                    "frequency": 1,
                    "blockName": "Activity Block",
                    "blocks": [
                        {
                            "fileName": "conditional_flow.process",
                            "code": "<pd:transition>\n  <pd:from>Start</pd:from>\n  <pd:to>End</pd:to>\n  <pd:conditionType>always</pd:conditionType>\n</pd:transition>"
                        }
                    ]
                }
            ],
            "manualValidationElements": [
                {
                    "elementName": "JDBC Query",
                    "frequency": 3
                },
                {
                    "elementName": "HTTP Request",
                    "frequency": 1
                }
            ]
        },
        {
            "elementType": "DataWeave",
            "coverageOverview": {
                "unitName": "code line",
                "coveragePercentage": 90,
                "totalElements": 4,
                "migratableElements": 4,
                "nonMigratableElements": 0
            },
            "estimationParameters": {
                "bestCase": {
                    "perUniqueElement": {
                        "value": 0.5,
                        "unit": "hours"
                    },
                    "perEachRepeatedElement": {
                        "value": 0.25,
                        "unit": "hours"
                    },
                    "perEachLineOfCode": {
                        "value": 1.0,
                        "unit": "minutes"
                    }
                },
                "averageCase": {
                    "perUniqueElement": {
                        "value": 1.0,
                        "unit": "hours"
                    },
                    "perEachRepeatedElement": {
                        "value": 0.5,
                        "unit": "hours"
                    },
                    "perEachLineOfCode": {
                        "value": 3.0,
                        "unit": "minutes"
                    }
                },
                "worstCase": {
                    "perUniqueElement": {
                        "value": 2.0,
                        "unit": "hours"
                    },
                    "perEachRepeatedElement": {
                        "value": 1.0,
                        "unit": "hours"
                    },
                    "perEachLineOfCode": {
                        "value": 5.0,
                        "unit": "minutes"
                    }
                }
            },
            "unsupportedElements": [],
            "manualValidationElements": [
                {
                    "elementName": "Complex JSON Transform",
                    "frequency": 2
                }
            ]
        },
        {
            "elementType": "Connector",
            "coverageOverview": {
                "unitName": "connector",
                "coveragePercentage": 40,
                "totalElements": 5,
                "migratableElements": 2,
                "nonMigratableElements": 3
            },
            "estimationParameters": {
                "bestCase": {
                    "perUniqueElement": {
                        "value": 2.0,
                        "unit": "hours"
                    },
                    "perEachRepeatedElement": {
                        "value": 1.0,
                        "unit": "hours"
                    },
                    "perEachLineOfCode": {
                        "value": 3.0,
                        "unit": "minutes"
                    }
                },
                "averageCase": {
                    "perUniqueElement": {
                        "value": 4.0,
                        "unit": "hours"
                    },
                    "perEachRepeatedElement": {
                        "value": 2.0,
                        "unit": "hours"
                    },
                    "perEachLineOfCode": {
                        "value": 7.0,
                        "unit": "minutes"
                    }
                },
                "worstCase": {
                    "perUniqueElement": {
                        "value": 8.0,
                        "unit": "hours"
                    },
                    "perEachRepeatedElement": {
                        "value": 4.0,
                        "unit": "hours"
                    },
                    "perEachLineOfCode": {
                        "value": 15.0,
                        "unit": "minutes"
                    }
                }
            },
            "unsupportedElements": [
                {
                    "elementName": "com.tibco.plugin.ftp.FTPConnection",
                    "frequency": 1,
                    "blockName": "Connector Configuration",
                    "blocks": [
                        {
                            "fileName": "ftp_config.properties",
                            "code": "ftp.host=example.com\nftp.port=21\nftp.username=user\nftp.password=pass\nftp.timeout=30000"
                        }
                    ]
                },
                {
                    "elementName": "com.tibco.plugin.jms.JMSQueueReceiver",
                    "frequency": 2,
                    "blockName": "Connector Configuration",
                    "blocks": [
                        {
                            "fileName": "jms_receiver.xml",
                            "code": "<jms:queue-receiver>\n  <jms:destination>order.queue</jms:destination>\n  <jms:connection-factory>ConnectionFactory</jms:connection-factory>\n  <jms:acknowledge-mode>AUTO_ACKNOWLEDGE</jms:acknowledge-mode>\n</jms:queue-receiver>"
                        }
                    ]
                }
            ],
            "manualValidationElements": [
                {
                    "elementName": "Database Connection",
                    "frequency": 1
                },
                {
                    "elementName": "REST API Client",
                    "frequency": 2
                }
            ]
        }
    ]
}

const migrationProgressHeader = (
    migrationCompleted: boolean,
    migrationSuccessful: boolean,
    migrationResponse: ImportIntegrationResponse | null
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

    return (
        <div>
            <Typography variant="h2">
                {headerText}
            </Typography>
            <Typography sx={{ color: "var(--vscode-descriptionForeground)" }}>{headerDesc}</Typography>
        </div>
    );
};

const colourizeLog = (log: string, index: number) => {
    if (log.startsWith("[SEVERE]")) {
        return (
            <LogEntry key={index} style={{ color: "var(--vscode-terminal-ansiRed)" }}>
                {log}
            </LogEntry>
        );
    } else if (log.startsWith("[WARN]")) {
        return (
            <LogEntry key={index} style={{ color: "var(--vscode-terminal-ansiYellow)" }}>
                {log}
            </LogEntry>
        );
    }
    return <LogEntry key={index}>{log}</LogEntry>;
};

const getCoverageLevel = (percentage: number): string => {
    if (percentage >= 80) return "HIGH COVERAGE";
    if (percentage >= 50) return "MEDIUM COVERAGE";
    return "LOW COVERAGE";
};

const getCoverageColor = (percentage: number): string => {
    if (percentage >= 80) return "var(--vscode-charts-green)";
    if (percentage >= 50) return "var(--vscode-charts-orange)";
    return "var(--vscode-charts-red)";
};

const CoverageSummary: React.FC<{ reportData: MigrationReportJSON }> = ({ reportData }) => {
    const { coverageOverview } = reportData;
    const coverageLevel = getCoverageLevel(coverageOverview.coveragePercentage);
    const coverageColor = getCoverageColor(coverageOverview.coveragePercentage);

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
                <CoverageProgressFill
                    percentage={coverageOverview.coveragePercentage}
                    coverageColor={coverageColor}
                />
            </CoverageProgressBar>
            <CoverageBadge>{coverageLevel}</CoverageBadge>
        </CoverageContainer>
    );
};

export function MigrationProgressView({
    migrationState,
    migrationLogs,
    migrationCompleted,
    migrationSuccessful,
    migrationResponse,
    onNext,
}: MigrationProgressProps) {
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isLogsOpen, setIsLogsOpen] = useState(false);
    const logsContainerRef = useRef<HTMLDivElement>(null);

    // Parse migration report JSON when available
    const parsedReportData = useMemo(() => {
        if (!migrationResponse?.reportJson) return null;
        try {
            // return JSON.parse(migrationResponse.reportJson) as MigrationReportJSON;
            return EXAMPLE_REPORT_JSON;
        } catch (error) {
            console.error("Failed to parse migration report JSON:", error);
            return null;
        }
    }, [migrationResponse?.reportJson]);

    // Auto-open logs during migration and auto-collapse when completed
    useEffect(() => {
        if (!migrationCompleted && migrationLogs.length > 0) {
            // Migration is in progress and we have logs - open the dropdown
            setIsLogsOpen(true);
        } else if (migrationCompleted) {
            // Migration is completed - collapse the dropdown
            setIsLogsOpen(false);
        }
    }, [migrationCompleted, migrationLogs.length]);

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
        if (logsContainerRef.current && isLogsOpen && !migrationCompleted) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [migrationLogs, isLogsOpen, migrationCompleted]);

    return (
        <>
            {migrationProgressHeader(migrationCompleted, migrationSuccessful, migrationResponse)}
            <StepWrapper>
                {migrationCompleted && migrationSuccessful ? (
                    parsedReportData ? (
                        <CoverageSummary reportData={parsedReportData} />
                    ) : (
                        <Typography variant="body3" sx={{ color: "var(--vscode-terminal-ansiGreen)" }}>
                            Migration completed successfully!
                        </Typography>
                    )
                ) : migrationCompleted && !migrationSuccessful ? (
                    <></>
                ) : (
                    <Typography variant="progress">{migrationState || "Starting migration..."}</Typography>
                )}
            </StepWrapper>

            {/* Show button before logs when migration is completed */}
            {migrationCompleted && (
                <ButtonWrapper>
                    <Button disabled={!migrationCompleted || !migrationSuccessful} onClick={onNext} appearance="primary">
                        Proceed to Final Step
                    </Button>
                </ButtonWrapper>
            )}

            {/* Migration Logs */}
            {migrationLogs.length > 0 && (
                <StepWrapper>
                    {/* Only show header when migration is completed */}
                    {migrationCompleted && (
                        <CollapsibleHeader onClick={() => setIsLogsOpen(!isLogsOpen)}>
                            <Typography variant="h4">View Detailed Logs</Typography>
                            <CardAction>
                                {isLogsOpen ? <Codicon name={"chevron-down"} /> : <Codicon name={"chevron-right"} />}
                            </CardAction>
                        </CollapsibleHeader>
                    )}
                    {/* Show logs container when open OR when migration is in progress */}
                    {(isLogsOpen || !migrationCompleted) && migrationLogs.length > 0 && (
                        <LogsContainer ref={logsContainerRef}>{migrationLogs.map(colourizeLog)}</LogsContainer>
                    )}
                </StepWrapper>
            )}

            {/* Show button after logs when migration is in progress */}
            {!migrationCompleted && (
                <ButtonWrapper>
                    <Button disabled={!migrationCompleted || !migrationSuccessful} onClick={onNext} appearance="primary">
                        Proceed to Final Step
                    </Button>
                </ButtonWrapper>
            )}
            {/* Migration Report */}
            {migrationCompleted && migrationResponse?.report && (
                <StepWrapper>
                    <CollapsibleHeader onClick={() => setIsReportOpen(!isReportOpen)}>
                        <Typography variant="h4">View Migration Report</Typography>
                        <CardAction>
                            {isReportOpen ? <Codicon name={"chevron-down"} /> : <Codicon name={"chevron-right"} />}
                        </CardAction>
                    </CollapsibleHeader>
                    {isReportOpen && (
                        <ReportContainer>
                            <MigrationReportContainer report={parsedReportData} />
                        </ReportContainer>
                    )}
                </StepWrapper>
            )}
        </>
    );
}
