/*
 *  Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com)
 *
 *  WSO2 LLC. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

package io.ballerina.flowmodelgenerator.core.search;

import java.util.Locale;

/**
 * Utility class for fuzzy matching and ranking of search results. Provides algorithms for calculating relevance scores
 * based on multiple matching strategies.
 *
 * @since 1.2.2
 */
public class RelevanceCalculator {

    // Scoring weights - higher values indicate higher priority
    private static final int EXACT_MATCH_SCORE = 10000;
    private static final int PREFIX_MATCH_SCORE = 5000;
    private static final int SUBSTRING_MATCH_BASE = 1000;
    private static final int FUZZY_MATCH_MAX = 500;
    private static final int ABBREVIATION_BONUS = 300;
    private static final int DESCRIPTION_MATCH_BONUS = 200;
    private static final int DESCRIPTION_PREFIX_BONUS = 100;

    // Cache for thread-local reusable arrays to avoid repeated allocations
    private static final ThreadLocal<int[]> DISTANCE_ROW_CACHE = ThreadLocal.withInitial(() -> new int[256]);

    /**
     * Calculates a fuzzy match relevance score for a type based on its name and description. Higher scores indicate
     * better matches. The algorithm combines multiple matching strategies:
     * 1. Exact matching (highest priority)
     * 2. Prefix matching (high priority)
     * 3. Substring matching (medium priority)
     * 4. Fuzzy matching using Levenshtein distance (lower priority)
     * 5. Description matching (bonus points)
     *
     * @param typeName    The name of the type to score
     * @param description The description of the type (can be null or empty)
     * @param query       The search query to match against
     * @return A relevance score (0 = no match, higher = better match)
     */
    public static int calculateFuzzyRelevanceScore(String typeName, String description, String query) {
        if (query == null || query.isEmpty()) {
            return 1;  // No query means everything matches with minimal score
        }

        // Cache lowercase conversions
        String lowerTypeName = typeName.toLowerCase(Locale.ROOT);
        String lowerQuery = query.toLowerCase(Locale.ROOT);

        int score = 0;

        // --- TYPE NAME MATCHING (Weighted Higher) ---

        // 1. Exact match (highest priority) - fastest check first
        if (lowerTypeName.equals(lowerQuery)) {
            return EXACT_MATCH_SCORE; // Early return for exact match
        }

        // 2. Starts with query (prefix match - high priority)
        if (lowerTypeName.startsWith(lowerQuery)) {
            score += PREFIX_MATCH_SCORE;
        } else {
            // 3. Contains query (substring match - medium priority)
            int nameIndex = lowerTypeName.indexOf(lowerQuery);
            if (nameIndex > 0) { // nameIndex > 0 (not at start, already checked above)
                // Earlier matches score higher
                score += Math.max(1, SUBSTRING_MATCH_BASE - nameIndex);
            } else if (nameIndex < 0) { // No substring match found
                // 4. Fuzzy matching using Levenshtein distance
                int typeNameLen = lowerTypeName.length();
                int queryLen = lowerQuery.length();
                int maxLen = Math.max(typeNameLen, queryLen);
                int threshold = maxLen / 2;

                // Early check: if length difference is too large, skip expensive calculation
                if (Math.abs(typeNameLen - queryLen) <= threshold) {
                    int distance = levenshteinDistanceOptimized(lowerTypeName, lowerQuery, threshold);

                    // Only consider fuzzy matches if distance is reasonable
                    if (distance >= 0 && distance <= threshold) {
                        // Score range: 500 to 1 (higher similarity = higher score)
                        int fuzzyScore = FUZZY_MATCH_MAX * (maxLen - distance) / maxLen;
                        score += fuzzyScore;
                    }
                }

                // Also check if query is an abbreviation (matches first letters)
                if (matchesAbbreviation(lowerTypeName, lowerQuery)) {
                    score += ABBREVIATION_BONUS;
                }
            } else {
                // nameIndex == 0, but startsWith already returned true above
                // This means substring match at position 0 (prefix)
                score += SUBSTRING_MATCH_BASE;
            }
        }

        // --- DESCRIPTION MATCHING (Bonus Points - Lower Weight) ---
        // Only process description if we need additional scoring
        if (description != null && !description.isEmpty() && score < EXACT_MATCH_SCORE) {
            String lowerDescription = description.toLowerCase(Locale.ROOT);

            if (lowerDescription.startsWith(lowerQuery)) {
                // Extra bonus if description starts with query
                score += DESCRIPTION_MATCH_BONUS + DESCRIPTION_PREFIX_BONUS;
            } else if (lowerDescription.contains(lowerQuery)) {
                // Description match adds bonus points
                score += DESCRIPTION_MATCH_BONUS;
            }
        }

        return score;
    }

