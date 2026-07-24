/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC licenses this file to you under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import { parse } from "@iarna/toml";

export interface PackageDetails {
    orgName: string;
    packageName: string;
    version: string;
}

export function updatePackageDetails(tomlContent: string, details: PackageDetails): string {
    return updatePackageSection(tomlContent, (section) => {
        let updatedSection = setField(section, 'org', quote(details.orgName));
        updatedSection = setField(updatedSection, 'name', quote(details.packageName));
        updatedSection = setField(updatedSection, 'version', quote(details.version));
        return updatedSection.endsWith('\n') ? updatedSection : `${updatedSection}\n`;
    });
}

export function syncPackageKeyword(tomlContent: string, keyword: string, shouldInclude: boolean): string {
    return updatePackageSection(tomlContent, (section) => {
        const parsedPackage = parse(section) as { package?: { keywords?: unknown } };
        const existingKeywords = parsedPackage.package?.keywords;
        if (existingKeywords !== undefined
            && (!Array.isArray(existingKeywords) || !existingKeywords.every((value) => typeof value === 'string'))) {
            throw new Error('The [package].keywords value must be an array of strings.');
        }

        const keywords = (existingKeywords ?? []) as string[];
        const hasKeyword = keywords.includes(keyword);
        if (shouldInclude === hasKeyword) {
            return section;
        }

        const updatedKeywords = shouldInclude
            ? [...keywords, keyword]
            : keywords.filter((value) => value !== keyword);
        return setField(section, 'keywords', updatedKeywords.length === 0
            ? undefined
            : `[${updatedKeywords.map((item) => JSON.stringify(item)).join(', ')}]`, true);
    });
}

function updatePackageSection(tomlContent: string, update: (section: string) => string): string {
    const packageSection = getPackageSection(tomlContent);
    const updatedSection = update(packageSection.content);
    return updatedSection === packageSection.content
        ? tomlContent
        : tomlContent.slice(0, packageSection.start) + updatedSection + tomlContent.slice(packageSection.end);
}

function getPackageSection(content: string): { content: string; start: number; end: number } {
    const packageHeaderRegex = /^\s*\[package\]\s*$/m;
    const packageHeaderMatch = packageHeaderRegex.exec(content);
    if (!packageHeaderMatch || packageHeaderMatch.index === undefined) {
        const start = content.length;
        const prefix = content.endsWith('\n') || content.length === 0 ? '' : '\n';
        return { content: `${prefix}[package]\n`, start, end: start };
    }

    const start = packageHeaderMatch.index;
    const nextSectionRegex = /^\s*(?:\[\[[^\]]+\]\]|\[[^\]]+\])\s*$/gm;
    nextSectionRegex.lastIndex = start + packageHeaderMatch[0].length;
    const nextSectionMatch = nextSectionRegex.exec(content);
    const end = nextSectionMatch ? nextSectionMatch.index : content.length;
    return { content: content.slice(start, end), start, end };
}

function quote(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function setField(section: string, fieldName: string, value: string | undefined, isArray = false): string {
    const field = findField(section, fieldName);
    if (!field) {
        return value === undefined ? section : insertField(section, fieldName, value);
    }

    const valueEnd = isArray ? findArrayEnd(section, field.valueStart) : endOfLine(section, field.valueStart);
    if (valueEnd === undefined) {
        throw new Error(`Unable to read the ${fieldName} value in the [package] section.`);
    }
    if (value === undefined) {
        const lineEnd = endOfLine(section, valueEnd);
        return section.slice(0, field.start) + section.slice(lineEnd === section.length ? lineEnd : lineEnd + 1);
    }
    return section.slice(0, field.start) + `${fieldName} = ${value}` + section.slice(valueEnd);
}

function insertField(section: string, fieldName: string, value: string): string {
    const headerLineBreak = section.indexOf('\n');
    if (headerLineBreak === -1) {
        return `${section}\n${fieldName} = ${value}\n`;
    }
    return section.slice(0, headerLineBreak + 1)
        + `${fieldName} = ${value}\n`
        + section.slice(headerLineBreak + 1);
}

function findField(section: string, fieldName: string): { start: number; valueStart: number } | undefined {
    const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`^\\s*${escapedFieldName}\\s*=\\s*`, 'm').exec(section);
    if (!match || match.index === undefined) {
        return undefined;
    }
    return { start: match.index, valueStart: match.index + match[0].length };
}

function endOfLine(content: string, start: number): number {
    const lineEnd = content.indexOf('\n', start);
    return lineEnd === -1 ? content.length : lineEnd;
}

function findArrayEnd(section: string, valueStart: number): number | undefined {
    if (section[valueStart] !== '[') {
        return undefined;
    }

    let quote: '"' | "'" | undefined;
    let escaped = false;
    let comment = false;
    let depth = 0;
    for (let index = valueStart; index < section.length; index++) {
        const char = section[index];
        if (comment) {
            comment = char !== '\n';
            continue;
        }
        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === quote) {
                quote = undefined;
            }
            continue;
        }
        if (char === '#') {
            comment = true;
        } else if (char === '"' || char === "'") {
            quote = char;
        } else if (char === '[') {
            depth++;
        } else if (char === ']') {
            depth--;
            if (depth === 0) {
                return index + 1;
            }
        }
    }
    return undefined;
}
