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

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { StateMachine } from '../../../../stateMachine';
import { OperationType, ProjectModule, ProjectSource, ExecutionContext } from '@wso2/ballerina-core';
import { getWorkspaceTomlValues } from '../../../../utils';
import { NATURAL_PROGRAMMING_DIR_NAME, REQ_KEY, REQUIREMENT_DOC_PREFIX, REQUIREMENT_MD_DOCUMENT, REQUIREMENT_TEXT_DOCUMENT } from '../../../../rpc-managers/ai-panel/constants';
import { isErrorCode, requirementsSpecification } from '../../../../rpc-managers/ai-panel/utils';
import { sendAgentDidCloseBatch } from './ls-schema-notifications';
import { parseTomlToConfig } from '../../../../../src/features/config-generator/utils';
import { BALLERINA_TOML } from '../../../../../src/utils/project-utils';

/**
 * Result of getTempProject operation
 */
export interface TempProjectResult {
    /** Path to the temporary project directory */
    path: string;
}

interface BallerinaProject {
    projectName: string;
    modules?: BallerinaModule[];
    sources: { [key: string]: string };
}

interface BallerinaModule {
    moduleName: string;
    sources: { [key: string]: string };
    isGenerated: boolean;
}

/**
 * Recursively finds all .bal files in a directory
 * @param dir Directory to search
 * @param baseDir Base directory for relative paths (defaults to dir)
 * @returns Array of relative file paths
 */
function findAllBalFiles(dir: string, baseDir?: string): string[] {
    const base = baseDir || dir;
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                files.push(...findAllBalFiles(fullPath, base));
            } else if (entry.isFile() && entry.name.endsWith('.bal')) {
                const relativePath = path.relative(base, fullPath);
                files.push(relativePath);
            }
        }
    } catch (error) {
        console.warn(`[findAllBalFiles] Error reading directory ${dir}:`, error);
    }

    return files;
}

// TODO: Improve sync strategy and timing
// Current approach syncs all workspace files to temp on every session continuation.
// Consider:
// - More granular sync triggers (only sync when external changes detected)
// - Smarter sync timing (sync before AI operations, not during session start)
// - Bidirectional conflict detection (workspace vs temp changes)
// - Performance optimization for large projects

/**
 * Creates a temporary project directory for AI operations.
 *
 * Priority order for source project path:
 * 1. ctx.projectPath (set by caller, isolated per execution)
 * 2. ctx.workspacePath (fallback for workspace context)
 *
 * @param ctx - Execution context containing project paths
 * @returns Result containing temp path
 */
