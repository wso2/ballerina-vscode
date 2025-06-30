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
import { exec } from "child_process";
import { window, commands, workspace, Uri } from "vscode";
import * as fs from 'fs';
import path from "path";
import { BallerinaProjectComponents, ComponentRequest, CreateComponentResponse, createFunctionSignature, EVENT_TYPE, NodePosition, STModification, SyntaxTreeResponse } from "@wso2/ballerina-core";
import { StateMachine, history, openView } from "../stateMachine";
import { applyModifications, modifyFileContent, writeBallerinaFileDidOpen } from "./modification";
import { ModulePart, STKindChecker } from "@wso2/syntax-tree";
import { URI } from "vscode-uri";

export const README_FILE = "readme.md";
export const FUNCTIONS_FILE = "functions.bal";
export const DATA_MAPPING_FILE = "data_mappings.bal";

export function openBIProject() {
    window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: 'Open Integration' })
        .then(uri => {
            if (uri && uri[0]) {
                commands.executeCommand('vscode.openFolder', uri[0]);
            }
        });
}

export function createBIProject(name: string, isService: boolean) {
    window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: 'Select Project Location' })
        .then(uri => {
            if (uri && uri[0]) {
                const projectLocation = uri[0].fsPath;

                const command = isService ? `bal new -t service ${name}` : `bal new ${name}`;
                const options = { cwd: projectLocation };

                exec(command, options, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error creating BI project: ${error.message}`);
                        return;
                    }

                    console.log(`BI project created successfully at ${projectLocation}`);
                    console.log(`stdout: ${stdout}`);
                    console.error(`stderr: ${stderr}`);

                    // Update Ballerina.toml file in the created project folder
                    const tomlFilePath = `${projectLocation}/${name}/Ballerina.toml`;
                    hackToUpdateBallerinaToml(tomlFilePath);

                    if (isService) {
                        const filePath = `${projectLocation}/${name}/service.bal`;
                        hackToUpdateService(filePath);
                    } else {
                        const filePath = `${projectLocation}/${name}/main.bal`;
                        hackToUpdateMain(filePath);
                    }

                    const newProjectUri = Uri.joinPath(uri[0], name);
                    commands.executeCommand('vscode.openFolder', newProjectUri);

                });
            }
        });
}

export function createBIProjectPure(name: string, projectPath: string) {
    const projectLocation = projectPath;

    name = sanitizeName(name);
    const projectRoot = path.join(projectLocation, name);
    // Create project root directory
    if (!fs.existsSync(projectRoot)) {
        fs.mkdirSync(projectRoot);
    }

    // Get current username from the system across different OS platforms
    let username;
    try {
        if (process.platform === 'win32') {
            // Windows
            username = process.env.USERNAME || 'myOrg';
        } else {
            // macOS and Linux
            username = process.env.USER || 'myOrg';
        }
    } catch (error) {
        console.error('Error getting username:', error);
    }

    const EMPTY = "\n";

    const ballerinaTomlContent = `
[package]
org = "${username}"
name = "${name}"
version = "0.1.0"

[build-options]
sticky = true

`;

    const settingsJsonContent = `
{
    "ballerina.isBI": true
}
`;

    const launchJsonContent = `
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Ballerina Debug",
            "type": "ballerina",
            "request": "launch",
            "programArgs": [],
            "commandOptions": [],
            "env": {}
        },
        {
            "name": "Ballerina Test",
            "type": "ballerina",
            "request": "launch",
            "debugTests": true,
            "programArgs": [],
            "commandOptions": [],
            "env": {}
        },
        {
            "name": "Ballerina Remote",
            "type": "ballerina",
            "request": "attach",
            "debuggeeHost": "127.0.0.1",
            "debuggeePort": "5005"
        }
    ]
}
`;

    const gitignoreContent = `
# Ballerina generates this directory during the compilation of a package.
# It contains compiler-generated artifacts and the final executable if this is an application package.
target/

# Ballerina maintains the compiler-generated source code here.
# Remove this if you want to commit generated sources.
generated/

# Contains configuration values used during development time.
# See https://ballerina.io/learn/provide-values-to-configurable-variables/ for more details.
Config.toml
`;

    // Create Ballerina.toml file
    const ballerinaTomlPath = path.join(projectRoot, 'Ballerina.toml');
    writeBallerinaFileDidOpen(ballerinaTomlPath, ballerinaTomlContent);

    // Create connections.bal file
    const connectionsBalPath = path.join(projectRoot, 'connections.bal');
    writeBallerinaFileDidOpen(connectionsBalPath, EMPTY);

    // Create config.bal file
    const configurationsBalPath = path.join(projectRoot, 'config.bal');
    writeBallerinaFileDidOpen(configurationsBalPath, EMPTY);

    // Create types.bal file
    const typesBalPath = path.join(projectRoot, 'types.bal');
    writeBallerinaFileDidOpen(typesBalPath, EMPTY);

    // Create main.bal file
    const mainBal = path.join(projectRoot, 'main.bal');
    writeBallerinaFileDidOpen(mainBal, EMPTY);

    // Create main.bal file
    const agentsBal = path.join(projectRoot, 'agents.bal');
    writeBallerinaFileDidOpen(agentsBal, EMPTY);

    // Create functions.bal file
    const functionsBal = path.join(projectRoot, 'functions.bal');
    writeBallerinaFileDidOpen(functionsBal, EMPTY);

    // Create datamappings.bal file
    const datamappingsBalPath = path.join(projectRoot, 'data_mappings.bal');
    writeBallerinaFileDidOpen(datamappingsBalPath, EMPTY);

    // Create a .vscode folder
    const vscodeDir = path.join(projectRoot, '.vscode');
    if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir);
    }

    // Create launch.json file
    const launchPath = path.join(vscodeDir, 'launch.json');
    fs.writeFileSync(launchPath, launchJsonContent.trim());

    // Create settings.json file
    const settingsPath = path.join(vscodeDir, 'settings.json');
    fs.writeFileSync(settingsPath, settingsJsonContent);

    // Create .gitignore file
    const gitignorePath = path.join(projectRoot, '.gitignore');
    fs.writeFileSync(gitignorePath, gitignoreContent.trim());

    console.log(`BI project created successfully at ${projectRoot}`);
    commands.executeCommand('vscode.openFolder', Uri.file(path.resolve(projectRoot)));
}

export async function createBIAutomation(params: ComponentRequest): Promise<CreateComponentResponse> {
    return new Promise(async (resolve) => {
        const functionFile = await handleAutomationCreation(params);
        const components = await StateMachine.langClient().getBallerinaProjectComponents({
            documentIdentifiers: [{ uri: URI.file(StateMachine.context().projectUri).toString() }]
        }) as BallerinaProjectComponents;
        const position: NodePosition = {};
        for (const pkg of components.packages) {
            for (const module of pkg.modules) {
                module.automations.forEach(func => {
                    position.startColumn = func.startColumn;
                    position.startLine = func.startLine;
                    position.endLine = func.endLine;
                    position.endColumn = func.endColumn;
                });
            }
        }
        openView(EVENT_TYPE.OPEN_VIEW, { documentUri: functionFile, position });
        history.clear();
        resolve({ response: true, error: "" });
    });
}

export async function createBIFunction(params: ComponentRequest): Promise<CreateComponentResponse> {
    return new Promise(async (resolve) => {
        const isExpressionBodied = params.functionType.isExpressionBodied;
        const projectDir = path.join(StateMachine.context().projectUri);
        // Hack to create trasformation function (Use LS API to create the function when available)
        const targetFile = path.join(projectDir, isExpressionBodied ? DATA_MAPPING_FILE : FUNCTIONS_FILE);
        if (!fs.existsSync(targetFile)) {
            writeBallerinaFileDidOpen(targetFile, '');
        }
        const response = await handleFunctionCreation(targetFile, params);
        await modifyFileContent({ filePath: targetFile, content: response.source });
        const modulePart: ModulePart = response.syntaxTree as ModulePart;
        let targetPosition: NodePosition = response.syntaxTree?.position;
        modulePart.members.forEach(member => {
            if (STKindChecker.isFunctionDefinition(member) && member.functionName.value === params.functionType.name.trim()) {
                targetPosition = member.position;
            }
        });
        openView(EVENT_TYPE.OPEN_VIEW, { documentUri: targetFile, position: targetPosition });
        history.clear();
        resolve({ response: true, error: "" });
    });
}

// <---------- Task Source Generation START-------->
export async function handleAutomationCreation(params: ComponentRequest) {
    let paramList = '';
    const paramLength = params.functionType?.parameters.length;
    if (paramLength > 0) {
        params.functionType.parameters.forEach((param, index) => {
            let paramValue = param.defaultValue ? `${param.type} ${param.name} = ${param.defaultValue}, ` : `${param.type} ${param.name}, `;
            if (paramLength === index + 1) {
                paramValue = param.defaultValue ? `${param.type} ${param.name} = ${param.defaultValue}` : `${param.type} ${param.name}`;
            }
            paramList += paramValue;
        });
    }
    let funcSignature = `public function main(${paramList}) returns error? {`;
    const balContent = `import ballerina/log;

${funcSignature}
    do {

    } on fail error e {
        log:printError("Error: ", 'error = e);
        return e;
    }
}
`;
    const projectDir = path.join(StateMachine.context().projectUri);
    // Create foo.bal file within services directory
    const taskFile = path.join(projectDir, `automation.bal`);
    writeBallerinaFileDidOpen(taskFile, balContent);
    console.log('Task Created.', `automation.bal`);
    return taskFile;
}
// <---------- Task Source Generation END-------->

// <---------- Function Source Generation START-------->
export async function handleFunctionCreation(targetFile: string, params: ComponentRequest): Promise<SyntaxTreeResponse> {
    const modifications: STModification[] = [];
    const { parameters, returnType, name, isExpressionBodied } = params.functionType;
    const parametersStr = parameters
        .map((item) => `${item.type} ${item.name} ${item.defaultValue ? `= ${item.defaultValue}` : ''}`)
        .join(",");

    const returnTypeStr = `returns ${!returnType ? 'error?' : isExpressionBodied ? `${returnType}` : `${returnType}|error?`}`;

    const expBody = `{
    do {

    } on fail error e {
        return e;
    }
}`;

    const document = await workspace.openTextDocument(Uri.file(targetFile));
    const lastPosition = document.lineAt(document.lineCount - 1).range.end;

    const targetPosition: NodePosition = {
        startLine: lastPosition.line,
        startColumn: 0,
        endLine: lastPosition.line,
        endColumn: 0
    };
    modifications.push(
        createFunctionSignature(
            "",
            name,
            parametersStr,
            returnTypeStr,
            targetPosition,
            false,
            params.functionType.isExpressionBodied,
            params.functionType.isExpressionBodied ? `{}` : expBody
        )
    );

    const res = await applyModifications(targetFile, modifications) as SyntaxTreeResponse;
    return res;
}
// <---------- Function Source Generation END-------->
// Test_Integration test_integration   Test Integration testIntegration -> testintegration
export function sanitizeName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase(); // Replace invalid characters with underscores
}

// ------------------- HACKS TO MANIPULATE PROJECT FILES ---------------->
function hackToUpdateBallerinaToml(filePath: string) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading Ballerina.toml file: ${err.message}`);
            return;
        }

        // Append "bi=true" to the Ballerina.toml content
        const updatedContent = `${data.trim()}\nbi = true\n`;

        // Write the updated content back to the Ballerina.toml file
        fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
            if (err) {
                console.error(`Error updating Ballerina.toml file: ${err.message}`);
            } else {
                console.log('Ballerina.toml file updated successfully');
            }
        });
    });
}

function hackToUpdateService(filePath: string) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading Ballerina.toml file: ${err.message}`);
            return;
        }

        // Append "bi=true" to the Ballerina.toml content
        const newContent = `import ballerina/http;

        service /hello on new http:Listener(9090) {
            resource function get greeting(string name) returns string|error {
                
            }
        }
        `;

        // Write the updated content back to the Ballerina.toml file
        fs.writeFile(filePath, newContent, 'utf8', (err) => {
            if (err) {
                console.error(`Error updating Ballerina.toml file: ${err.message}`);
            } else {
                console.log('Ballerina.toml file updated successfully');
            }
        });
    });
}

function hackToUpdateMain(filePath: string) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading Ballerina.toml file: ${err.message}`);
            return;
        }

        // Append "bi=true" to the Ballerina.toml content
        const newContent = `public function main() {

        }
        `;

        // Write the updated content back to the Ballerina.toml file
        fs.writeFile(filePath, newContent, 'utf8', (err) => {
            if (err) {
                console.error(`Error updating Ballerina.toml file: ${err.message}`);
            } else {
                console.log('Ballerina.toml file updated successfully');
            }
        });
    });
}
