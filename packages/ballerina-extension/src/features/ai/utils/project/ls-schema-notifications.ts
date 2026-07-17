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

import * as fs from 'fs';
import * as path from 'path';
import { Uri } from 'vscode';
import { StateMachine } from "../../../../stateMachine";
import { ProjectSource, PROJECT_KIND } from "@wso2/ballerina-core";

/**
 * Seeds the ai:// frozen-baseline scheme with a pristine (pre-edit) file's current content.
 * Called once per package at generation start (via each package's Ballerina.toml), before
 * any edits. file:// needs no equivalent call: tempProjectPath is now the real workspace
 * path, and file:// is the extension's own always-live LS scheme for it — already loaded
 * from normal extension operation (diagrams etc.), and kept in sync automatically by VS
 * Code's language client for any real workspace.applyEdit going forward.
 * @param tempProjectPath The root path of the project (the real workspace/project root)
 * @param filePath The relative file path
 */
function seedAiBaseline(tempProjectPath: string, filePath: string): void {
  try {
    const fileFullPath = path.join(tempProjectPath, filePath);
    if (!fs.existsSync(fileFullPath)) {
      console.warn(`[AgentNotification] File does not exist, skipping ai:// seed: ${fileFullPath}`);
      return;
    }

    const fileContent = fs.readFileSync(fileFullPath, 'utf-8');
    const languageId = filePath.endsWith('.bal') ? 'ballerina' : 'toml';
    const aiUri = 'ai' + Uri.file(fileFullPath).toString().substring(4); // Replace 'file' prefix with 'ai'

    try {
      StateMachine.langClient().didOpen({
        textDocument: {
          uri: aiUri,
          languageId,
          version: 1,
          text: fileContent
        }
      });
      console.log(`[AgentNotification] Seeded ai:// baseline for: ${filePath}`);
    } catch (error) {
      console.error(`[AgentNotification] Failed to seed ai:// baseline for ${filePath}:`, error);
    }
  } catch (error) {
    console.error(`[AgentNotification] Failed to seed ai:// baseline for ${filePath}:`, error);
  }
}

/**
 * Seeds the ai:// frozen baseline for a newly created file with empty content, since the
 * file didn't exist before this generation — getSemanticDiff then reports it as added.
 * No file:// call needed: workspace.applyEdit's createFile() triggers VS Code's own didOpen
 * for the real file automatically.
 * @param tempProjectPath The root path of the project (the real workspace/project root)
 * @param filePath The relative file path
 */
export function sendNewFileDidOpen(tempProjectPath: string, filePath: string): void {
  if (!filePath.endsWith('.bal') && !filePath.endsWith('Ballerina.toml')) {
    return;
  }

  try {
    const fileFullPath = path.join(tempProjectPath, filePath);
    const languageId = filePath.endsWith('.bal') ? 'ballerina' : 'toml';
    const aiUri = 'ai' + Uri.file(fileFullPath).toString().substring(4); // Replace 'file' prefix with 'ai'

    StateMachine.langClient().didOpen({
      textDocument: {
        uri: aiUri,
        languageId,
        version: 1,
        text: ''
      }
    });
    console.log(`[AgentNotification] Seeded ai:// baseline (empty — new file) for: ${filePath}`);
  } catch (error) {
    console.error(`[AgentNotification] Failed to seed ai:// baseline for ${filePath}:`, error);
  }
}

/**
 * Seeds the ai:// baseline for every package in the project at generation start, via each
 * package's Ballerina.toml (one seedAiBaseline call per package is enough to trigger a full
 * pristine-package scan cached under ai://).
 * @param tempProjectPath The root path of the project (the real workspace/project root)
 * @param projects Array of project sources containing source files, modules, and tests
 */
export function sendAgentDidOpenForFreshProjects(tempProjectPath: string, projects: ProjectSource[]): void {
  const allFiles: string[] = [];

  // For workspace projects, open the workspace root Ballerina.toml first so the LSP
  // can resolve cross-package dependencies when checking diagnostics per-package.
  const isWorkspace = StateMachine.context().projectInfo?.projectKind === PROJECT_KIND.WORKSPACE_PROJECT;
  if (isWorkspace) {
    const workspaceTomlPath = path.join(tempProjectPath, 'Ballerina.toml');
    if (fs.existsSync(workspaceTomlPath)) {
      allFiles.push('Ballerina.toml');
    }
  }

  projects.forEach(project => {
    const pkgPath = project.packagePath || ""; // Empty for single package, relative path for workspace

    // Add root-level source files
    project.sourceFiles.forEach(f => {
      const relativePath = pkgPath ? path.join(pkgPath, f.filePath) : f.filePath;
      allFiles.push(relativePath);
    });

    // Add module files
    project.projectModules?.forEach(module => {
      module.sourceFiles.forEach(f => {
        const relativePath = pkgPath
          ? path.join(pkgPath, 'modules', module.moduleName, f.filePath)
          : path.join('modules', module.moduleName, f.filePath);
        allFiles.push(relativePath);
      });
    });

    // Add test files
    if (project.projectTests) {
      project.projectTests.forEach(f => {
        const relativePath = pkgPath
          ? path.join(pkgPath, 'tests', f.filePath)
          : path.join('tests', f.filePath);
        allFiles.push(relativePath);
      });
    }
  });

  const tomlFiles = allFiles.filter(f => f.endsWith('Ballerina.toml'));
  console.log(`[AgentNotification] Sending didOpen for ${tomlFiles.length} Ballerina.toml(s) across ${projects.length} project(s)`);
  tomlFiles.forEach(file => seedAiBaseline(tempProjectPath, file));
}

