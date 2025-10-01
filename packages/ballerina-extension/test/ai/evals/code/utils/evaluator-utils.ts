// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { generateText } from "ai";
import { ProjectModule, ProjectSource, SourceFile, SourceFiles } from "@wso2/ballerina-core";
import { createAnthropic } from "@ai-sdk/anthropic";
import path from "path";
import fs from "fs";

export interface LLMEvaluationResult {
    is_correct: boolean;
    reasoning: string;
    rating: number;
}

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Uses an LLM to evaluate if the final code correctly implements the user query,
 * given an initial state.
 *
 * @param userQuery The original request from the user.
 * @param initialSource The source code before any changes were made.
 * @param finalSource The final, syntactically correct source code after generation/repair.
 * @returns A promise that resolves to an evaluation result.
 */
export async function evaluateCodeWithLLM(
    userQuery: string,
    initialSource: SourceFiles[],
    finalSource: SourceFiles[]
): Promise<LLMEvaluationResult> {
    console.log("🤖 Starting LLM-based semantic evaluation...");
    // console.log("🤖 Starting LLM-based semantic evaluation..." + `${JSON.stringify(initialSource)}` + `\n\n ${JSON.stringify(finalSource)} ` + ` ${userQuery}`);

    const stringifySources = (sources: SourceFiles[]): string => {
        if (sources.length === 0) return "No files in the project.";
        return sources.map(file => `--- File: ${file.filePath} ---\n${file.content}`).join("\n\n");
    };

    const initialCodeString = stringifySources(initialSource);
    const finalCodeString = stringifySources(finalSource);

    const systemPrompt = `You are an expert Ballerina developer and an meticulous code reviewer. Your task is to evaluate if the 'Final Code' correctly and completely implements the 'User Query', using the 'Initial Code' as the starting point.

Respond ONLY with a valid JSON object with two fields:
1. "is_correct": A boolean value. 'true' if the final code is a correct implementation of the query, 'false' otherwise.
2. "reasoning": A string explaining your decision. Be concise. If it's incorrect, clearly state what is wrong or missing.
3. "rating": A numer rating the quality and the accuracy based on the user query of the final code on a scale from 0 to 10, where 10 is perfect.

Do NOT provide any other text, greetings, or explanations outside of the JSON object.`;

    const userPrompt = `
# User Query
\`\`\`
${userQuery}
\`\`\`

# Initial Code
\`\`\`ballerina
${initialCodeString}
\`\`\`

# Final Code
\`\`\`ballerina
${finalCodeString}
\`\`\`
`;

    try {
        const { text } = await generateText({
            // model: await getAnthropicClient(ANTHROPIC_SONNET_4),
            model: anthropic('claude-sonnet-4-20250514'),
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
            maxTokens: 1024,
        });

        const result: LLMEvaluationResult = JSON.parse(text);
        console.log(`✅ LLM Evaluation Complete. Correct: ${result.is_correct}. Reason: ${result.reasoning}, Rating: ${result.rating}`);
        return result;

    } catch (error) {
        console.error("Error during LLM evaluation:", error);
        return {
            is_correct: false,
            reasoning: `Failed to evaluate due to an error: ${error instanceof Error ? error.message : "Unknown error"}`,
            rating: 0
        };
    }
}

export function getProjectFromResponse(req: string): SourceFiles[] {
    const sourceFiles: SourceFile[] = [];
    const regex = /<code filename="([^"]+)">\s*```ballerina([\s\S]*?)```\s*<\/code>/g;
    let match;

    while ((match = regex.exec(req)) !== null) {
        const filePath = match[1];
        const fileContent = match[2].trim();
        sourceFiles.push({ filePath, content: fileContent });
    }

    return sourceFiles;
}

export async function getProjectSource(dirPath: string): Promise<ProjectSource | null> {
    const projectRoot = dirPath;

    if (!projectRoot) {
        return null;
    }

    const projectSource: ProjectSource = {
        sourceFiles: [],
        projectTests: [],
        projectModules: [],
        projectName: ""
    };

    // Read root-level .bal files
    const rootFiles = fs.readdirSync(projectRoot);
    for (const file of rootFiles) {
        if (file.endsWith('.bal')) {
            const filePath = path.join(projectRoot, file);
            const content = await fs.promises.readFile(filePath, 'utf-8');
            projectSource.sourceFiles.push({ filePath, content });
        }
    }

    // Read modules
    const modulesDir = path.join(projectRoot, 'modules');
    if (fs.existsSync(modulesDir)) {
        const modules = fs.readdirSync(modulesDir, { withFileTypes: true });
        for (const moduleDir of modules) {
            if (moduleDir.isDirectory()) {
                const projectModule: ProjectModule = {
                    moduleName: moduleDir.name,
                    sourceFiles: [],
                    isGenerated: false,
                };

                const moduleFiles = fs.readdirSync(path.join(modulesDir, moduleDir.name));
                for (const file of moduleFiles) {
                    if (file.endsWith('.bal')) {
                        const filePath = path.join(modulesDir, moduleDir.name, file);
                        const content = await fs.promises.readFile(filePath, 'utf-8');
                        projectModule.sourceFiles.push({ filePath, content });
                    }
                }

                projectSource.projectModules.push(projectModule);
            }
        }
    }

    return projectSource;
}
