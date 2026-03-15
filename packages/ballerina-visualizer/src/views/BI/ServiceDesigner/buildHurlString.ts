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

import { FunctionModel } from "@wso2/ballerina-core";

export interface NotebookCell {
    kind: "markdown" | "hurl";
    content: string;
}

// ---------------------------------------------------------------------------
// OAI schema helpers
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

function resolvePayloadSchema(oasSpec: any, hurlPath: string, method: string): any | undefined {
    const pathEntry = oasSpec?.paths?.[hurlPath];
    if (!pathEntry) { return undefined; }
    const op = pathEntry[method.toLowerCase()];
    const schema = op?.requestBody?.content?.['application/json']?.schema;
    if (!schema) { return undefined; }
    return schema.$ref ? resolveSchemaRef(schema.$ref, oasSpec) : schema;
}

function buildPayloadBody(schema: any, oasSpec: any, typeName: string): string[] {
    const lines: string[] = [];
    const schemaDoc = generateSchemaDoc(schema, 1, oasSpec);
    lines.push('# Modify the JSON payload as needed');
    if (schemaDoc.trim()) {
        lines.push('#');
        lines.push('# Expected schema:');
        for (const line of schemaDoc.split('\n')) {
            lines.push(line ? `# ${line}` : '#');
        }
    }
    lines.push('');
    lines.push(JSON.stringify(generateSampleValue(schema, oasSpec), null, 2));
    return lines;
}

/**
 * Build the base URL from the service listener and base path.
 * listener may be a full URL ("http://localhost:9090"), a bare port ("9090" / ":9090"),
 * or a Ballerina listener variable name (e.g. "httpDefaultListener") — the latter
 * is detected by the absence of "://" and treated as localhost:9090.
 */
export function buildBaseUrl(listener: string | undefined, basePath: string | undefined): string {
    let base = listener?.trim() ?? "";
    // Only trust listener as a URL when it contains a scheme (e.g. "http://")
    if (!base || !base.includes("://")) {
        // bare port like "9090" or ":9090"
        const port = base.replace(/^:/, "");
        const portNum = parseInt(port, 10);
        base = portNum > 0 ? `http://localhost:${portNum}` : "http://localhost:9090";
    }
    base = base.replace(/\/$/, "");

    const bp = basePath?.trim() ?? "";
    if (!bp || bp === "/") {
        return base;
    }
    return `${base}/${bp.replace(/^\//, "")}`;
}

/**
 * Convert a Ballerina resource path to a hurl URL path.
 * Path parameters like `[string id]` or `[int orderId]` become `{{id}}` / `{{orderId}}`.
 */
function toHurlPath(resourcePath: string): string {
    if (!resourcePath || resourcePath === ".") {
        return "/";
    }
    const converted = resourcePath.replace(
        /\[(?:[a-zA-Z][\w]*\s+)?([a-zA-Z][\w]*)\]/g,
        "{{$1}}"
    );
    return converted.startsWith("/") ? converted : `/${converted}`;
}


/**
 * Generate a markdown documentation cell for a resource FunctionModel.
 * Shows method + path as header, then sections for path/query/header/body parameters.
 */
/**
 * Extract path parameters from a Ballerina resource path.
 * `[string petId]` → { type: "string", name: "petId" }
 */
function extractPathParams(resourcePath: string): { type: string; name: string }[] {
    const params: { type: string; name: string }[] = [];
    const regex = /\[([a-zA-Z][\w]*)\s+([a-zA-Z][\w]*)\]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(resourcePath)) !== null) {
        params.push({ type: match[1], name: match[2] });
    }
    return params;
}

