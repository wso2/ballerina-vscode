/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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
import { Codicon } from "@wso2/ui-toolkit";
import React, { useMemo } from "react";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type StageState = "pending" | "active" | "done";

export interface StageInfo {
    label: string;
    state: StageState;
}

export interface MigrationEnhancementBannerProps {
    aiFeatureUsed: boolean;
    isActive: boolean;
    fullyEnhanced: boolean;
    /** All AI conversation messages – used to derive per-stage status. */
    messages: Array<{ role: string; content: string }>;
    onDismiss: () => void;
    /** Called when user picks "Auto-fix" from the skip banner to kick off the pipeline. */
    onStartEnhancement?: () => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Stage detection
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Derives the status of each of the pipeline stages by scanning the
 * accumulated message content for known tool-call patterns.
 *
 * Stage heuristics (all based on `<toolcall … tool="…">` / `<toolresult … tool="…">` tags):
 *  - Stage 1: `getCompilationErrors` tool call seen → active; result present → done
 *  - Stage 2: inferred – active once stage 1 is done, done once stage 4 starts
 *  - Stage 3: inferred – active when file edits target `tests/`, done once stage 4 starts
 *  - Stage 4: `runTests` tool call seen → active; result present → done
 */
function deriveStages(messages: Array<{ role: string; content: string }>): StageInfo[] {
    const allContent = messages.map((m) => m.content).join("\n");

    // Stage 1: compilation errors check
    const s1Called =
        allContent.includes('tool="getCompilationErrors"') ||
        allContent.includes("tool='getCompilationErrors'");
    const s1ResultMatch = allContent.match(/<toolresult[^>]*tool="getCompilationErrors"/);
    const s1Done =
        s1Called &&
        s1ResultMatch !== null &&
        (allContent.includes("No errors found") ||
            allContent.includes("no errors") ||
            allContent.includes("0 errors") ||
            allContent.includes("no compilation errors"));

    // Stage 4: test runner
    const s4Called =
        allContent.includes('tool="runTests"') ||
        allContent.includes("tool='runTests'") ||
        allContent.includes('tool="run_tests"');
    const s4ResultMatch = allContent.match(/<toolresult[^>]*tool="runTests"/);
    const s4Done = s4Called && s4ResultMatch !== null;

    // Stage 3 hint: file edits targeting tests/ directory
    const s3Hint =
        /tool=["'](?:file_write|file_edit|writeFile|editFile)["'][^>]*>(?:[^<]|<(?!\/toolcall))*tests\//.test(
            allContent
        );

    // Stage 2: active once stage 1 is done; done once stage 4 starts (sequential assumption)
    const s2Active = s1Done && !s4Called;
    const s2Done = s4Called;

    // Stage 3: active when tests/ file edits detected after stage 1; done once stage 4 starts
    const s3Active = s3Hint && !s4Called;
    const s3Done = s4Called;

    const stageState = (active: boolean, done: boolean): StageState =>
        done ? "done" : active ? "active" : "pending";

    return [
        { label: "Fix build errors", state: stageState(s1Called && !s1Done, s1Done) },
        { label: "Resolve TODO items", state: stageState(s2Active, s2Done) },
        { label: "Refine tests", state: stageState(s3Active, s3Done) },
        { label: "Run & fix tests", state: stageState(s4Called && !s4Done, s4Done) },
    ];
}

// ──────────────────────────────────────────────────────────────────────────────
// Styled components
// ──────────────────────────────────────────────────────────────────────────────

const BannerContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background-color: var(--vscode-textCodeBlock-background);
    font-family: var(--vscode-font-family);
    font-size: 11px;
    color: var(--vscode-editor-foreground);
    flex-shrink: 0;
`;

const BannerHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
`;

const BannerTitle = styled.span`
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
    font-size: 11px;
    opacity: 0.85;
`;

const ModeBadge = styled.span`
    display: inline-block;
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.3px;
    background-color: rgba(52, 163, 84, 0.2);
    color: var(--vscode-gitDecoration-addedResourceForeground);
    border: 1px solid var(--vscode-gitDecoration-addedResourceForeground);
`;

const StartButton = styled.button<{ variant: 'primary' | 'secondary' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid
        ${(props: { variant: 'primary' | 'secondary' }) =>
            props.variant === 'primary'
                ? 'var(--vscode-gitDecoration-addedResourceForeground)'
                : 'var(--vscode-textLink-foreground)'};
    background-color: ${(props: { variant: 'primary' | 'secondary' }) =>
        props.variant === 'primary' ? 'rgba(52, 163, 84, 0.15)' : 'rgba(0, 120, 212, 0.1)'};
    color: ${(props: { variant: 'primary' | 'secondary' }) =>
        props.variant === 'primary'
            ? 'var(--vscode-gitDecoration-addedResourceForeground)'
            : 'var(--vscode-textLink-foreground)'};

    &:hover {
        opacity: 0.85;
    }
`;

const DismissButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: var(--vscode-descriptionForeground);
    border-radius: 2px;
    line-height: 1;

    &:hover {
        color: var(--vscode-editor-foreground);
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const StageList = styled.div`
    display: flex;
    align-items: center;
    gap: 0;
    flex-wrap: wrap;
`;

const StageItem = styled.div<{ state: StageState; isLast: boolean }>`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 0;

    ${(props: { state: StageState; isLast: boolean }) =>
        !props.isLast &&
        `
        &::after {
            content: "›";
            margin: 0 6px;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }
    `}

    color: ${(props: { state: StageState; isLast: boolean }) => {
        switch (props.state) {
            case "done":
                return "var(--vscode-gitDecoration-addedResourceForeground)";
            case "active":
                return "var(--vscode-editor-foreground)";
            default:
                return "var(--vscode-descriptionForeground)";
        }
    }};
`;

const StageLabel = styled.span<{ state: StageState }>`
    font-size: 11px;
    font-weight: ${(props: { state: StageState }) => (props.state === "active" ? "600" : "normal")};
    opacity: ${(props: { state: StageState }) => (props.state === "pending" ? "0.55" : "1")};
`;

// ──────────────────────────────────────────────────────────────────────────────
// Stage icon helper
// ──────────────────────────────────────────────────────────────────────────────

function StageIcon({ state }: { state: StageState }) {
    if (state === "done") {
        return (
            <span style={{ display: "inline-flex", alignItems: "center", fontSize: "11px" }}>
                <Codicon name="check" />
            </span>
        );
    }
    if (state === "active") {
        return (
            <span
                className="codicon codicon-loading spin"
                role="img"
                style={{ fontSize: "11px", display: "inline-flex", alignItems: "center" }}
            />
        );
    }
    return (
        <span
            style={{
                display: "inline-flex",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                border: "1px solid var(--vscode-descriptionForeground)",
                opacity: 0.4,
                flexShrink: 0,
            }}
        />
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

export function MigrationEnhancementBanner({
    aiFeatureUsed,
    isActive,
    fullyEnhanced,
    messages,
    onDismiss,
    onStartEnhancement,
}: MigrationEnhancementBannerProps) {
    const stages = useMemo(() => deriveStages(messages), [messages]);

    // Banner is hidden once enhancement is completed
    if (fullyEnhanced) {
        return null;
    }

    // ── "Skip" banner: user did not enable AI at wizard, offer to start later ──
    if (!aiFeatureUsed) {
        return (
            <BannerContainer>
                <BannerHeader>
                    <BannerTitle>
                        <span className="codicon codicon-sparkle" style={{ fontSize: '11px', opacity: 0.7 }} />
                        AI Migration Enhancement available
                    </BannerTitle>
                    <DismissButton title="Dismiss" onClick={onDismiss} aria-label="Dismiss migration banner">
                        <span className="codicon codicon-close" style={{ fontSize: '12px' }} />
                    </DismissButton>
                </BannerHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>Start AI enhancement pipeline:</span>
                    <StartButton
                        variant="primary"
                        onClick={() => onStartEnhancement?.()}
                        title="Automatically fix build errors, resolve TODOs, and run tests"
                    >
                        <span className="codicon codicon-zap" style={{ fontSize: '11px' }} />
                        Auto-fix
                    </StartButton>

                </div>
            </BannerContainer>
        );
    }

    // ── Active / pending enhancement banner ───────────────────────────────
    return (
        <BannerContainer>
            <BannerHeader>
                <BannerTitle>
                    <span className="codicon codicon-rocket" style={{ fontSize: '11px', opacity: 0.7 }} />
                    Migration Enhancement
                    <ModeBadge>Auto-fix</ModeBadge>
                    {isActive && (
                        <span
                            className="codicon codicon-loading spin"
                            style={{ fontSize: '11px', marginLeft: '4px' }}
                        />
                    )}
                </BannerTitle>
                <DismissButton title="Dismiss" onClick={onDismiss} aria-label="Dismiss migration banner">
                    <span className="codicon codicon-close" style={{ fontSize: '12px' }} />
                </DismissButton>
            </BannerHeader>
            <StageList>
                {stages.map((stage, i) => (
                    <StageItem key={stage.label} state={stage.state} isLast={i === stages.length - 1}>
                        <StageIcon state={stage.state} />
                        <StageLabel state={stage.state}>{stage.label}</StageLabel>
                    </StageItem>
                ))}
            </StageList>
        </BannerContainer>
    );
}

export default MigrationEnhancementBanner;
