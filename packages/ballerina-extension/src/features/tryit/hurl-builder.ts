/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface HurlCell {
    kind: 'markdown' | 'hurl';
    content: string;
}

// ---------------------------------------------------------------------------
// OAS schema helpers (mirrors buildHurlString.ts in the visualizer)
// ---------------------------------------------------------------------------

function resolveSchemaRef(ref: string, spec: any): any | undefined {
    if (!ref?.startsWith('#/')) { return undefined; }
    const parts = ref.substring(2).split('/');
    let current: any = spec;
    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            return undefined;
        }
    }
    return current;
}

function generateSchemaDoc(schema: any, depth: number, spec: any): string {
    const indent = '  '.repeat(depth);
    if (schema?.$ref) {
        const resolved = resolveSchemaRef(schema.$ref, spec);
        return resolved ? generateSchemaDoc(resolved, depth, spec) : '';
    }
    if (schema?.type === 'object' && schema.properties) {
        let doc = `${indent}${schema.type}\n`;
        for (const [propName, prop] of Object.entries<any>(schema.properties)) {
            const propSchema = prop.$ref ? resolveSchemaRef(prop.$ref, spec) || prop : prop;
            const format = propSchema.format ? `(${propSchema.format})` : '';
            const description = propSchema.description ? ` - ${propSchema.description}` : '';
            doc += `${indent}- ${propName}: ${propSchema.type}${format}${description}\n`;
            if (propSchema.type === 'object' && propSchema.properties) {
                doc += generateSchemaDoc(propSchema, depth + 1, spec);
            } else if (propSchema.type === 'array' && propSchema.items) {
                const itemsSchema = propSchema.items.$ref
                    ? resolveSchemaRef(propSchema.items.$ref, spec) || propSchema.items
                    : propSchema.items;
                doc += `${indent}  items: ${generateSchemaDoc(itemsSchema, depth + 1, spec).trimStart()}`;
            }
            if (propSchema.enum) {
                doc += `${indent}  enum: [${propSchema.enum.join(', ')}]\n`;
            }
        }
        return doc;
    }
    if (schema?.type === 'array') {
        let doc = 'array\n';
        if (schema.items) {
            const itemsSchema = schema.items.$ref
                ? resolveSchemaRef(schema.items.$ref, spec) || schema.items
                : schema.items;
            doc += `${indent}items: ${generateSchemaDoc(itemsSchema, depth + 1, spec).trimStart()}`;
        }
        return doc;
    }
    return `${schema?.type ?? 'any'}${schema?.format ? ` (${schema.format})` : ''}`;
}

function generateSampleValue(schema: any, spec: any): any {
    if (schema?.$ref) {
        const resolved = resolveSchemaRef(schema.$ref, spec);
        return resolved ? generateSampleValue(resolved, spec) : {};
    }
    if (!schema?.type) { return {}; }
    switch (schema.type) {
        case 'object': {
            if (!schema.properties) { return {}; }
            const obj: Record<string, any> = {};
            for (const [propName, prop] of Object.entries<any>(schema.properties)) {
                const propSchema = prop.$ref ? resolveSchemaRef(prop.$ref, spec) || prop : prop;
                obj[propName] = generateSampleValue(propSchema, spec);
            }
            return obj;
        }
        case 'array': {
            if (!schema.items) { return []; }
            const itemsSchema = schema.items.$ref
                ? resolveSchemaRef(schema.items.$ref, spec) || schema.items
                : schema.items;
            return [generateSampleValue(itemsSchema, spec)];
        }
        case 'string':
            if (schema.enum?.length) { return schema.enum[0]; }
            if (schema.format) {
                switch (schema.format) {
                    case 'date': return '2024-02-06';
                    case 'date-time': return '2024-02-06T12:00:00Z';
                    case 'email': return 'user@example.com';
                    case 'uuid': return '123e4567-e89b-12d3-a456-426614174000';
                    default: return '{?}';
                }
            }
            return schema.default ?? '{?}';
        case 'integer':
        case 'number':
            return schema.default ?? 0;
        case 'boolean':
            return schema.default ?? false;
        case 'null':
            return null;
        default:
            return undefined;
    }
}

// ---------------------------------------------------------------------------
// OAS path → hurl URL  (path params replaced with type-appropriate sample values)
// ---------------------------------------------------------------------------

/**
 * Return a sample scalar string for a single OAS schema.
 * Falls back to the param name so the URL stays human-readable.
 */
function paramSampleValue(schema: any, paramName: string, spec: any): string {
    if (!schema) { return paramName; }
    const raw = generateSampleValue(schema?.type === 'array' && schema.items
        ? (schema.items.$ref ? resolveSchemaRef(schema.items.$ref, spec) || schema.items : schema.items)
        : schema, spec);
    if (raw === undefined || raw === null) { return paramName; }
    if (typeof raw === 'object') { return JSON.stringify(raw); }
    const str = String(raw);
    return str === '{?}' ? paramName : str;
}

// ---------------------------------------------------------------------------
// Path matching: handles both OAS format ({id}) and Ballerina format ([string id])
// ---------------------------------------------------------------------------

