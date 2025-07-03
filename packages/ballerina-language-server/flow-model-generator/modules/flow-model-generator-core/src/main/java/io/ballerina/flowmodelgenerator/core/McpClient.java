/*
 *  Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com)
 *
 *  WSO2 LLC. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

package io.ballerina.flowmodelgenerator.core;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

public class McpClient {

    public static String sendInitializeRequest(String serviceUrl) throws IOException {
        URL url = new URL(serviceUrl);
        HttpURLConnection conn = null;

        try {
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json, text/event-stream");
            conn.setRequestProperty("User-Agent", "ballerina");
            conn.setRequestProperty("Upgrade", "h2c");
            conn.setRequestProperty("Connection", "keep-alive, Upgrade, HTTP2-Settings");
            conn.setRequestProperty("HTTP2-Settings", "AAEAABAAAAIAAAABAAN_____AAQAAP__AAUAAEAAAAYAACAA");
            conn.setDoOutput(true);

            String body = """
                    {
                      "jsonrpc":"2.0",
                      "id":1,
                      "method":"initialize",
                      "params":{
                        "protocolVersion":"2025-03-26",
                        "capabilities":{},
                        "clientInfo":{
                          "name":"MCP Client",
                          "version":""
                        }
                      }
                    }
                    """;

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }

            Map<String, List<String>> headers = conn.getHeaderFields();
            String sessionId = null;
            if (headers.containsKey("mcp-session-id")) {
                sessionId = headers.get("mcp-session-id").get(0);
            }
            return sessionId;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    public static JsonArray sendToolsListRequest(String serviceUrl, String sessionId) throws IOException {
        URL url = new URL(serviceUrl);
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) url.openConnection();
            // Configure request
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json, text/event-stream");
            conn.setRequestProperty("User-Agent", "ballerina");
            conn.setRequestProperty("Connection", "keep-alive");
            conn.setRequestProperty("mcp-session-id", sessionId);
            conn.setDoOutput(true);

            String body = """
                    {
                      "jsonrpc":"2.0",
                      "id":2,
                      "method":"tools/list"
                    }
                    """;

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }

            JsonArray toolsArray = new JsonArray();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(),
                                                            StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.startsWith("data: ")) {
                        String json = line.substring(6);
                        JsonObject response = JsonParser.parseString(json).getAsJsonObject();

                        if (response.has("result")) {
                            JsonObject result = response.getAsJsonObject("result");
                            if (result.has("tools") && result.get("tools").isJsonArray()) {
                                toolsArray = result.getAsJsonArray("tools");
                            }
                        }
                        break;
                    }
                }
            }
            return toolsArray;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }
}
