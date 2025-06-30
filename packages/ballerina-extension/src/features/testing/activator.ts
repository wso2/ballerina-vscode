'use strict';
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

/**
 * Test explorer implemntation.
 */
import {
  Position, Range,
  TestController, TestItem, TestItemCollection, TestRunProfileKind, tests, TextDocument, Uri, workspace
} from 'vscode';
import { BallerinaExtension, ExtendedLangClient, } from "../../core";
import path from 'path';
import { runHandler } from './runner';
import { startWatchingWorkspace } from './discover';
import { ExecutorPositionsResponse, ExecutorPosition, BallerinaProject } from '@wso2/ballerina-core';

enum EXEC_POSITION_TYPE {
  SOURCE = 'source',
  TEST = 'test'
}

export let testController: TestController;
export let projectRoot;
let langClient: ExtendedLangClient | undefined;
let currentProjectRoot;
const testFiles: string[] = [];

export async function activate(ballerinaExtInstance: BallerinaExtension) {
  testController = tests.createTestController('ballerina-tests', 'Ballerina Tests');
  ballerinaExtInstance.context?.subscriptions.push(testController);

  langClient = ballerinaExtInstance.langClient;

  // create test profiles to display.
  testController.createRunProfile('Run Tests', TestRunProfileKind.Run, runHandler, true);
  testController.createRunProfile('Debug Tests', TestRunProfileKind.Debug, runHandler, true);

  // update test tree when file open.
  workspace.onDidOpenTextDocument(e => {
    if (!langClient || currentProjectRoot) {
      return;
    }
    // search for all the test.
    startWatchingWorkspace(testController);
  });

  // update test tree when file updated.
  workspace.onDidChangeTextDocument(async e => updateTestTree(e.document));
  workspace.onDidOpenTextDocument(async document => updateTestTree(document));

  // update test tree when file deleted.
  workspace.onDidDeleteFiles(e => {
    e.files.forEach(file => {
      deleteFileNode(testController.items, file);
    });
  });

  if (!langClient) {
    return;
  }

  // search for all the tests.
  startWatchingWorkspace(testController);

}

/**
 * Update test tree.
 * @param document text docuemnt
 */
async function updateTestTree(document: TextDocument) {
  if (!langClient || document.uri.scheme !== 'file' || !document.uri.path.endsWith('.bal')) {
    return;
  }
  await setCurrentProjectRoot(document.uri);
  // if project changed
  if (currentProjectRoot !== projectRoot) {
    startWatchingWorkspace(testController);

  } else {
    await createTests(document.uri);

  }
}

/** 
 * Find and create tests.
 * @param controller Test Controller.
 * @param uri File uri to find tests.
 * @param ballerinaExtInstance Balleina extension instace.
 */
