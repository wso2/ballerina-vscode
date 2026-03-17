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

import React from "react";
import styled from "@emotion/styled";
import { ActiveMigrationSession } from "@wso2/ballerina-rpc-client";

// ──────────────────────────────────────────────────────────────────────────────
// Styled Components
// ──────────────────────────────────────────────────────────────────────────────

const Card = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    margin: 8px 16px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background-color: var(--vscode-editorWidget-background);
    font-size: 13px;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
`;

const CardBody = styled.div`
    color: var(--vscode-descriptionForeground);
    line-height: 1.5;
`;

const ActionButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--vscode-button-background);
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);

    &:hover {
        opacity: 0.85;
    }
`;

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

interface MigrationContextCardProps {
    session: ActiveMigrationSession;
    onContinueEnhancement: () => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Renders a context card inside AI Chat when the current project is a migrated
 * project with pending or partially-completed AI enhancement.
 */
export function MigrationContextCard({ session, onContinueEnhancement }: MigrationContextCardProps) {
    // Only show when enhancement is needed
    if (session.fullyEnhanced) {
        return null;
    }

    const isPartial = session.isPartiallyEnhanced;
    const aiEnabled = session.aiFeatureUsed;

    return (
        <Card>
            <CardHeader>
                <span className="codicon codicon-sparkle" />
                {isPartial ? "Migration AI Enhancement Paused" : "Migration AI Enhancement Available"}
            </CardHeader>
            <CardBody>
                {isPartial
                    ? "The AI enhancement for this migrated project was paused. You can resume where you left off — the previous conversation context will be restored."
                    : aiEnabled
                        ? "This project was created from a migration. You can start AI enhancement to resolve unmapped elements, fix build errors, and refine tests."
                        : "This project was migrated without AI enhancement. You can run AI enhancement now to fix build errors, resolve TODOs, and refine tests."}
            </CardBody>
            <div>
                <ActionButton onClick={onContinueEnhancement}>
                    <span className="codicon codicon-sparkle" />
                    {isPartial ? "Resume AI Enhancement" : "Start AI Enhancement"}
                </ActionButton>
            </div>
        </Card>
    );
}
