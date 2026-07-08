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

import { extension } from '../../../BalExtensionContext';

/**
 * Everything needed to reopen the review diff view for a pending generation
 * after an extension host restart. The chat persistence schema
 * (@wso2/copilot-utilities) deliberately drops tempProjectPath and
 * affectedPackagePaths as runtime-only, so this payload is kept separately in
 * the workspace Memento, written when a review starts and read by
 * ApprovalViewManager.rebuildReviewDataFromStorage().
 */
export interface ReviewRestoreData {
    generationId: string;
    tempProjectPath: string;
    modifiedFiles: string[];
    affectedPackagePaths: string[];
    semanticDiffs: object[];
    loadDesignDiagrams: boolean;
    isWorkspace: boolean;
}

const REVIEW_RESTORE_KEY = 'ballerina.copilot.pendingReviewRestore';

export function savePendingReviewRestore(data: ReviewRestoreData): void {
    extension.context.workspaceState.update(REVIEW_RESTORE_KEY, data);
}

export function getPendingReviewRestore(): ReviewRestoreData | undefined {
    return extension.context.workspaceState.get<ReviewRestoreData>(REVIEW_RESTORE_KEY);
}

export function clearPendingReviewRestore(): void {
    extension.context.workspaceState.update(REVIEW_RESTORE_KEY, undefined);
}
