/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;

/**
 * Manages the {@code _agent_chat.bal} file in the user's project for agent chat testing. Adds chat service blocks to
 * the file — one service per agent, all sharing a single listener.
 *
 * @since 1.7.0
 */
public class AgentChatServiceGenerator {

    private static final String AGENT_CHAT_FILE = "_agent_chat.bal";

    private static final String FILE_HEADER = """
            // AUTO-GENERATED — Agent chat services for testing and debugging.
            // This file should NOT be deployed to production.
            // Safe to delete when you're done testing.
            
            import ballerina/ai;
            import ballerina/http;
            
            listener ai:Listener agentChatListener = new (listenOn = check http:getDefaultListener());
            """;

    private static final String RESOURCE_FUNCTION_MARKER = "resource function post chat(";

    /**
     * Result of adding an agent chat service.
     *
     * @param endpointPath  the HTTP path for the agent's chat endpoint
     * @param alreadyExists true if a service block with this name already exists
     * @param filePath      absolute path to the _agent_chat.bal file
     * @param startLine     0-based start line of the chat resource function
     * @param startColumn   0-based start column of the chat resource function
     * @param endLine       0-based end line of the chat resource function
     * @param endColumn     0-based end column of the chat resource function
     */
    public record AgentChatResult(String endpointPath, boolean alreadyExists,
                                  String filePath,
                                  int startLine, int startColumn,
                                  int endLine, int endColumn) {
    }

    /**
     * Adds an agent chat service block to {@code _agent_chat.bal} in the project root. If the file does not exist, it
     * is created with the shared imports and listener. If a service block with the given name already exists, no
     * changes are made.
     *
     * @param agentVariableName the agent variable name (used in the agent.run() call)
     * @param serviceName       user-chosen name for the service path segment
     * @param projectRoot       root path of the source project
     * @return the result containing the endpoint path, resource function position, and whether the service already
     * existed
     * @throws IOException if file operations fail
     */
    public AgentChatResult addAgentService(String agentVariableName, String serviceName,
                                           Path projectRoot) throws IOException {
        Path chatFile = projectRoot.resolve(AGENT_CHAT_FILE);
        String absolutePath = chatFile.toAbsolutePath().toString();
        String endpointPath = "/agent\\-chat/" + serviceName + "/chat";
        String serviceMarker = "service /agent\\-chat/" + serviceName + " on";

        if (Files.exists(chatFile)) {
            String existingContent = Files.readString(chatFile, StandardCharsets.UTF_8);

            // Check if this service name already exists
            if (existingContent.contains(serviceMarker)) {
                int[] position = findResourceFunctionPosition(existingContent, serviceMarker);
                return new AgentChatResult(endpointPath, true, absolutePath,
                        position[0], position[1], position[2], position[3]);
            }

            // Append new service block to existing file
            String serviceBlock = generateServiceBlock(agentVariableName, serviceName);
            String newContent = existingContent + System.lineSeparator() + serviceBlock;
            Files.writeString(chatFile, newContent, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);

            int[] position = findResourceFunctionPosition(newContent, serviceMarker);
            return new AgentChatResult(endpointPath, false, absolutePath,
                    position[0], position[1], position[2], position[3]);
        } else {
            // Create new file with header and first service block
            String content = FILE_HEADER + System.lineSeparator()
                    + generateServiceBlock(agentVariableName, serviceName);
            Files.writeString(chatFile, content, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

            int[] position = findResourceFunctionPosition(content, serviceMarker);
            return new AgentChatResult(endpointPath, false, absolutePath,
                    position[0], position[1], position[2], position[3]);
        }
    }

    /**
     * Finds the 0-based position of the resource function inside a service block. Locates the service by its marker,
     * then finds "resource function post chat(" within it and returns its start/end position.
     *
     * @return int[4]: {startLine, startColumn, endLine, endColumn}
     */
    private int[] findResourceFunctionPosition(String content, String serviceMarker) {
        List<String> lines = content.lines().toList();
        boolean inService = false;
        int startLine = -1;
        int startColumn = 0;
        int braceCount = 0;
        boolean inResourceFunction = false;

        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);

            if (!inService && line.contains(serviceMarker)) {
                inService = true;
            }

            if (!inService) {
                continue;
            }

            if (!inResourceFunction && line.contains(RESOURCE_FUNCTION_MARKER)) {
                startLine = i;
                startColumn = line.indexOf("resource");
                inResourceFunction = true;
            }

            if (inResourceFunction) {
                for (int j = 0; j < line.length(); j++) {
                    char c = line.charAt(j);
                    if (c == '{') {
                        braceCount++;
                    } else if (c == '}') {
                        braceCount--;
                        if (braceCount == 0) {
                            return new int[]{startLine, startColumn, i, j + 1};
                        }
                    }
                }
            }
        }

        // Fallback
        return new int[]{
                Math.max(startLine, 0), startColumn,
                lines.size() - 1, lines.isEmpty() ? 0 : lines.getLast().length()
        };
    }

    private String generateServiceBlock(String agentVarName, String serviceName) {
        return String.format(
                "service /agent\\-chat/%s on agentChatListener {%s" +
                        "    resource function post chat(@http:Payload ai:ChatReqMessage request) " +
                        "returns ai:ChatRespMessage|error {%s" +
                        "        string stringResult = check %s.run(request.message, request.sessionId);%s" +
                        "        return {message: stringResult};%s" +
                        "    }%s" +
                        "}%s",
                serviceName, System.lineSeparator(),
                System.lineSeparator(),
                agentVarName, System.lineSeparator(),
                System.lineSeparator(),
                System.lineSeparator(),
                System.lineSeparator()
        );
    }
}
