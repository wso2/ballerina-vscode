// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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

import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import { Library } from "../../../../src/features/ai/utils/libs/library-types";
import { toSyntaxString, deriveModulePrefix } from "../../../../src/features/ai/utils/libs/to-syntax-string";

const RESOURCES_DIR = path.join(__dirname, "resources");

function loadLibraries(filename: string): Library[] {
    const filePath = path.join(RESOURCES_DIR, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Library[];
}

/**
 * Helper: render a single library by name from the fixture.
 */
function renderLibrary(allLibs: Library[], name: string): string {
    const lib = allLibs.find((l) => l.name === name);
    assert.ok(lib, `Library ${name} not found in fixture`);
    return toSyntaxString([lib!]);
}

suite("toSyntaxString", () => {
    let allLibraries: Library[];
    let fullResult: string;

    suiteSetup(() => {
        allLibraries = loadLibraries("sample-libraries.json");
        fullResult = toSyntaxString(allLibraries);
    });

    // ----------------------------------------------------------------
    // Design Doc: Implementation Notes — Module prefix derivation
    // ----------------------------------------------------------------
    suite("deriveModulePrefix", () => {
        test("should derive correct module prefixes from the design doc table", () => {
            assert.strictEqual(deriveModulePrefix("ballerina/http"), "http");
            assert.strictEqual(deriveModulePrefix("ballerinax/salesforce"), "salesforce");
            assert.strictEqual(deriveModulePrefix("ballerinax/client.config"), "config");
            assert.strictEqual(deriveModulePrefix("ballerinax/docusign.dsesign"), "dsesign");
            assert.strictEqual(deriveModulePrefix("ballerina/oauth2"), "oauth2");
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §13: Library (top-level structure)
    // ----------------------------------------------------------------
    suite("§13 Library top-level structure", () => {
        test("should render library header with separator, name, description, and import", () => {
            const result = renderLibrary(allLibraries, "ballerina/http");
            assert.ok(result.includes("// ============================================================"));
            assert.ok(result.includes("// Library: ballerina/http"));
            assert.ok(result.includes("// This module provides APIs for connecting and interacting with HTTP and HTTP2 endpoints."));
            assert.ok(result.includes("import ballerina/http;"));
        });

        test("should render section headers only when section is non-empty", () => {
            // ballerina/http has types, functions, services — but no clients
            const httpResult = renderLibrary(allLibraries, "ballerina/http");
            assert.ok(httpResult.includes("// --- Types ---"), "Should have Types section");
            assert.ok(httpResult.includes("// --- Functions ---"), "Should have Functions section");
            assert.ok(httpResult.includes("// --- Service ---"), "Should have Service section");
            assert.ok(!httpResult.includes("// --- Client ---"), "Should NOT have Client section (empty)");

            // ballerina/io has only functions — no types, clients, services
            const ioResult = renderLibrary(allLibraries, "ballerina/io");
            assert.ok(!ioResult.includes("// --- Types ---"), "io should NOT have Types section");
            assert.ok(!ioResult.includes("// --- Client ---"), "io should NOT have Client section");
            assert.ok(ioResult.includes("// --- Functions ---"), "io should have Functions section");
            assert.ok(!ioResult.includes("// --- Service ---"), "io should NOT have Service section");
        });

        test("should prepend library instructions before everything when present", () => {
            const result = renderLibrary(allLibraries, "ballerinax/custom.integration");
            const importIdx = result.indexOf("import ballerinax/custom.integration;");
            const instructionsIdx = result.indexOf("// Use this library for custom integrations.");
            const typesIdx = result.indexOf("// --- Types ---");
            assert.ok(instructionsIdx > importIdx, "Instructions should come after import");
            assert.ok(instructionsIdx < typesIdx, "Instructions should come before Types section");
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §1: RecordTypeDefinition
    // ----------------------------------------------------------------
    suite("§1 RecordTypeDefinition", () => {
        test("should render record with internal links only (CacheConfig from ballerina/http)", () => {
            const result = renderLibrary(allLibraries, "ballerina/http");
            // Record-level description as # comment
            assert.ok(result.includes("# Provides a set of configurations for controlling the caching behaviour of the endpoint."));
            assert.ok(result.includes("type CacheConfig record {"));
            // Field-level descriptions
            assert.ok(result.includes("    # Specifies whether HTTP caching is enabled. Caching is enabled by default."));
            // Optional fields with ?
            assert.ok(result.includes("boolean enabled?;"));
            assert.ok(result.includes("boolean isShared?;"));
            assert.ok(result.includes("int capacity?;"));
            assert.ok(result.includes("float evictionFactor?;"));
            // Internal link — no prefix, no Special Agent Note
            assert.ok(result.includes("CachingPolicy policy?;"));
            assert.ok(!result.includes("CachingPolicy policy?; //"), "Internal link should have no agent note");
            assert.ok(result.includes("};"));
        });

        test("should render record with external links and Special Agent Note (ConnectionConfig from ballerinax/salesforce)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/salesforce");
            // No description → no # comment before record
            assert.ok(result.includes("type ConnectionConfig record {"));
            // No field descriptions → no # comments on fields
            assert.ok(result.includes("    string baseUrl;"));
            // External links: prefix + Special Agent Note
            assert.ok(
                result.includes("http:BearerTokenConfig|http:OAuth2RefreshTokenGrantConfig|OAuth2PasswordGrantConfig|OAuth2ClientCredentialsGrantConfig auth;"),
                "Should prefix external types and leave non-external types unprefixed"
            );
            assert.ok(
                result.includes("// Special Agent Note: BearerTokenConfig, OAuth2RefreshTokenGrantConfig FROM ballerina/http package"),
                "Should add grouped Special Agent Note"
            );
        });

        test("should render per-field external notes (ClientHttp1Settings from ballerinax/docusign.dsesign)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/docusign.dsesign");
            assert.ok(result.includes("type ClientHttp1Settings record {"));
            // Each external field gets its own note
            assert.ok(
                result.includes("http:KeepAlive keepAlive?; // Special Agent Note: KeepAlive FROM ballerina/http package"),
                "keepAlive should have its own agent note"
            );
            assert.ok(
                result.includes("http:Chunking chunking?; // Special Agent Note: Chunking FROM ballerina/http package"),
                "chunking should have its own agent note"
            );
            // Internal link — no prefix, no note
            assert.ok(result.includes("ProxyConfig proxy?;"));
            const proxyLine = result.split("\n").find((l) => l.includes("ProxyConfig proxy?;"));
            assert.ok(proxyLine && !proxyLine.includes("Special Agent Note"), "Internal link should have no agent note");
        });

        test("should render record field with default value (RecordWithDefault from ballerinax/custom.integration)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/custom.integration");
            assert.ok(result.includes("type RecordWithDefault record {"));
            assert.ok(
                result.includes("int timeout? = 60;"),
                "Should render field with optional + default"
            );
            assert.ok(
                result.includes("int retryCount?;"),
                "Should render optional field without default"
            );
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §2: EnumTypeDefinition
    // ----------------------------------------------------------------
    suite("§2 EnumTypeDefinition", () => {
        test("should render enum with members, skip member descriptions (HttpVersion from ballerina/http)", () => {
            const result = renderLibrary(allLibraries, "ballerina/http");
            assert.ok(result.includes("# Defines the supported HTTP protocols."));
            assert.ok(result.includes("enum HttpVersion {"));
            assert.ok(result.includes("HTTP_2_0"));
            assert.ok(result.includes("HTTP_1_1"));
            assert.ok(result.includes("HTTP_1_0"));
            // Member descriptions should be skipped
            assert.ok(!result.includes("Represents HTTP/2.0 protocol"), "Should skip enum member descriptions");
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §3: UnionTypeDefinition
    // ----------------------------------------------------------------
    suite("§3 UnionTypeDefinition", () => {
        test("should render union with members (Compression from ballerina/http)", () => {
            const result = renderLibrary(allLibraries, "ballerina/http");
            // Multi-line description
            assert.ok(result.includes("# Options to compress using gzip or deflate."));
            assert.ok(result.includes("# AUTO: When service behaves as a HTTP gateway..."));
            assert.ok(result.includes("type Compression COMPRESSION_AUTO|COMPRESSION_ALWAYS|COMPRESSION_NEVER;"));
        });

        test("should render union without members as bare type declaration (StatusCode from ballerina/http)", () => {
            const result = renderLibrary(allLibraries, "ballerina/http");
            assert.ok(result.includes("# Represents an HTTP status code type."));
            assert.ok(result.includes("type StatusCode;"));
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §4: ConstantTypeDefinition
    // ----------------------------------------------------------------
    suite("§4 ConstantTypeDefinition", () => {
        test("should render string constant with quoted value (AUTH_HEADER from ballerina/http)", () => {
            const result = renderLibrary(allLibraries, "ballerina/http");
            assert.ok(result.includes("# Represents the Authorization header name."));
            assert.ok(result.includes('const string AUTH_HEADER = "Authorization";'));
        });

        test("should render numeric constant without quotes (DEFAULT_PORT from ballerina/http)", () => {
            const result = renderLibrary(allLibraries, "ballerina/http");
            assert.ok(result.includes("# Default HTTP listener port."));
            assert.ok(result.includes("const int DEFAULT_PORT = 9090;"));
            // Should NOT have quotes around numeric value
            assert.ok(!result.includes('"9090"'), "Numeric constant should not be quoted");
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §5: ClassTypeDefinition
    // ----------------------------------------------------------------
    suite("§5 ClassTypeDefinition", () => {
        test("should render class with description and empty body (PersistentCookieHandler from ballerina/http)", () => {
            const result = renderLibrary(allLibraries, "ballerina/http");
            assert.ok(result.includes("# Provides persistence for cookies."));
            assert.ok(result.includes("class PersistentCookieHandler {"));
            // Should NOT be `client class`
            assert.ok(!result.includes("client class PersistentCookieHandler"), "Regular class should not be client class");
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §6: Client — Constructor
    // ----------------------------------------------------------------
    suite("§6 Client Constructor", () => {
        test("should render constructor with internal links only (salesforce)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/salesforce");
            assert.ok(result.includes("client class Client {"));
            assert.ok(
                result.includes("function init(ConnectionConfig config) returns error?;"),
                "Constructor should use function init(...), no remote keyword, no description"
            );
        });

        test("should render constructor with external links and defaults (postgresql)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/postgresql");
            // Constructor with many params, defaults, and external link
            assert.ok(
                result.includes('function init(string host = "localhost", string|() username = "postgres", string|() password = (), string|() database = (), int port = 5432, Options|() options = (), sql:ConnectionPool|() connectionPool = ()) returns ballerina/sql:1.16.0:Error?;'),
                "Should render constructor with all params, defaults, external prefix"
            );
            assert.ok(
                result.includes("// Special Agent Note: ConnectionPool FROM ballerina/sql package"),
                "Constructor should have Special Agent Note for external param"
            );
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §7: Client — Remote Function
    // ----------------------------------------------------------------
    suite("§7 Client Remote Function", () => {
        test("should render remote function without external links (salesforce query)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/salesforce");
            assert.ok(result.includes("    # Executes the specified SOQL query."));
            assert.ok(
                result.includes("remote function query(string soql, record {|anydata...;|} returnType = record {|anydata...;|}) returns stream<returnType, error?>|error;"),
                "Should render remote function with default param"
            );
        });

        test("should render remote function with external links on param and return (postgresql queryRow)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/postgresql");
            assert.ok(result.includes("    # Executes the query, which is expected to return at most one row of the result."));
            assert.ok(result.includes("    # If the query does not return any results, an `sql:NoRowsError` is returned."));
            assert.ok(
                result.includes("remote function queryRow(sql:ParameterizedQuery sqlQuery, anydata returnType = anydata) returns returnType|sql:Error;"),
                "Should prefix external types in both param and return"
            );
            assert.ok(
                result.includes("// Special Agent Note: ParameterizedQuery, Error FROM ballerina/sql package"),
                "Should collect external links from both params and return in one note"
            );
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §8: Client — Resource Function
    // ----------------------------------------------------------------
    suite("§8 Client Resource Function", () => {
        test("should render resource function with path segments and path-param exclusion (docusign post envelopes)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/docusign.dsesign");
            assert.ok(result.includes("    # Creates an envelope."));
            // Path: accounts/[string accountId]/envelopes
            assert.ok(
                result.includes("resource function post accounts/[string accountId]/envelopes("),
                "Should render path with static segments and path parameter brackets"
            );
            // accountId should NOT appear in parenthesized params (it's in the path)
            const resourceLine = result.split("\n").find((l) => l.includes("resource function post accounts"));
            assert.ok(resourceLine, "Resource function line should exist");
            const paramsSection = resourceLine!.substring(resourceLine!.indexOf("("));
            assert.ok(!paramsSection.includes("string accountId"), "Path param should be excluded from parenthesized params");
            // Non-path params should be present
            assert.ok(paramsSection.includes("EnvelopeDefinition payload"));
            assert.ok(paramsSection.includes("string|() cdse_mode = ()"));
            assert.ok(paramsSection.includes("string|() change_routing_order = ()"));
            // Return type
            assert.ok(paramsSection.includes("returns EnvelopeSummary|error;"));
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §9: Client (full composition)
    // ----------------------------------------------------------------
    suite("§9 Client full composition", () => {
        test("should render client class with constructor + remote functions (salesforce)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/salesforce");
            assert.ok(result.includes("# Ballerina Salesforce connector provides the capability to access Salesforce REST API."));
            assert.ok(result.includes("client class Client {"));
            assert.ok(result.includes("function init(ConnectionConfig config) returns error?;"));
            assert.ok(result.includes("remote function query("));
            assert.ok(result.includes("}"));
        });

        test("should render client class with constructor + resource functions (docusign)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/docusign.dsesign");
            assert.ok(result.includes("client class Client {"));
            assert.ok(result.includes("function init(ConnectionConfig config) returns error?;"));
            assert.ok(result.includes("resource function post accounts/[string accountId]/envelopes("));
        });

        test("should render client class with constructor + remote functions with external links (postgresql)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/postgresql");
            assert.ok(result.includes("# Represents a PostgreSQL database client."));
            assert.ok(result.includes("client class Client {"));
            assert.ok(result.includes("function init("));
            assert.ok(result.includes("remote function queryRow("));
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §10: Standalone Functions (library-level)
    // ----------------------------------------------------------------
    suite("§10 Standalone Functions", () => {
        test("should render standalone function with # + param and # + return docs (io fileWriteBytes)", () => {
            const result = renderLibrary(allLibraries, "ballerina/io");
            assert.ok(result.includes("# Write a set of bytes to a file."));
            assert.ok(result.includes("# + path - The path of the file"));
            assert.ok(result.includes("# + content - Byte content to write"));
            assert.ok(result.includes("# + option - To indicate whether to overwrite or append the given content"));
            assert.ok(result.includes("# + return - An `io:Error` or else `()`"));
            assert.ok(
                result.includes("function fileWriteBytes(string path, byte[] content, FileWriteOption option = OVERWRITE) returns Error|();"),
                "Should render function with params and default"
            );
        });

        test("should render standalone function without param descriptions (http authenticateResource)", () => {
            const result = renderLibrary(allLibraries, "ballerina/http");
            assert.ok(result.includes("# Uses for declarative auth design."));
            assert.ok(
                result.includes("function authenticateResource(Service serviceRef, string methodName, string[] resourcePath) returns ();"),
                "Should render function with no param docs when descriptions are empty"
            );
            // Should NOT have # + param lines for params with empty descriptions
            const funcLines = result.split("\n");
            const authFuncIdx = funcLines.findIndex((l) => l.includes("function authenticateResource("));
            // The line before should be the description, not a # + param line
            assert.ok(
                funcLines[authFuncIdx - 1].includes("# Uses for declarative auth design."),
                "No # + param lines for empty descriptions"
            );
        });

        test("should render standalone function with multi-package external links (custom.integration process)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/custom.integration");
            assert.ok(
                result.includes("function process(http:Request req, kafka:Message msg) returns error?;"),
                "Should prefix types from different packages"
            );
            assert.ok(
                result.includes("// Special Agent Note: Request FROM ballerina/http package, Message FROM ballerinax/kafka package"),
                "Should group by package in Special Agent Note with comma separation"
            );
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §11: Service — GenericService
    // ----------------------------------------------------------------
    suite("§11 GenericService", () => {
        test("should render generic service with listener signature and instructions passthrough (ballerina/http)", () => {
            const result = renderLibrary(allLibraries, "ballerina/http");
            assert.ok(result.includes("// --- Service (generic) ---"));
            assert.ok(result.includes("// Listener: Listener(int port)"));
            assert.ok(result.includes("// Instructions:"));
            // Instructions passed through verbatim
            assert.ok(result.includes("# Service writing instructions"));
            assert.ok(result.includes("- HTTP Service always requires a http listener to be attached to it."));
        });
    });

    // ----------------------------------------------------------------
    // Design Doc §12: Service — FixedService
    // ----------------------------------------------------------------
    suite("§12 FixedService", () => {
        test("should render fixed service with listener and remote methods (salesforce)", () => {
            const result = renderLibrary(allLibraries, "ballerinax/salesforce");
            assert.ok(
                result.includes("service on new salesforce:Listener(salesforce:ListenerConfig listenerConfig"),
                "Should render service on new Listener(...)"
            );
            // Method names extracted from description backticks
            assert.ok(result.includes("    # The `onCreate` method is triggered when a new record create event is received from Salesforce."));
            assert.ok(result.includes("remote function onCreate(salesforce:EventData payload) returns error?;"));
            assert.ok(result.includes("remote function onUpdate(salesforce:EventData payload) returns error?;"));
            assert.ok(result.includes("remote function onDelete(salesforce:EventData payload) returns error?;"));
        });

        test("should mark optional methods with // optional comment", () => {
            const result = renderLibrary(allLibraries, "ballerinax/salesforce");
            // onCreate and onUpdate are optional: false
            const onCreateLine = result.split("\n").find((l) => l.includes("remote function onCreate("));
            assert.ok(onCreateLine && !onCreateLine.includes("// optional"), "Required method should not have // optional");
            // onDelete is optional: true
            const onDeleteLine = result.split("\n").find((l) => l.includes("remote function onDelete("));
            assert.ok(onDeleteLine && onDeleteLine.includes("// optional"), "Optional method should have // optional comment");
        });
    });

    // ----------------------------------------------------------------
    // Design Doc: External Type References — Dual Approach
    // ----------------------------------------------------------------
    suite("External Type References — Dual Approach", () => {
        test("Strategy 1: should apply module-qualified prefix to external type names", () => {
            // salesforce ConnectionConfig auth field
            const result = renderLibrary(allLibraries, "ballerinax/salesforce");
            assert.ok(result.includes("http:BearerTokenConfig"), "Should prefix with http:");
            assert.ok(result.includes("http:OAuth2RefreshTokenGrantConfig"), "Should prefix with http:");
            // Non-external types left unprefixed
            assert.ok(result.includes("|OAuth2PasswordGrantConfig|"), "Non-linked types should stay unprefixed");
        });

        test("Strategy 2: should emit Special Agent Note only for external links", () => {
            // CacheConfig has only internal links → no note
            const httpResult = renderLibrary(allLibraries, "ballerina/http");
            const policyLine = httpResult.split("\n").find((l) => l.includes("CachingPolicy policy?;"));
            assert.ok(policyLine && !policyLine.includes("Special Agent Note"), "Internal-only field should have no agent note");

            // ConnectionConfig auth has external links → note
            const sfResult = renderLibrary(allLibraries, "ballerinax/salesforce");
            assert.ok(sfResult.includes("// Special Agent Note: BearerTokenConfig, OAuth2RefreshTokenGrantConfig FROM ballerina/http package"));
        });

        test("should handle multi-package external links on a single function line", () => {
            const result = renderLibrary(allLibraries, "ballerinax/custom.integration");
            assert.ok(
                result.includes("// Special Agent Note: Request FROM ballerina/http package, Message FROM ballerinax/kafka package"),
                "Multi-package note should separate packages with comma"
            );
        });

        test("should collect external links from both params and return type on function", () => {
            const result = renderLibrary(allLibraries, "ballerinax/postgresql");
            // queryRow has ParameterizedQuery in param and Error in return, both from ballerina/sql
            assert.ok(
                result.includes("// Special Agent Note: ParameterizedQuery, Error FROM ballerina/sql package"),
                "Should collect from both param and return in one note"
            );
        });
    });
});
