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

export const extractUserErrorDetails = (text: string | null) => {
  if (typeof text !== "string") return null;

  const results = [];

  // Match body="...json..."
  const bodyRegex = /body="(\{[\s\S]*?\})"/g;
  let match;

  while ((match = bodyRegex.exec(text)) !== null) {
    try {
      // Unescape embedded quotes
      const jsonText = match[1].replace(/\\"/g, '"');
      const parsed = JSON.parse(jsonText);

      results.push({
        error_message: parsed.error_message,
        code: parsed.code,
        error_description: parsed.error_description,
        raw: parsed
      });
    } catch {
      // Ignore malformed bodies
    }
  }

  return results.length ? results : null;
}
