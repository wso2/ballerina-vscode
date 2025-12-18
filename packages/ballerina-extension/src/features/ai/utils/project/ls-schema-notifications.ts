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
import { ProjectSource } from "@wso2/ballerina-core";

/**
 * Sends didOpen notifications for a file to both file:// and ai:// schemas
 * Used for initial temp project files and newly created files during agent operations
 * @param tempProjectPath The root path of the temporary project
 * @param filePath The relative file path
 */
export function sendAgentDidOpen(tempProjectPath: string, projectPath: string, filePath: string): void {
  try {
    const tempFileFullPath = path.join(tempProjectPath, filePath);
    if (!fs.existsSync(tempFileFullPath)) {
      console.warn(`[AgentNotification] File does not exist, skipping didOpen: ${tempFileFullPath}`);
      return;
    }

    const fileContent = fs.readFileSync(tempFileFullPath, 'utf-8');

    const projectFileFullPath = path.join(projectPath, filePath);
    if (!fs.existsSync(projectFileFullPath)) {
      console.warn(`[AgentNotification] File does not exist, skipping didOpen: ${projectFileFullPath}`);
      return;
    }

    // 1. Send didOpen with 'file' schema
    const tempFileUri = Uri.file(tempFileFullPath).toString();
    try {
      StateMachine.langClient().didOpen({
        textDocument: {
          uri: tempFileUri,
          languageId: 'ballerina',
          version: 1,
          text: fileContent
        }
      });
      console.log(`[AgentNotification] Sent didOpen (file schema) for: ${filePath}`);
    } catch (error) {
      console.error(`[AgentNotification] Failed didOpen (file schema) for ${filePath}:`, error);
    }

    // 2. Send didOpen with 'ai' schema
    const projectFileUri = Uri.file(projectFileFullPath).toString();
    const aiUri = 'ai' + projectFileUri.substring(4); // Remove 'file' prefix (4 chars)
    try {
      StateMachine.langClient().didOpen({
        textDocument: {
          uri: aiUri,
          languageId: 'ballerina',
          version: 1,
          text: fileContent
        }
      });
      console.log(`[AgentNotification] Sent didOpen (ai schema) for: ${filePath}`);
    } catch (error) {
      console.error(`[AgentNotification] Failed didOpen (ai schema) for ${filePath}:`, error);
    }
  } catch (error) {
    console.error(`[AgentNotification] Failed to send didOpen for ${filePath}:`, error);
  }
}

/**
 * Sends didChange notifications for a modified file to both file:// and ai:// schemas
 * Used when agent modifies existing files during code generation
 * @param tempProjectPath The root path of the temporary project
 * @param filePath The relative file path that was modified
 */
export function sendAgentDidChange(tempProjectPath: string, projectPath: string, filePath: string): void {
  try {
    const tempFileFullPath = path.join(tempProjectPath, filePath);
    if (!fs.existsSync(tempFileFullPath)) {
      console.warn(`[AgentNotification] File does not exist, skipping didChange: ${tempFileFullPath}`);
      return;
    }

    const fileContent = fs.readFileSync(tempFileFullPath, 'utf-8');

    const projectFileFullPath = path.join(projectPath, filePath);
    if (!fs.existsSync(projectFileFullPath)) {
      console.warn(`[AgentNotification] File does not exist, skipping didChange: ${projectFileFullPath}`);
      return;
    }

    // 1. Send didChange with 'file' schema
    const tempFileUri = Uri.file(tempFileFullPath).toString();
    try {
      StateMachine.langClient().didChange({
        textDocument: {
          uri: tempFileUri,
          version: 1
        },
        contentChanges: [{
          text: fileContent
        }]
      });
      console.log(`[AgentNotification] Sent didChange (file schema) for: ${filePath}`);
    } catch (error) {
      console.error(`[AgentNotification] Failed didChange (file schema) for ${filePath}:`, error);
    }

    // 2. Send didChange with 'ai' schema
    const projectFileUri = Uri.file(projectFileFullPath).toString();
    const aiUri = 'ai' + projectFileUri.substring(4); // Remove 'file' prefix (4 chars)
    try {
      StateMachine.langClient().didChange({
        textDocument: {
          uri: aiUri,
          version: 1
        },
        contentChanges: [{
          text: fileContent
        }]
      });
      console.log(`[AgentNotification] Sent didChange (ai schema) for: ${filePath}`);
    } catch (error) {
      console.error(`[AgentNotification] Failed didChange (ai schema) for ${filePath}:`, error);
    }

  } catch (error) {
    console.error(`[AgentNotification] Failed to send didChange for ${filePath}:`, error);
  }
}

/**
 * Sends didOpen notifications for all initial project files when temp directory is created
 * Notifies both file:// and ai:// schemas for each file
 * @param tempProjectPath The root path of the temporary project
 * @param files Array of relative file paths to notify
 */
export function sendAgentDidOpenBatch(tempProjectPath: string, projectPath: string, files: string[]): void {
  files.forEach(file => sendAgentDidOpen(tempProjectPath, projectPath, file));
}

/**
 * Sends didOpen notifications for all initial project files from project sources
 * Includes source files, module files, and test files
 * @param tempProjectPath The root path of the temporary project
 * @param projects Array of project sources containing source files, modules, and tests
 */
export function sendAgentDidOpenForProjects(tempProjectPath: string, projectPath: string, projects: ProjectSource[]): void {
  const allFiles: string[] = [];
  projects.forEach(project => {
    allFiles.push(...project.sourceFiles.map(f => f.filePath));
    project.projectModules?.forEach(module => {
      allFiles.push(...module.sourceFiles.map(f => f.filePath));
    });
    if (project.projectTests) {
      allFiles.push(...project.projectTests.map(f => f.filePath));
    }
  });
  sendAgentDidOpenBatch(tempProjectPath, projectPath, allFiles);
}

/**
 * Sends didClose notifications for a file to both file:// and ai:// schemas
 * Used for cleanup when temp project is deleted or replaced
 * @param tempProjectPath The root path of the temporary project
 * @param filePath The relative file path
 */
export function sendAgentDidClose(tempProjectPath: string, filePath: string): void {
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
  files.forEach(file => sendAgentDidClose(tempProjectPath, file));
}

/**
 * Sends didClose notifications for all project files from project sources
 * Includes source files, module files, and test files
 * @param tempProjectPath The root path of the temporary project
 * @param projects Array of project sources containing source files, modules, and tests
 */
export function sendAgentDidCloseForProjects(tempProjectPath: string, projects: ProjectSource[]): void {
  const allFiles: string[] = [];
  projects.forEach(project => {
    allFiles.push(...project.sourceFiles.map(f => f.filePath));
    project.projectModules?.forEach(module => {
      allFiles.push(...module.sourceFiles.map(f => f.filePath));
    });
    if (project.projectTests) {
      allFiles.push(...project.projectTests.map(f => f.filePath));
    }
  });
  sendAgentDidCloseBatch(tempProjectPath, allFiles);
}