export function buildMarkdownDoc(functionModel: FunctionModel): string {
    const method = (functionModel.accessor?.value ?? "GET").toUpperCase();
    const resourcePath = functionModel.name?.value ?? "";
    const hurlPath = toHurlPath(resourcePath);

    const lines: string[] = [];
    lines.push(`#### ${method} ${hurlPath}`);

    const pathParams = extractPathParams(resourcePath);
    if (pathParams.length > 0) {
        lines.push("");
        lines.push("**Path Parameters:**");
        for (const p of pathParams) {
            lines.push(`- \`${p.name}\` [${p.type}] (Required)`);
        }
    }

    const enabledParams = (functionModel.parameters ?? []).filter(p => p.enabled !== false);
    const queryParams = enabledParams.filter(p => p.httpParamType === "QUERY");

    if (queryParams.length > 0) {
        lines.push("");
        lines.push("**Query Parameters:**");
        for (const p of queryParams) {
            const required = p.kind === "REQUIRED" ? " (Required)" : "";
            lines.push(`- \`${p.name?.value}\` [${p.type?.value ?? "string"}]${required}`);
        }
    }

    return lines.join("\n");
}

/**
 * Generate a hurl request block from a FunctionModel.
 *
 * Follows https://hurl.dev/docs/grammar.html:
 *   request = method SP url LF
 *             header*
 *             body?          ← MUST come before request-sections
 *             request-section*   ([QueryStringParams], [FormParams], …)
 *
 * Output example:
 *   # <documentation>
 *   POST http://localhost:9090/api/users/{{id}}
 *   Authorization: {{authorization}}
 *   Content-Type: application/json
 *   # Body: User
 *   {}
 *
 *   [QueryStringParams]
 *   filter: {{filter}}
 */
export function buildHurlString(functionModel: FunctionModel, baseUrl: string, oasSpec?: any): string {
    const method = (functionModel.accessor?.value ?? "GET").toUpperCase();
    const resourcePath = functionModel.name?.value ?? "";

    const hurlPath = toHurlPath(resourcePath);
    const cleanBase = baseUrl.replace(/\/$/, "");
    const fullUrl = `${cleanBase}${hurlPath}`;

    const lines: string[] = [];

    // Documentation as hurl comments (#)
    const doc = functionModel.documentation?.value?.trim();
    if (doc) {
        for (const line of doc.split("\n")) {
            const trimmed = line.trim();
            if (trimmed) {
                lines.push(`# ${trimmed}`);
            }
        }
    }

    const enabledParams = (functionModel.parameters ?? []).filter(p => p.enabled !== false);
    const headerParams = enabledParams.filter(p => p.httpParamType === "HEADER");
    const queryParams  = enabledParams.filter(p => p.httpParamType === "QUERY");
    const payloadParams = enabledParams.filter(p => p.httpParamType === "PAYLOAD");

    // 1. Request line
    lines.push(`${method} ${fullUrl}`);

    // 2. Headers
    for (const param of headerParams) {
        const headerName = param.headerName?.value ?? param.name?.value ?? "X-Header";
        const varName = param.name?.value ?? "headerValue";
        lines.push(`${headerName}: {{${varName}}}`);
    }

    // 3. Body (before any request-sections per hurl grammar)
    if (payloadParams.length > 0) {
        const typeName = payloadParams[0].type?.value ?? "";
        const isXml = typeName.toLowerCase().includes("xml");
        lines.push(`Content-Type: ${isXml ? "application/xml" : "application/json"}`);

        if (!isXml) {
            const schema = oasSpec ? resolvePayloadSchema(oasSpec, hurlPath, method) : undefined;
            if (schema) {
                lines.push(...buildPayloadBody(schema, oasSpec, typeName));
            } else {
                lines.push(`# Body: ${typeName}`);
                lines.push("{}");
            }
        }
    }

    // 4. Request-sections ([QueryStringParams] etc.) — always after body
    if (queryParams.length > 0) {
        lines.push("");
        lines.push("[QueryStringParams]");
        for (const param of queryParams) {
            const name = param.name?.value ?? "param";
            lines.push(`${name}: {{${name}}}`);
        }
    }

    return lines.join("\n");
}