export async function getTempProject(ctx: ExecutionContext): Promise<TempProjectResult> {
    let projectRoot = ctx.projectPath;
    const workspacePath = ctx.workspacePath;
    if (workspacePath) {
        projectRoot = workspacePath;
    }

    const projectHash = crypto.createHash('sha256').update(projectRoot).digest('hex');
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const tempDir = path.join(os.tmpdir(), `bal-proj-${projectHash}-${timestamp}-${randomSuffix}`);

    if (fs.existsSync(tempDir)) {
        const existingFiles = findAllBalFiles(tempDir);

        if (existingFiles.length > 0) {
            sendAgentDidCloseBatch(tempDir, existingFiles);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Copy entire project to temp directory
    fs.cpSync(projectRoot, tempDir, { recursive: true });

    return {
        path: tempDir
    };
}

/**
 * Cleans up a temporary project directory
 *
 * @param tempPath Path to the temporary project to delete
 */
export function cleanupTempProject(tempPath: string): void {
    if (fs.existsSync(tempPath)) {
        try {
            fs.rmSync(tempPath, { recursive: true, force: true });
        } catch (error) {
            console.error(`Failed to cleanup temp project at ${tempPath}:`, error);
        }
    }
}

export async function getProjectSource(requestType: OperationType, ctx: ExecutionContext): Promise<ProjectSource[]> {
    const currentProjectPath = ctx.projectPath;
    const workspacePath = ctx.workspacePath;

    // Early return for non-workspace case: single project only
    if (!workspacePath) {
        const project = await getCurrentProjectSource(requestType, ctx);
        if (!project) {
            throw new Error('Cannot get project source - ExecutionContext projectPath not initialized');
        }
        // No workspace context, so packagePath is empty string
        return [convertToProjectSource(project, "", true)];
    }

    // Workspace case: load all packages from the workspace
    const workspaceTomlValues = await getWorkspaceTomlValues(workspacePath);

    // Fallback to single project if workspace.toml is invalid or has no packages
    if (!workspaceTomlValues || !workspaceTomlValues.workspace || !workspaceTomlValues.workspace.packages) {
        const project = await getCurrentProjectSource(requestType, ctx);
        // Workspace exists but invalid, treat as non-workspace
        return [convertToProjectSource(project, "", true)];
    }

    const langClient = StateMachine.langClient();
    const projectInfo = await langClient.getProjectInfo({ projectPath: ctx.projectPath });
    const packagePaths = projectInfo?.children.map(child => child.projectPath) || [];

    // Load all packages in parallel
    const projectSources: ProjectSource[] = await Promise.all(
        packagePaths.map(async (pkgPath) => {
            // Resolve the full path for reading files and checking if active
            const fullPackagePath = path.isAbsolute(pkgPath)
                ? pkgPath
                : path.join(workspacePath, pkgPath);

            const project = await getCurrentProjectSource(requestType, ctx, fullPackagePath);
            const isActive = fullPackagePath === currentProjectPath;

            // Use relative path from workspace for packagePath
            const relativePackagePath = path.isAbsolute(pkgPath)
                ? path.relative(workspacePath, pkgPath)
                : pkgPath;

            return convertToProjectSource(project, relativePackagePath, isActive);
        })
    );

    return projectSources;
}

async function getCurrentProjectSource(
    requestType: OperationType,
    ctx: ExecutionContext,
    projectPathOverride?: string
): Promise<BallerinaProject> {
    const targetProjectPath = projectPathOverride || ctx.projectPath;
    if (!targetProjectPath) {
        return null;
    }

    // Read the Ballerina.toml file to get package name
    const ballerinaTomlPath = path.join(targetProjectPath, 'Ballerina.toml');
    let packageName: string = '';
    if (fs.existsSync(ballerinaTomlPath)) {
        const tomlContent = await fs.promises.readFile(ballerinaTomlPath, 'utf-8');
        // Simple parsing to extract the package.name field
        try {
            const tomlObj: BALLERINA_TOML = parseTomlToConfig(tomlContent) as BALLERINA_TOML;
            packageName = tomlObj.package.name;
        } catch (error) {
            packageName = '';
        }
    }

    const project: BallerinaProject = {
        modules: [],
        sources: {},
        projectName: packageName
    };

    // Read root-level .bal files
    const rootFiles = fs.readdirSync(targetProjectPath);
    for (const file of rootFiles) {
        if (file.endsWith('.bal') || file.toLowerCase() === "readme.md") {
            const filePath = path.join(targetProjectPath, file);
            project.sources[file] = await fs.promises.readFile(filePath, 'utf-8');
        }
    }

    if (requestType != "CODE_GENERATION") {
        const naturalProgrammingDirectory = targetProjectPath + `/${NATURAL_PROGRAMMING_DIR_NAME}`;
        if (fs.existsSync(naturalProgrammingDirectory)) {
            const reqFiles = fs.readdirSync(naturalProgrammingDirectory);
            for (const file of reqFiles) {
                const filePath = path.join(targetProjectPath, `${NATURAL_PROGRAMMING_DIR_NAME}`, file);
                if (file.toLowerCase() == REQUIREMENT_TEXT_DOCUMENT || file.toLowerCase() == REQUIREMENT_MD_DOCUMENT) {
                    project.sources[REQ_KEY] = await fs.promises.readFile(filePath, 'utf-8');
                    continue;
                } else if (file.toLowerCase().startsWith(REQUIREMENT_DOC_PREFIX)) {
                    const requirements = await requirementsSpecification(filePath);
                    if (!isErrorCode(requirements)) {
                        project.sources[REQ_KEY] = requirements.toString();
                        continue;
                    }
                    project.sources[REQ_KEY] = "";
                }
            }
        }
    }

    // Read modules
    const modulesDir = path.join(targetProjectPath, 'modules');
    const generatedDir = path.join(targetProjectPath, 'generated');
    await populateModules(modulesDir, project);
    await populateModules(generatedDir, project);
    return project;
}

async function populateModules(modulesDir: string, project: BallerinaProject) {
    if (fs.existsSync(modulesDir)) {
        const modules = fs.readdirSync(modulesDir, { withFileTypes: true });
        for (const moduleDir of modules) {
            if (moduleDir.isDirectory()) {
                const module: BallerinaModule = {
                    moduleName: moduleDir.name,
                    sources: {},
                    isGenerated: path.basename(modulesDir) !== 'modules'
                };

                const moduleFiles = fs.readdirSync(path.join(modulesDir, moduleDir.name));
                for (const file of moduleFiles) {
                    if (file.endsWith('.bal')) {
                        const filePath = path.join(modulesDir, moduleDir.name, file);
                        module.sources[file] = await fs.promises.readFile(filePath, 'utf-8');
                    }
                }

                project.modules.push(module);
            }
        }
    }
}

function convertToProjectSource(project: BallerinaProject, pkgPath: string, isActive: boolean): ProjectSource {
    const projectSource: ProjectSource = {
        sourceFiles: [],
        projectModules: [],
        projectName: project.projectName,
        packagePath: pkgPath,
        isActive: isActive
    };

    // Iterate through root-level sources
    for (const [filePath, content] of Object.entries(project.sources)) {
        projectSource.sourceFiles.push({ filePath, content });
    }

    // Iterate through module sources
    if (project.modules) {
        for (const module of project.modules) {
            const projectModule: ProjectModule = {
                moduleName: module.moduleName,
                sourceFiles: [],
                isGenerated: module.isGenerated
            };
            for (const [fileName, content] of Object.entries(module.sources)) {
                projectModule.sourceFiles.push({ filePath: fileName, content });
            }
            projectSource.projectModules.push(projectModule);
        }
    }

    return projectSource;
}
