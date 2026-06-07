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

