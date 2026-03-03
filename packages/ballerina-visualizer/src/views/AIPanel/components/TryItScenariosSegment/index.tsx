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

import { keyframes } from "@emotion/css";
import styled from "@emotion/styled";
import React, { useEffect, useState } from "react";
import TestCaseContainer from "./TestCaseContainer";
import { HTTPErrorResponse, HTTPResponse, HTTPToolEventInput, HTTPToolEventOutput, TestCase } from "./types";

const loadingProgress = keyframes`
    0% { width: 0%; }
    50% { width: 70%; }
    100% { width: 100%; }
`;

const LoadingLine = styled.div`
    height: 2px;
    background-color: var(--vscode-progressBar-background);
    animation: ${loadingProgress} 2s ease-in-out infinite;
    margin-bottom: 8px;
`;

const TryItContainer = styled.div`
    width: 100%;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 8px;
`;

const ScenarioGroup = styled.div`
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    margin: 8px 0;
    overflow: hidden;
`;

const ScenarioHeader = styled.div`
    color: var(--vscode-foreground);
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const ScenarioContent = styled.div`
    padding: 4px 8px;
`;

interface TryItScenariosSegmentProps {
    text: string;
    loading: boolean;
}

export type { HTTPToolEventInput, HTTPToolEventOutput } from "./types";

const TryItScenariosSegment: React.FC<TryItScenariosSegmentProps> = ({ text, loading }) => {
    const [scenarioCases, setScenarioCases] = useState<Map<string, TestCase[]>>(new Map());
    const [standaloneCases, setStandaloneCases] = useState<TestCase[]>([]);
    // text will be surrounded by either <call> or <result> the JSON string is inside the tag. We need to parse the text and segregate the test cases based on scenarios if scenario is present in the text, otherwise put it in standalone cases.
    const regex = /<call>([\s\S]*?)<\/call>|<result>([\s\S]*?)<\/result>/g;
    useEffect(() => {
        const newScenarioCases = new Map<string, TestCase[]>();
        const newStandaloneCases: TestCase[] = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            if (match[1]) {
                // <call> block matched
                try {
                    const input: HTTPToolEventInput = JSON.parse(decodeURIComponent(match[1]));
                    const testCase: TestCase = {
                        isResult: false,
                        request: input.request,
                    };
                    if (input.scenario) {
                        if (!newScenarioCases.has(input.scenario)) {
                            newScenarioCases.set(input.scenario, []);
                        }
                        newScenarioCases.get(input.scenario)?.push(testCase);
                    } else {
                        newStandaloneCases.push(testCase);
                    }
                } catch (error) {
                    console.error("Failed to parse HTTP request input from <call> block:", error);
                }
            } else if (match[2]) {
                // <result> block matched
                try {
                    const output: HTTPToolEventOutput = JSON.parse(decodeURIComponent(match[2]));
                    const testCase: TestCase = {
                        isResult: true,
                        request: output.request,
                        output: output.output,
                    };
                    if (output.scenario) {
                        if (!newScenarioCases.has(output.scenario)) {
                            newScenarioCases.set(output.scenario, []);
                        }
                        newScenarioCases.get(output.scenario)?.push(testCase);
                    } else {
                        newStandaloneCases.push(testCase);
                    }
                } catch (error) {
                    console.error("Failed to parse HTTP response output from <result> block:", error);
                }
            }
        }
        setScenarioCases(newScenarioCases);
        setStandaloneCases(newStandaloneCases);
    }, [text]);

    return (
        <TryItContainer>
            {loading && <LoadingLine />}
            {Array.from(scenarioCases.entries()).map(([scenario, cases]) => (
                <ScenarioGroup key={`scenario-${scenario}`}>
                    <ScenarioHeader>{scenario}</ScenarioHeader>
                    <ScenarioContent>
                        {cases.map((testCase, index) => (
                            <TestCaseContainer
                                key={`scenario-${scenario}-${index}`}
                                testCase={testCase}
                            />
                        ))}
                    </ScenarioContent>
                </ScenarioGroup>
            ))}
            {standaloneCases.map((testCase, index) => (
                <TestCaseContainer key={`standalone-${index}`} testCase={testCase} />
            ))}
        </TryItContainer>
    );
};

export default TryItScenariosSegment;
