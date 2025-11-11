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

package io.ballerina.edi.extension;

import com.google.gson.JsonElement;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.LSClientLogger;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment;
import org.eclipse.lsp4j.services.LanguageServer;

import java.nio.file.Path;
import java.util.concurrent.CompletableFuture;

/**
 * The extended service for the EDI to Ballerina type converter LS extension endpoint.
 *
 * @since 1.4.0
 */
@JavaSPIService("org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService")
@JsonSegment("ediService")
public class EDIConverterService implements ExtendedLanguageServerService {
    private WorkspaceManager workspaceManager;
    private LSClientLogger lsClientLogger;

    @Override
    public void init(LanguageServer langServer, WorkspaceManager workspaceManager,
                     LanguageServerContext serverContext) {
        this.workspaceManager = workspaceManager;
        this.lsClientLogger = LSClientLogger.getInstance(serverContext);
    }

    @Override
    public Class<?> getRemoteInterface() {
        return getClass();
    }

    /**
     * Generate Ballerina types and functions from an EDI schema (X12 XSD) and append them to the specified files.
     *
     * @param request The EDI converter request containing the schema content and project filepath information
     * @return CompletableFuture containing the response with text edits or error information
     */
    @JsonRequest
    public CompletableFuture<EDIConverterResponse> generateTypesFromEDI(EDIConverterRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            EDIConverterResponse response = new EDIConverterResponse();
            try {
                if (request.getSchemaContent() == null || request.getSchemaContent().isEmpty()) {
                    response.setError("EDI schema content cannot be null or empty");
                    return response;
                }

                if (request.getProjectPath() == null || request.getProjectPath().isEmpty()) {
                    response.setError("Project path cannot be null or empty");
                    return response;
                }

                Path projectPath = Path.of(request.getProjectPath());
                this.workspaceManager.loadProject(projectPath);
                EDITypeGenerator generator = new EDITypeGenerator(
                        request.getSchemaContent(),
                        projectPath,
                        workspaceManager,
                        lsClientLogger
                );

                JsonElement textEdits = generator.generateTypes();
                response.setTextEdits(textEdits);
                response.setError(null);

            } catch (EDITypeGenerator.EDIGenerationException e) {
                response.setError(e.getMessage());
            } catch (Exception e) {
                String errorMessage = "An unexpected error occurred while generating types from EDI schema: " +
                        e.getMessage();
                response.setError(errorMessage);
            }

            return response;
        });
    }
}
