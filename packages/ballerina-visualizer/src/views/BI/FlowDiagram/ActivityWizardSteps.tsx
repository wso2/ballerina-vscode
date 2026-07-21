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

import styled from "@emotion/styled";

const StepsContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    border-bottom: 1px solid var(--vscode-editorWidget-border);
`;

const Step = styled.div<{ active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: ${(props: { active: boolean }) =>
        props.active ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)"};
    font-weight: ${(props: { active: boolean }) => (props.active ? 600 : 400)};
`;

const StepNumber = styled.span<{ active: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    font-size: 10px;
    background-color: ${(props: { active: boolean }) =>
        props.active ? "var(--vscode-button-background)" : "var(--vscode-editorWidget-border)"};
    color: ${(props: { active: boolean }) =>
        props.active ? "var(--vscode-button-foreground)" : "var(--vscode-descriptionForeground)"};
`;

const Separator = styled.span`
    margin: 0 2px;
`;

const STEP_LABELS = ["Create Activity", "Call Activity"];

/**
 * The two-step progress bar of the create-activity-from-connection flow, shown after an action is
 * selected: create the activity, then wire the activity call. (The connection/action selection uses
 * the shared connection list, so no step bar is shown there.)
 */
export function ActivityWizardSteps({ activeStep }: { activeStep: 1 | 2 }): JSX.Element {
    return (
        <StepsContainer>
            {STEP_LABELS.map((label, index) => (
                <Step key={label} active={activeStep === index + 1}>
                    <StepNumber active={activeStep === index + 1}>{index + 1}</StepNumber>
                    {label}
                    {index < STEP_LABELS.length - 1 && <Separator>›</Separator>}
                </Step>
            ))}
        </StepsContainer>
    );
}

export default ActivityWizardSteps;
