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

import { FunctionModel, HttpPayloadContext, Protocol } from "@wso2/ballerina-core";

/** A notebook cell passed to `wso2-http-book.importHurlString` when rich cells are needed. */
export interface NotebookCell {
    kind: "markdown" | "hurl";
    content: string;
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
 * Build the HttpPayloadContext for the AI payload generator from a FunctionModel.
 * Returns undefined if the resource has no PAYLOAD parameters (no body to generate).
 */
export function buildPayloadContext(
    functionModel: FunctionModel,
    serviceName: string,
    basePath: string
): HttpPayloadContext | undefined {
    const payloadParams = (functionModel.parameters ?? []).filter(
        p => p.enabled !== false && p.httpParamType === "PAYLOAD"
    );
    if (payloadParams.length === 0) { return undefined; }

    return {
        protocol: Protocol.HTTP,
        serviceName,
        serviceBasePath: basePath,
        resourceBasePath: functionModel.name?.value,
        resourceMethod: functionModel.accessor?.value,
        resourceDocumentation: functionModel.documentation?.value,
        paramDetails: (functionModel.parameters ?? [])
            .filter(p => p.enabled !== false)
            .map(p => ({ name: p.name?.value ?? "", type: p.type?.value ?? "" }))
    };
}

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

/**
 * Generate a markdown documentation cell for a resource FunctionModel.
 * Shows method + path as header, then sections for path/query/header/body parameters.
 */
export function buildMarkdownDoc(functionModel: FunctionModel): string {
    const method = (functionModel.accessor?.value ?? "GET").toUpperCase();
    const resourcePath = functionModel.name?.value ?? "";
    const hurlPath = toHurlPath(resourcePath);

    const lines: string[] = [];
    lines.push(`## ${method} ${hurlPath}`);

    const doc = functionModel.documentation?.value?.trim();
    if (doc) {
        lines.push("");
        lines.push(doc);
    }

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
    const headerParams = enabledParams.filter(p => p.httpParamType === "HEADER");
    const payloadParams = enabledParams.filter(p => p.httpParamType === "PAYLOAD");

    if (queryParams.length > 0) {
        lines.push("");
        lines.push("**Query Parameters:**");
        for (const p of queryParams) {
            const required = p.kind === "REQUIRED" ? " (Required)" : "";
            lines.push(`- \`${p.name?.value}\` [${p.type?.value ?? "string"}]${required}`);
        }
    }

    if (headerParams.length > 0) {
        lines.push("");
        lines.push("**Headers:**");
        for (const p of headerParams) {
            const required = p.kind === "REQUIRED" ? " (Required)" : "";
            lines.push(`- \`${p.headerName?.value ?? p.name?.value}\` [${p.type?.value ?? "string"}]${required}`);
        }
    }

    if (payloadParams.length > 0) {
        lines.push("");
        lines.push("**Body:**");
        lines.push(`- \`${payloadParams[0].type?.value ?? "object"}\``);
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
export function buildHurlString(functionModel: FunctionModel, baseUrl: string, examplePayload?: object): string {
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
        const contentType = typeName.toLowerCase().includes("xml")
            ? "application/xml"
            : "application/json";
        lines.push(`Content-Type: ${contentType}`);
        if (examplePayload && Object.keys(examplePayload).length > 0) {
            lines.push(JSON.stringify(examplePayload, null, 2));
        } else {
            lines.push(`# Body: ${typeName}`);
            lines.push("{}");
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
