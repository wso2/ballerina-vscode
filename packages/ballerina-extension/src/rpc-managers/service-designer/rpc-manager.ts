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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    ExportOASRequest,
    ExportOASResponse,
    FunctionModelRequest,
    FunctionModelResponse,
    FunctionSourceCodeRequest,
    HttpResourceModelRequest,
    HttpResourceModelResponse,
    ListenerModelFromCodeRequest,
    ListenerModelFromCodeResponse,
    ListenerModelRequest,
    ListenerModelResponse,
    ListenerSourceCodeRequest,
    ListenerSourceCodeResponse,
    ListenersRequest,
    ListenersResponse,
    OpenAPISpec,
    ResourceSourceCodeResponse,
    STModification,
    ServiceDesignerAPI,
    ServiceModelFromCodeRequest,
    ServiceModelFromCodeResponse,
    ServiceModelRequest,
    ServiceModelResponse,
    ServiceSourceCodeRequest,
    UpdatedArtifactsResponse,
    SyntaxTree,
    TriggerModelsRequest,
    TriggerModelsResponse,
    DIRECTORY_MAP
} from "@wso2/ballerina-core";
import { NodePosition } from "@wso2/syntax-tree";
import * as fs from 'fs';
import { existsSync, writeFileSync } from "fs";
import * as yaml from 'js-yaml';
import * as path from 'path';
import * as vscode from "vscode";
import { Uri, window, workspace } from "vscode";
import { StateMachine } from "../../stateMachine";
import { extension } from "../../BalExtensionContext";
import { updateSourceCode } from "../../utils/source-utils";

export class ServiceDesignerRpcManager implements ServiceDesignerAPI {

