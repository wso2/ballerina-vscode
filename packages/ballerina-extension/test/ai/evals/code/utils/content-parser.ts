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

import { SourceFile } from '../types';
import { FILES } from './constants';

/**
 * Extracts source files from generated content using regex matching
 */
export function extractSourceFilesFromContent(content: string): readonly SourceFile[] {
    const files: SourceFile[] = [];
    
    // Regex to match code blocks with filename - matching Ballerina pattern
    const codeBlockRegex = /<code filename="([^"]+)">\s*```ballerina\s*([\s\S]*?)```\s*<\/code>/g;
    let match: RegExpExecArray | null;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
        files.push({
            fileName: match[1],
            content: match[2].trim()
        });
    }
    
    // Fallback: if no structured code blocks, create a generic response file
    if (files.length === 0 && content.trim()) {
        files.push({
            fileName: FILES.RESPONSE_MD,
            content: content
        });
    }
    
    return files;
}
