// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).

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

import { MigrationEnhancementMode } from "@wso2/ballerina-core";

/** globalState key – only one pending enhancement is allowed at a time */
export const PENDING_MIGRATION_ENHANCEMENT_KEY = "ballerina.pendingMigrationEnhancement";

/**
 * Shape of the value stored in VS Code globalState before the
 * `vscode.openFolder` reload so that the enhancement pipeline can
 * be resumed in the freshly opened window.
 */
export interface PendingMigrationEnhancement {
    mode: MigrationEnhancementMode;
    projectRoot: string;
    /** epoch ms – used to discard stale entries (>10 min) */
    timestamp: number;
}

/** Seconds before a stale pending-enhancement entry is discarded */
export const PENDING_ENHANCEMENT_TTL_MS = 10 * 60 * 1000; // 10 minutes