    /**
     * Calculates the Levenshtein distance between two strings with optimization. Uses only two arrays instead of a full
     * matrix and supports early termination.
     *
     * @param s1        First string
     * @param s2        Second string
     * @param threshold Maximum distance to consider (-1 if exceeded)
     * @return The edit distance between the two strings, or -1 if exceeds threshold
     */
    private static int levenshteinDistanceOptimized(String s1, String s2, int threshold) {
        int len1 = s1.length();
        int len2 = s2.length();

        // Ensure s1 is the shorter string for better performance
        if (len1 > len2) {
            String temp = s1;
            s1 = s2;
            s2 = temp;
            int tempLen = len1;
            len1 = len2;
            len2 = tempLen;
        }

        // Use two arrays instead of a matrix (space optimization)
        int[] previousRow = getOrCreateDistanceArray(len2 + 1);
        int[] currentRow = new int[len2 + 1];

        // Initialize first row
        for (int j = 0; j <= len2; j++) {
            previousRow[j] = j;
        }

        // Fill the rows
        for (int i = 1; i <= len1; i++) {
            currentRow[0] = i;
            int minDistance = i; // Track minimum distance in this row for early termination

            for (int j = 1; j <= len2; j++) {
                int cost = (s1.charAt(i - 1) == s2.charAt(j - 1)) ? 0 : 1;

                currentRow[j] = Math.min(
                        Math.min(
                                previousRow[j] + 1,      // deletion
                                currentRow[j - 1] + 1    // insertion
                        ),
                        previousRow[j - 1] + cost        // substitution
                );

                minDistance = Math.min(minDistance, currentRow[j]);
            }

            // Early termination: if minimum in current row exceeds threshold, no point continuing
            if (minDistance > threshold) {
                return -1;
            }

            // Swap arrays for next iteration
            int[] temp = previousRow;
            previousRow = currentRow;
            currentRow = temp;
        }

        return previousRow[len2];
    }

    /**
     * Gets or creates a reusable array for distance calculations. Uses ThreadLocal caching to avoid repeated
     * allocations.
     *
     * @param requiredSize The required array size
     * @return An int array of at least the required size
     */
    private static int[] getOrCreateDistanceArray(int requiredSize) {
        int[] cached = DISTANCE_ROW_CACHE.get();
        if (cached.length < requiredSize) {
            // Need larger array, create and cache it
            cached = new int[Math.max(requiredSize, cached.length * 2)];
            DISTANCE_ROW_CACHE.set(cached);
        }
        return cached;
    }

    /**
     * Checks if the query could be an abbreviation of the type name. Optimized version using char arrays for better
     * performance. For example, "HC" could match "HttpClient", "AC" could match "ApplicationConfig".
     *
     * @param typeName The type name to check against
     * @param query    The potential abbreviation
     * @return true if query matches the first letters of words in typeName
     */
    private static boolean matchesAbbreviation(String typeName, String query) {
        int typeLen = typeName.length();
        int queryLen = query.length();

        if (queryLen > typeLen || queryLen == 0) {
            return false;
        }

        int queryIndex = 0;
        char prevChar = '\0';

        for (int i = 0; i < typeLen && queryIndex < queryLen; i++) {
            char typeChar = typeName.charAt(i);
            boolean isCurrentUpper = Character.isUpperCase(typeChar);
            boolean isPrevLower = Character.isLowerCase(prevChar);

            // Check if this is the start of a new word
            // 1. First character of string
            // 2. Uppercase after lowercase (camelCase boundary)
            if ((i == 0 || (isCurrentUpper && isPrevLower)) &&
                    Character.toLowerCase(typeChar) == query.charAt(queryIndex)) {
                queryIndex++;
            }

            prevChar = typeChar;
        }

        return queryIndex == queryLen;
    }
}
