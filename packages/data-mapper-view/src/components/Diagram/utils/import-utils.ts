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

export function getReferencedName(importStatement: string): string {
    // Remove the 'import' keyword and semicolon
    const cleanImport = importStatement.replace('import ', '').replace(';', '');
    
    // Check if the import has an alias (contains 'as')
    if (cleanImport.includes(' as ')) {
        // Split by 'as' and return the alias (trimmed)
        return cleanImport.split(' as ')[1].trim();
    }
    
    // For imports without alias, get the last part of the path
    const parts = cleanImport.split('/');
    const lastPart = parts[parts.length - 1];
    
    // Return the last part of the path
    const dotParts = lastPart.split('.');
    return dotParts[dotParts.length - 1];
}

export function createImportReferenceMap(importStatements: string[]): Record<string, string> {
    const referenceMap: Record<string, string> = {};
    
    for (const importStatement of importStatements) {
        const referencedName = getReferencedName(importStatement);
        referenceMap[importStatement] = referencedName;
    }
    
    return referenceMap;
}
