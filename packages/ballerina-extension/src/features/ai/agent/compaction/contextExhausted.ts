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

import { StopCondition } from 'ai';
import { CompactionGuard } from './CompactionGuard';

/**
 * Creates a StopCondition that gracefully stops generation when mid-stream
 * compaction has permanently failed and the context cannot be reduced further.
 *
 * This prevents a context overflow API error from crashing the stream.
 * Instead, the agent stops cleanly after completing the current step,
 * and the user sees the partial result.
 *
 * Usage:
 * ```typescript
 * stopWhen: [stepCountIs(50), contextExhausted(compactionGuard)]
 * ```
 * The array form stops when ANY condition returns true.
 */
export function contextExhausted(guard: CompactionGuard): StopCondition<any> {
    return ({ steps }) => {
        if (!guard.lastCompactionFailed) {
            return false; // Compaction is healthy, don't stop
        }

        console.warn(
            '[contextExhausted] Stopping generation: mid-stream compaction failed and context is near limit. ' +
            `Completed ${steps.length} steps before stopping.`
        );
        return true;
    };
}