/**
 * Sends didClose notifications for a file to both file:// and ai:// schemas
 * Used for cleanup when temp project is deleted or replaced
 * @param tempProjectPath The root path of the temporary project
 * @param filePath The relative file path
 */
function sendBothSchemaDidClose(tempProjectPath: string, filePath: string): void {
  try {
    const fullPath = path.join(tempProjectPath, filePath);

    const fileUri = Uri.file(fullPath).toString();
    try {
      StateMachine.langClient().didClose({
        textDocument: {
          uri: fileUri
        }
      });
    } catch (error) {
      console.error(`[AgentNotification] Failed didClose (file schema) for ${filePath}:`, error);
    }

    const aiUri = 'ai' + fileUri.substring(4);
    try {
      StateMachine.langClient().didClose({
        textDocument: {
          uri: aiUri
        }
      });
    } catch (error) {
      console.error(`[AgentNotification] Failed didClose (ai schema) for ${filePath}:`, error);
    }
  } catch (error) {
    console.error(`[AgentNotification] Failed to send didClose for ${filePath}:`, error);
  }
}

/**
 * Sends didClose notifications for multiple files in batch
 * Used when cleaning up entire temp project
 * @param tempProjectPath The root path of the temporary project
 * @param files Array of relative file paths to close
 */
export function sendAgentDidCloseBatch(tempProjectPath: string, files: string[]): void {
  files.forEach(file => sendBothSchemaDidClose(tempProjectPath, file));
}

/**
 * Re-opens a pending review's modified files in the Language Server after it has
 * restarted (e.g. a VS Code window reload): the in-memory file:// (original
 * baseline) and ai:// (modified) documents are gone, while the temp project on
 * disk holds the modified content and its review baseline holds the originals.
 * Older payloads can fall back to a generation checkpoint. Restores both schemas
 * so semantic diff and flow-model lookups work.
 * @param tempProjectPath The root path of the temporary project
 * @param modifiedFiles Relative paths of the generation's modified files
 * @param baselineProjectPath Frozen pre-generation Ballerina sources. Its presence explicitly
 * distinguishes added files (modified only), deleted files (baseline only), and modifications.
 * @param fallbackOriginalContents Checkpoint snapshot for payloads written before baselines existed
 */
export function sendReviewRestoreDidOpenBatch(
  tempProjectPath: string,
  modifiedFiles: string[],
  baselineProjectPath: string | undefined,
  fallbackOriginalContents?: Record<string, string>
): void {
  const normalizedTempRoot = path.resolve(tempProjectPath);
  const baselineAvailable = !!baselineProjectPath && fs.existsSync(baselineProjectPath);

  for (const filePath of modifiedFiles) {
    if (!filePath.endsWith('.bal') && !filePath.endsWith('Ballerina.toml')) {
      continue;
    }

    try {
      const tempFileFullPath = path.resolve(tempProjectPath, filePath);
      if (tempFileFullPath !== normalizedTempRoot && !tempFileFullPath.startsWith(normalizedTempRoot + path.sep)) {
        console.warn(`[AgentNotification] Review restore path escapes temp project, skipping: ${filePath}`);
        continue;
      }

      const snapshotKey = filePath.split(path.sep).join('/');
      const tempFileExists = fs.existsSync(tempFileFullPath);
      const baselineFileFullPath = baselineProjectPath ? path.resolve(baselineProjectPath, filePath) : undefined;
      const baselineFileExists = !!baselineFileFullPath && baselineAvailable && fs.existsSync(baselineFileFullPath);
      const hasFallbackOriginal = Object.prototype.hasOwnProperty.call(fallbackOriginalContents ?? {}, snapshotKey);

      let originalContent: string;
      if (baselineFileExists) {
        originalContent = fs.readFileSync(baselineFileFullPath!, 'utf-8');
      } else if (hasFallbackOriginal) {
        originalContent = fallbackOriginalContents![snapshotKey];
      } else if (baselineAvailable) {
        // The baseline is authoritative: absence means the generation created this file.
        originalContent = '';
      } else {
        console.warn(`[AgentNotification] Original content unavailable, skipping review restore: ${filePath}`);
        continue;
      }

      if (!tempFileExists && !baselineFileExists && !hasFallbackOriginal) {
        console.warn(`[AgentNotification] File is absent from both review versions, skipping: ${filePath}`);
        continue;
      }

      // Empty modified content explicitly represents a whole-file deletion.
      const modifiedContent = tempFileExists ? fs.readFileSync(tempFileFullPath, 'utf-8') : '';
      const languageId = filePath.endsWith('.bal') ? 'ballerina' : 'toml';
      const tempFileUri = Uri.file(tempFileFullPath).toString();
      const aiUri = 'ai' + tempFileUri.substring(4); // Replace 'file' prefix with 'ai'

      StateMachine.langClient().didOpen({
        textDocument: { uri: tempFileUri, languageId, version: 1, text: originalContent }
      });
      StateMachine.langClient().didOpen({
        textDocument: { uri: aiUri, languageId, version: 1, text: modifiedContent }
      });
      console.log(`[AgentNotification] Restored review schemas for: ${filePath}`);
    } catch (error) {
      console.error(`[AgentNotification] Failed to restore review schemas for ${filePath}:`, error);
    }
  }
}
