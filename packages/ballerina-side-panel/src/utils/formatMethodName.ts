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
* Converts a camelCase or snake_case method name into a user-friendly display format.
*
* @param methodName - The raw method name (e.g., "basicAck", "'commit", "onMessage")
* @returns A formatted, human-readable name (e.g., "Basic Ack", "Commit", "On Message")
*
* @example
* formatMethodName("basicAck") // Returns "Basic Ack"
* formatMethodName("'commit") // Returns "Commit"
* formatMethodName("onMessage") // Returns "On Message"
* formatMethodName("HTTPRequest") // Returns "HTTP Request"
* formatMethodName("method2Call") // Returns "Method 2 Call"
*/
export function formatMethodName(methodName: string): string {
    // Handle null, undefined, or empty strings
    if (!methodName || typeof methodName !== "string") {
        return "";
    }

    // Remove leading special characters like apostrophes, underscores, etc.
    let cleaned = methodName.trim().replace(/^[^\w]/g, "");

    // Handle edge case where all characters were special
    if (!cleaned) {
        return methodName;
    }

    // Convert camelCase and snake_case to space-separated words
    // This regex:
    // 1. Inserts space before uppercase letters that follow lowercase letters (camelCase)
    // 2. Inserts space before uppercase letters that are followed by lowercase (e.g., "HTTPRequest" -> "HTTP Request")
    // 3. Handles underscores by replacing them with spaces
    let formatted = cleaned
        .replace(/([a-z])([A-Z])/g, "$1 $2") // Insert space before uppercase after lowercase
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // Insert space before last uppercase in sequence
        .replace(/_/g, " ") // Replace underscores with spaces
        .replace(/\s+/g, " ") // Normalize multiple spaces to single space
        .trim();

    // Capitalize first letter of each word
    const words = formatted.split(" ");
    const capitalized = words
        .map((word) => {
            if (!word) return "";
            // Keep existing capitalization for acronyms (all caps) but capitalize first letter otherwise
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .filter((word) => word.length > 0) // Remove empty strings from split
        .join(" ");

    return capitalized;
}
