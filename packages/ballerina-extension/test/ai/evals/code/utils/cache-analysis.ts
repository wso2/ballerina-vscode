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

/**
 * Utility functions for mapping provider usage data to our normalized structure
 * and analyzing cache performance patterns
 */

import { TokenUsageRecord, AggregatedCacheUsageSummary } from '../types';

/**
 * Validates cache usage patterns for a test case
 */
export function validateCacheUsage(
    initial: TokenUsageRecord,
    repairs: TokenUsageRecord[]
): {
    initialGenerationCheck: "pass" | "warning";
    firstRepairCheck: "pass" | "fail" | "not_applicable";
    subsequentRepairsCheck: "pass" | "warning" | "not_applicable";
    issues: string[];
} {
    const issues: string[] = [];

    // Individual use case validation for initial generation
    // If initial generation has cache creation → warning, if cache read → pass
    const initialGenerationCheck = initial.cacheCreationInputTokens > 0 ? "warning" : "pass";
    if (initialGenerationCheck === "warning") {
        issues.push("Initial generation created fresh cache instead of reusing existing cache");
    }

    // Validate repair patterns (existing logic)
    let firstRepairCheck: "pass" | "fail" | "not_applicable" = "not_applicable";
    let subsequentRepairsCheck: "pass" | "warning" | "not_applicable" = "not_applicable";

    if (repairs.length > 0) {
        // First repair validation: cache creation is allowed (mixed strategy)
        const firstRepair = repairs[0];
        firstRepairCheck = firstRepair.cacheReadInputTokens > 0 ? "pass" : "fail"; // First repair must have cache reads
        if (firstRepairCheck === "fail") {
            issues.push("First repair iteration has no cache reads (cache read is mandatory)");
        }

        // Subsequent repairs validation: should be cache-only (no creation)
        if (repairs.length > 1) {
            const subsequentRepairs = repairs.slice(1);
            const hasCreationRepairs = subsequentRepairs.filter(repair => repair.cacheCreationInputTokens > 0);

            if (hasCreationRepairs.length > 0) {
                subsequentRepairsCheck = "warning";
                issues.push(`${hasCreationRepairs.length} subsequent repair(s) have cache creation (should be cache-only)`);
            } else {
                subsequentRepairsCheck = "pass";
            }
        }
    }

    return {
        initialGenerationCheck,
        firstRepairCheck,
        subsequentRepairsCheck,
        issues
    };
}



/**
 * Creates aggregated cache usage summary across multiple test results
 */
export function createAggregatedCacheUsageSummary(testResults: any[]): AggregatedCacheUsageSummary {
    const totalUseCases = testResults.length;

    // Track initial generation cache stats
    let initialHits = 0;
    let initialCreations = 0;

    // Track repair stats by iteration
    const repairStats: { [iteration: number]: { hits: number; creation: number } } = {};

    testResults.forEach(result => {
        if (result.usageMetrics?.usage) {
            const usage = result.usageMetrics.usage;

            // Count initial generation cache usage (no cachePerformance object, use raw data)
            if (usage.initial) {
                if (usage.initial.cacheReadInputTokens > 0) {
                    initialHits++;
                }
                if (usage.initial.cacheCreationInputTokens > 0) {
                    initialCreations++;
                }
            }

            // Count repair cache usage by iteration (no cachePerformance object, use raw data)
            usage.repairs?.forEach((repair: any) => {
                const iteration = repair.iteration;
                if (!repairStats[iteration]) {
                    repairStats[iteration] = { hits: 0, creation: 0 };
                }

                if (repair.cacheReadInputTokens > 0) {
                    repairStats[iteration].hits++;
                }
                if (repair.cacheCreationInputTokens > 0) {
                    repairStats[iteration].creation++;
                }
            });
        }
    });

    // Build the repairs object with dynamic repair keys
    const repairs: { [repairIteration: string]: { hits: number; creation: number } } = {};
    Object.keys(repairStats).forEach(iteration => {
        const repairKey = `repair${iteration}`;
        repairs[repairKey] = repairStats[parseInt(iteration)];
    });

    return {
        totalUseCases,
        initialGeneration: {
            hits: initialHits,
            creation: initialCreations
        },
        repairs
    };
}
