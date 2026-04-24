/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
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

import { PropertyModel } from "@wso2/ballerina-core";

export function isDatabaseSystemProperty(prop: PropertyModel): boolean {
    const label = (prop.metadata?.label || "").toLowerCase();
    return label.includes("database system") || label.includes("db system");
}

export function isPasswordProperty(prop: PropertyModel): boolean {
    const label = (prop.metadata?.label || "").toLowerCase();
    return label.includes("password");
}

/**
 * Formats a database type value for display (e.g. "postgresql" -> "PostgreSQL").
 * @param value - The raw database type value
 * @param emptyFallback - Value to return when input is empty (default: "—")
 */
export function formatDatabaseTypeDisplay(value: string, emptyFallback = "—"): string {
    const lower = (value || "").toLowerCase();
    if (lower.includes("postgres")) return "PostgreSQL";
    if (lower.includes("mysql")) return "MySQL";
    if (lower.includes("mssql")) return "MSSQL";
    return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : emptyFallback;
}