function matchesResourcePath(oasPath: string, targetPath: string): boolean {
    // Ballerina uses "." to mean the root path of the service (equivalent to "/")
    const normalizedTarget = targetPath === '.' ? '/' : targetPath;

    const oasSegs = oasPath.split('/').filter(Boolean);
    // Strip leading slash from targetPath segments, remove Ballerina escape quotes
    const targetSegs = normalizedTarget.split('/').filter(Boolean).map(s => s.replace(/^'/, ''));

    if (oasSegs.length !== targetSegs.length) { return false; }

    for (let i = 0; i < oasSegs.length; i++) {
        const oas = oasSegs[i];
        const target = targetSegs[i];
        // OAS param {foo} matches Ballerina param [type name] or OAS param {name}
        if (oas.startsWith('{') && oas.endsWith('}')) {
            if (target.startsWith('[') && target.endsWith(']')) { continue; } // Ballerina format
            if (target.startsWith('{') && target.endsWith('}')) { continue; } // OAS format
        }
        if (oas !== target) { return false; }
    }
    return true;
}

// ---------------------------------------------------------------------------
// Build a markdown documentation cell from an OAS operation
// ---------------------------------------------------------------------------

function buildMarkdownCell(method: string, oasPath: string, operation: any): string {
    const lines: string[] = [];
    lines.push(`#### ${method.toUpperCase()} ${oasPath}`);

    const params: any[] = operation.parameters ?? [];

    const pathParams = params.filter(p => p.in === 'path');
    if (pathParams.length > 0) {
        lines.push('');
        lines.push('**Path Parameters:**');
        for (const p of pathParams) {
            lines.push(`- \`${p.name}\` [${p.schema?.type ?? 'string'}] (Required)`);
        }
    }

    const queryParams = params.filter(p => p.in === 'query');
    if (queryParams.length > 0) {
        lines.push('');
        lines.push('**Query Parameters:**');
        for (const p of queryParams) {
            const required = p.required ? ' (Required)' : '';
            lines.push(`- \`${p.name}\` [${p.schema?.type ?? 'string'}]${required}`);
        }
    }

    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Build a hurl request cell from an OAS operation
// ---------------------------------------------------------------------------

function buildHurlCell(method: string, oasPath: string, operation: any, baseUrl: string, oasSpec: any): string {
    const params: any[] = operation.parameters ?? [];

    // Replace {pathParam} placeholders with type-appropriate sample values so the
    // generated cell is immediately runnable. The user replaces the sample values
    // with real ones before (or after) their first test run.
    const resolvedPath = oasPath.replace(/\{(\w+)\}/g, (_, name) => {
        const p = params.find((p: any) => p.name === name && p.in === 'path');
        return paramSampleValue(p?.schema, name, oasSpec);
    });
    const fullUrl = `${baseUrl.replace(/\/$/, '')}${resolvedPath}`;
    const lines: string[] = [];

    // Doc comment from operation summary/description
    const doc = (operation.summary || operation.description || '').trim();
    if (doc) {
        for (const line of doc.split('\n')) {
            const trimmed = line.trim();
            if (trimmed) { lines.push(`# ${trimmed}`); }
        }
    }

    // Request line
    lines.push(`${method.toUpperCase()} ${fullUrl}`);

    // Header params
    for (const p of params.filter((p: any) => p.in === 'header')) {
        lines.push(`${p.name}: ${paramSampleValue(p.schema, p.name, oasSpec)}`);
    }

    // Body
    const bodySchema = operation.requestBody?.content?.['application/json']?.schema;
    if (bodySchema) {
        const resolved = bodySchema.$ref ? resolveSchemaRef(bodySchema.$ref, oasSpec) : bodySchema;
        if (resolved) {
            lines.push('Content-Type: application/json');
            lines.push('# Modify the JSON payload as needed');
            const schemaDoc = generateSchemaDoc(resolved, 1, oasSpec);
            if (schemaDoc.trim()) {
                lines.push('#');
                lines.push('# Expected schema:');
                for (const line of schemaDoc.split('\n')) {
                    lines.push(line ? `# ${line}` : '#');
                }
            }
            lines.push('');
            lines.push(JSON.stringify(generateSampleValue(resolved, oasSpec), null, 2));
        }
    }

    // Query params section
    const queryParams = params.filter((p: any) => p.in === 'query');
    if (queryParams.length > 0) {
        lines.push('');
        lines.push('[QueryStringParams]');
        for (const p of queryParams) {
            lines.push(`${p.name}: ${paramSampleValue(p.schema, p.name, oasSpec)}`);
        }
    }

    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main entry: build all cells for a service from its OAS spec
// ---------------------------------------------------------------------------

export function buildHurlCellsFromOASSpec(
    oasSpec: any,
    baseUrl: string,
    serviceName: string,
    resourceMetadata?: { methodValue: string; pathValue: string }
): HurlCell[] {
    const cells: HurlCell[] = [];

    cells.push({
        kind: 'markdown',
        content: `### Try Service: '${serviceName}' (${baseUrl})`
    });

    const paths: Record<string, any> = oasSpec?.paths ?? {};

    for (const [oasPath, pathItem] of Object.entries<any>(paths)) {
        const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
        for (const method of httpMethods) {
            const operation = pathItem[method];
            if (!operation) { continue; }

            // Filter to specific resource when in resource mode
            if (resourceMetadata) {
                const pathMatches = matchesResourcePath(oasPath, resourceMetadata.pathValue);
                if (!pathMatches || method !== resourceMetadata.methodValue.toLowerCase()) {
                    continue;
                }
            }

            cells.push({
                kind: 'markdown',
                content: buildMarkdownCell(method, oasPath, operation)
            });
            cells.push({
                kind: 'hurl',
                content: buildHurlCell(method, oasPath, operation, baseUrl, oasSpec)
            });
        }
    }

    return cells;
}