    async exportOASFile(params: ExportOASRequest): Promise<ExportOASResponse> {
        return new Promise(async (resolve) => {
            const res: ExportOASResponse = { openSpecFile: null };
            const documentFilePath = params.documentFilePath ? params.documentFilePath : StateMachine.context().documentUri;
            const spec = await StateMachine.langClient().convertToOpenAPI({ documentFilePath }) as OpenAPISpec;
            if (spec.content) {
                // Convert the OpenAPI spec to a YAML string
                const yamlStr = yaml.dump(spec.content[0].spec);
                window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: 'Select OAS Save Location' })
                    .then(uri => {
                        if (uri && uri[0]) {
                            const projectLocation = uri[0].fsPath;
                            // Construct the correct path for the output file
                            const filePath = path.join(projectLocation, `${spec.content[0]?.serviceName}_openapi.yaml`);

                            // Save the YAML string to the file
                            fs.writeFileSync(filePath, yamlStr, 'utf8');
                            // Set the response
                            res.openSpecFile = filePath;
                            // Open the file in a new VSCode document
                            workspace.openTextDocument(filePath).then(document => {
                                window.showTextDocument(document);
                            });
                        }
                    });
            } else {
                window.showErrorMessage(spec.error);
            }
            resolve(res);
        });
    }

    async getListeners(params: ListenersRequest): Promise<ListenersResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const projectDir = path.join(StateMachine.context().projectUri);
                const targetFile = path.join(projectDir, `main.bal`);
                this.ensureFileExists(targetFile);
                params.filePath = targetFile;
                const res: ListenersResponse = await context.langClient.getListeners(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getListenerModel(params: ListenerModelRequest): Promise<ListenerModelResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: ListenerModelResponse = await context.langClient.getListenerModel(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async addListenerSourceCode(params: ListenerSourceCodeRequest): Promise<UpdatedArtifactsResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const projectDir = path.join(StateMachine.context().projectUri);
                const targetFile = path.join(projectDir, `main.bal`);
                this.ensureFileExists(targetFile);
                params.filePath = targetFile;
                const res: ListenerSourceCodeResponse = await context.langClient.addListenerSourceCode(params);
                const artifacts = await updateSourceCode({ textEdits: res.textEdits, resolveMissingDependencies: true }, { artifactType: DIRECTORY_MAP.LISTENER });
                const result: UpdatedArtifactsResponse = {
                    artifacts: artifacts
                };
                // Set timeout to resolve after 2 seconds if no notification received
                setTimeout(() => {
                    if (extension.hasPullModuleNotification) {
                        const waitForModuleResolution = new Promise<void>((resolve) => {
                            const checkInterval = setInterval(() => {
                                if (extension.hasPullModuleResolved) {
                                    clearInterval(checkInterval);
                                    resolve();
                                }
                            }, 100);
                        });
                        waitForModuleResolution.then(() => {
                            resolve(result);
                        });
                    } else {
                        resolve(result);
                    }
                }, 1000);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async updateListenerSourceCode(params: ListenerSourceCodeRequest): Promise<UpdatedArtifactsResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const projectDir = path.join(StateMachine.context().projectUri);
                const targetFile = path.join(projectDir, `main.bal`);
                this.ensureFileExists(targetFile);
                params.filePath = targetFile;
                const res: ListenerSourceCodeResponse = await context.langClient.updateListenerSourceCode(params);
                const artifacts = await updateSourceCode(res, { artifactType: DIRECTORY_MAP.LISTENER });
                const result: UpdatedArtifactsResponse = {
                    artifacts: artifacts
                };
                resolve(result);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getServiceModel(params: ServiceModelRequest): Promise<ServiceModelResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const projectDir = path.join(StateMachine.context().projectUri);
                const targetFile = path.join(projectDir, `main.bal`);
                this.ensureFileExists(targetFile);
                params.filePath = targetFile;
                const res: ServiceModelResponse = await context.langClient.getServiceModel(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async addServiceSourceCode(params: ServiceSourceCodeRequest): Promise<UpdatedArtifactsResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const projectDir = path.join(StateMachine.context().projectUri);
                const targetFile = path.join(projectDir, `main.bal`);
                this.ensureFileExists(targetFile);
                params.filePath = targetFile;
                const identifiers = [];
                for (let property in params.service.properties) {
                    const value = params.service.properties[property].value || params.service.properties[property].values?.at(0);
                    if (value) {
                        identifiers.push(value);
                    }
                    if (params.service.properties[property].choices) {
                        params.service.properties[property].choices.forEach(choice => {
                            if (choice.properties) {
                                Object.keys(choice.properties).forEach(subProperty => {
                                    const subPropertyValue = choice.properties[subProperty].value;
                                    if (subPropertyValue) {
                                        identifiers.push(subPropertyValue);
                                    }
                                });
                            }
                        });
                    }
                }
                const res: ListenerSourceCodeResponse = await context.langClient.addServiceSourceCode(params);
                const artifacts = await updateSourceCode(res, { artifactType: DIRECTORY_MAP.SERVICE });
                let result: UpdatedArtifactsResponse = {
                    artifacts: artifacts
                };
                resolve(result);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async updateServiceSourceCode(params: ServiceSourceCodeRequest): Promise<UpdatedArtifactsResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const projectDir = path.join(StateMachine.context().projectUri);
                const targetFile = path.join(projectDir, `main.bal`);
                this.ensureFileExists(targetFile);
                params.filePath = targetFile;
                const identifiers = [];
                for (let property in params.service.properties) {
                    const value = params.service.properties[property].value || params.service.properties[property].values?.at(0);
                    if (value) {
                        identifiers.push(value);
                    }
                }
                const res: ListenerSourceCodeResponse = await context.langClient.updateServiceSourceCode(params);
                const artifacts = await updateSourceCode(res, { artifactType: DIRECTORY_MAP.SERVICE });
                const result: UpdatedArtifactsResponse = {
                    artifacts: artifacts
                };
                // Find the correct artifact by checking the position
                const lineRange = params.service.codedata.lineRange;
                const artifact = artifacts.find(artifact => artifact.position.startLine === lineRange.startLine.line && artifact.position.startColumn === lineRange.startLine.offset);
                if (artifact) {
                    result.artifacts = [artifact];
                }
                resolve(result);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getServiceModelFromCode(params: ServiceModelFromCodeRequest): Promise<ServiceModelFromCodeResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: ServiceModelFromCodeResponse = await context.langClient.getServiceModelFromCode(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getHttpResourceModel(params: HttpResourceModelRequest): Promise<HttpResourceModelResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: HttpResourceModelResponse = await context.langClient.getHttpResourceModel(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async addResourceSourceCode(params: FunctionSourceCodeRequest): Promise<UpdatedArtifactsResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const projectDir = path.join(StateMachine.context().projectUri);
                if (!params.filePath) {
                    const targetFile = path.join(projectDir, `main.bal`);
                    this.ensureFileExists(targetFile);
                    params.filePath = targetFile;
                }
                const res: ResourceSourceCodeResponse = await context.langClient.addResourceSourceCode(params);
                const artifacts = await updateSourceCode(res, { artifactType: DIRECTORY_MAP.SERVICE });
                const result: UpdatedArtifactsResponse = {
                    artifacts: artifacts
                };
                resolve(result);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async updateResourceSourceCode(params: FunctionSourceCodeRequest): Promise<UpdatedArtifactsResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: ResourceSourceCodeResponse = await context.langClient.updateResourceSourceCode(params);
                const artifacts = await updateSourceCode(res);
                const result: UpdatedArtifactsResponse = {
                    artifacts: artifacts
                };
                resolve(result);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getListenerModelFromCode(params: ListenerModelFromCodeRequest): Promise<ListenerModelFromCodeResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: ListenerModelFromCodeResponse = await context.langClient.getListenerFromSourceCode(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async addFunctionSourceCode(params: FunctionSourceCodeRequest): Promise<UpdatedArtifactsResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: ResourceSourceCodeResponse = await context.langClient.addFunctionSourceCode(params);
                const artifacts = await updateSourceCode(res);
                const result: UpdatedArtifactsResponse = {
                    artifacts: artifacts
                };
                resolve(result);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getTriggerModels(params: TriggerModelsRequest): Promise<TriggerModelsResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: TriggerModelsResponse = await context.langClient.getTriggerModels(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getFunctionModel(params: FunctionModelRequest): Promise<FunctionModelResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: FunctionModelResponse = await context.langClient.getFunctionModel(params);
                resolve(res);
            } catch (error) {
                console.log(">>> error fetching function model", error);
            }
        });
    }

    private ensureFileExists(targetFile: string) {
        // Check if the file exists
        if (!fs.existsSync(targetFile)) {
            // Create the file if it does not exist
            fs.writeFileSync(targetFile, "");
            console.log(`>>> Created file at ${targetFile}`);
        }
    }
}
