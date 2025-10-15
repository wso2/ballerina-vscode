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
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * Client for sending requests to the MCP service.
 *
 * @since 1.1.0
 */
public class McpClient {

    public static String sendInitializeRequest(String serviceUrl, String accessToken) throws IOException {
        HttpURLConnection conn = null;
        try {
            URL url = URI.create(serviceUrl).toURL();
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json, text/event-stream");

            // Add OAuth bearer token if provided
            if (accessToken != null && !accessToken.trim().isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + accessToken);
            }

            conn.setDoOutput(true);
            conn.setConnectTimeout(10000); // 10 seconds
            conn.setReadTimeout(10000); // 10 seconds

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

            int responseCode = conn.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                String errorMessage = readErrorStream(conn);
                throw new IOException("HTTP " + responseCode + ": " +
                        (errorMessage != null ? errorMessage : conn.getResponseMessage()));
            }

            Map<String, List<String>> headers = conn.getHeaderFields();
            String sessionId = null;

            for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
                if (entry.getKey() != null && entry.getKey().equalsIgnoreCase("mcp-session-id")) {
                    if (!entry.getValue().isEmpty()) {
                        sessionId = entry.getValue().getFirst();
                        break;
                    }
                }
            }

            return sessionId;
        } catch (java.net.MalformedURLException e) {
            throw new IOException("Invalid URL: " + e.getMessage(), e);
        } catch (java.net.UnknownHostException e) {
            throw new IOException("Unknown host: " + e.getMessage(), e);
        } catch (java.net.ConnectException e) {
            throw new IOException("Connection refused: Unable to connect to " + serviceUrl, e);
        } catch (java.net.SocketTimeoutException e) {
            throw new IOException("Connection timeout: Server did not respond in time", e);
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    public static void sendInitializedNotification(String serviceUrl, String sessionId, String accessToken)
            throws IOException {
        HttpURLConnection conn = null;
        try {
            URL url = URI.create(serviceUrl).toURL();
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json, text/event-stream");

            if (sessionId != null && !sessionId.trim().isEmpty()) {
                conn.setRequestProperty("mcp-session-id", sessionId);
            }

            // Add OAuth bearer token if provided
            if (accessToken != null && !accessToken.trim().isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + accessToken);
            }

            conn.setDoOutput(true);
            conn.setConnectTimeout(10000); // 10 seconds
            conn.setReadTimeout(10000); // 10 seconds

            // Note: This is a notification (no "id" field)
            String body = """
                    {
                      "jsonrpc":"2.0",
                      "method":"notifications/initialized"
                    }
                    """;

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }

            // Notifications don't expect a meaningful response, just check it didn't fail
            int responseCode = conn.getResponseCode();
            if (responseCode >= 400) {
                String errorMessage = readErrorStream(conn);
                throw new IOException("HTTP " + responseCode + ": " +
                        (errorMessage != null ? errorMessage : conn.getResponseMessage()));
            }

            // Consume any response body to properly close the connection
            try {
                conn.getInputStream().close();
            } catch (IOException ignored) {
                // Response body might be empty, which is fine for a notification
            }
        } catch (java.net.MalformedURLException e) {
            throw new IOException("Invalid URL: " + e.getMessage(), e);
        } catch (java.net.UnknownHostException e) {
            throw new IOException("Unknown host: " + e.getMessage(), e);
        } catch (java.net.ConnectException e) {
            throw new IOException("Connection refused: Unable to connect to " + serviceUrl, e);
        } catch (java.net.SocketTimeoutException e) {
            throw new IOException("Connection timeout: Server did not respond in time", e);
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    public static JsonArray sendToolsListRequest(String serviceUrl, String sessionId, String accessToken)
            throws IOException {
        HttpURLConnection conn = null;
        try {
            URL url = URI.create(serviceUrl).toURL();
            conn = (HttpURLConnection) url.openConnection();
            // Configure request
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json, text/event-stream");
            conn.setRequestProperty("User-Agent", "ballerina");
            conn.setRequestProperty("Connection", "keep-alive");
            conn.setConnectTimeout(10000); // 10 seconds
            conn.setReadTimeout(10000); // 10 seconds

            if (sessionId != null && !sessionId.trim().isEmpty()) {
                conn.setRequestProperty("mcp-session-id", sessionId);
            }

            // Add OAuth bearer token if provided
            if (accessToken != null && !accessToken.trim().isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + accessToken);
            }

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

            int responseCode = conn.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                String errorMessage = readErrorStream(conn);
                throw new IOException("HTTP " + responseCode + ": " +
                        (errorMessage != null ? errorMessage : conn.getResponseMessage()));
            }

            return extractToolsArrayFromResponse(conn);
        } catch (java.net.MalformedURLException e) {
            throw new IOException("Invalid URL: " + e.getMessage(), e);
        } catch (java.net.UnknownHostException e) {
            throw new IOException("Unknown host: " + e.getMessage(), e);
        } catch (java.net.ConnectException e) {
            throw new IOException("Connection refused: Unable to connect to " + serviceUrl, e);
        } catch (java.net.SocketTimeoutException e) {
            throw new IOException("Connection timeout: Server did not respond in time", e);
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private static JsonArray extractToolsArrayFromResponse(HttpURLConnection conn) throws IOException {
        String contentType = conn.getContentType();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {

            if (contentType != null && contentType.contains("text/event-stream")) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.startsWith("data: ")) {
                        return parseToolsFromJson(line.substring(6));
                    }
                }
            } else {
                StringBuilder fullResponse = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    fullResponse.append(line);
                }
                return parseToolsFromJson(fullResponse.toString());
            }
        }
        return new JsonArray();
    }

    private static JsonArray parseToolsFromJson(String json) {
        JsonObject response = JsonParser.parseString(json).getAsJsonObject();
        if (response.has("result")) {
            JsonObject result = response.getAsJsonObject("result");
            if (result.has("tools") && result.get("tools").isJsonArray()) {
                return result.getAsJsonArray("tools");
            }
        }
        return new JsonArray();
    }

    private static String readErrorStream(HttpURLConnection conn) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getErrorStream(), StandardCharsets.UTF_8))) {
            StringBuilder errorResponse = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                errorResponse.append(line);
            }
            return errorResponse.toString();
        } catch (IOException e) {
            return null;
        }
    }
}