export async function createTests(uri: Uri) {
  if (!langClient || !testController) {
    return;
  }

  if (!projectRoot) {
    // create tests for current project
    await setCurrentProjectRoot(uri);
  }

  if (!uri.fsPath.startsWith(projectRoot)) {
    return;
  }

  if (currentProjectRoot && currentProjectRoot !== projectRoot) {
    testController.items.forEach(item => {
      testController.items.delete(item.id);
    });
  }
  currentProjectRoot = projectRoot;

  // Get tests from LS.
  langClient!.getExecutorPositions({
    documentIdentifier: {
      uri: uri.toString()
    }
  }).then(async execResponse => {
    const response = execResponse as ExecutorPositionsResponse;
    if (!response.executorPositions) {
      return;
    }

    let positions: ExecutorPosition[] = [];
    response.executorPositions.forEach(position => {
      if (position.kind === EXEC_POSITION_TYPE.TEST) {
        positions.push(position);
      }
    });

    let relativePath = path.relative(projectRoot!, uri.fsPath).toString().split(path.sep);

    let level = relativePath[0];
    let testRoot = path.join(projectRoot!, level).toString();
    let depth = 0;

    if (positions.length === 0) {
      deleteFileNode(testController.items, uri);
      return;
    } else {
      testFiles.push(uri.toString());
    }

    const ancestors: TestItem[] = [];

    // if already added to the test explorer.
    let rootNode = testController.items.get(testRoot);
    if (rootNode) {
      let parentNode: TestItem = rootNode;
      let pathToFind = uri.fsPath;
      while (pathToFind != '') {
        parentNode = getTestItemNode(rootNode, pathToFind);
        if (parentNode.id == pathToFind) {
          relativePath = path.relative(pathToFind, uri.fsPath).split(path.sep);
          break;
        }
        const lastIndex = pathToFind.lastIndexOf(path.sep);
        pathToFind = pathToFind.slice(0, lastIndex);
      }

      if (parentNode && parentNode.id === uri.fsPath) {
        let testCaseItems: TestItem[] = [];

        positions.forEach(position => {
          const tcase = createTestCase(testController, position);
          testCaseItems.push(tcase);
        });
        parentNode.children.replace(testCaseItems);

        return;
      } else {
        rootNode = parentNode;
        ancestors.push(rootNode);
        depth = 0;
      }
    } else {
      rootNode = createTestItem(testController, testRoot, testRoot, level);
      testController.items.add(rootNode);
      ancestors.push(rootNode);
      depth = 1;
    }

    for (depth; depth < relativePath.length; depth++) {
      const parent = ancestors.pop()!;
      const level = relativePath[depth];
      testRoot = path.join(testRoot, level).toString();
      const middleNode = createTestItem(testController, testRoot, testRoot, level);
      middleNode.canResolveChildren = true;
      parent.children.add(middleNode);
      ancestors.push(middleNode);
    }

    const parent = ancestors.pop()!;
    let testCaseItems: TestItem[] = [];
    positions.forEach(position => {
      const tcase = createTestCase(testController, position);
      testCaseItems.push(tcase);
    });
    parent.children.replace(testCaseItems);

    rootNode.canResolveChildren = true;
  }, _error => {
  });
}

async function setCurrentProjectRoot(uri: Uri) {
  projectRoot = (await langClient!.getBallerinaProject({
    documentIdentifier: {
      uri: uri.toString()
    }
  }) as BallerinaProject).path;
}

/**
 * Create test item for file. 
 */
function createTestCase(controller: TestController, position: ExecutorPosition) {
  const tcase = createTestItem(controller, `${position.filePath}/${position.name}`, position.filePath, position.name);
  tcase.canResolveChildren = false;
  tcase.range = new Range(new Position(position.range.startLine.line, position.range.startLine.offset),
    new Position(position.range.endLine.line, position.range.endLine.offset));
  return tcase;
}

/**
 * Create test tree item. 
 */
function createTestItem(controller: TestController, id: string, path: string, label: string): TestItem {
  const uri = Uri.file(path);
  const item = controller.createTestItem(id, label, uri);
  item.canResolveChildren = true;
  return item;
}

/**
 * Get parent node of a test item. This may return invalid parent node 
 * if the parent is not found. Always check the parent id with the returned
 * parent's id to validate.
 */
function getTestItemNode(testNode: TestItem, id: string):
  TestItem {
  if (testNode.canResolveChildren && testNode.id === id) {
    return testNode;
  }

  testNode.children.forEach((c) => {
    if (testNode.canResolveChildren) {
      testNode = getTestItemNode(c, id);
    }
  });
  return testNode;
}

/**
 * Delete file from test tree.
 * 
 * @param items Test items
 * @param uri file uri
 */
function deleteFileNode(items: TestItemCollection, uri: Uri) {
  // check the file in test files list
  let found = false;
  for (let i = 0; i < testFiles.length; i++) {
    if (testFiles[i] === uri.toString()) {
      delete testFiles[i];
      found = true;
      break;
    }
  }
  if (!found) { return; }

  let relativePath = path.relative(projectRoot!, uri.fsPath).toString().split(path.sep);
  let id = `${projectRoot}`;

  // iterate through the test tree and delete.
  for (let i = 0; i < relativePath.length; i++) {
    const path = relativePath[i];
    id = `${id}/${path}`;

    if (i === relativePath.length - 1) {
      items.delete(id);
    } else {
      items = items.get(id)?.children!;
    }
  }
}
