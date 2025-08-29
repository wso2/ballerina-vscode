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

package io.ballerina.projectservice.extension;

import io.ballerina.projectservice.core.TibcoImporter;
import io.ballerina.projectservice.core.ToolExecutionResult;
import io.ballerina.projectservice.extension.request.ImportTibcoRequest;
import io.ballerina.projectservice.extension.response.ImportTibcoResponse;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.ballerinalang.langserver.commons.client.ExtendedLanguageClient;
import org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManagerProxy;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment;
import org.eclipse.lsp4j.services.LanguageServer;

import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;

/**
 * This service provides project-related functionalities.
 *
 * @since 1.2.0
 */
@JavaSPIService("org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService")
@JsonSegment("projectService")
public class ProjectService implements ExtendedLanguageServerService {

    public static final String CAPABILITY_NAME = "projectService";
    private LanguageServerContext context;

    @Override
    public void init(LanguageServer langServer,
                     WorkspaceManagerProxy workspaceManagerProxy,
                     LanguageServerContext serverContext) {
        this.context = serverContext;
    }

    @Override
    public Class<?> getRemoteInterface() {
        return null;
    }

    /**
     * Use a tibco project or file to import a Tibco project into the Ballerina project.
     *
     * @param request The request containing the details of the Tibco project to be imported.
     * @return A CompletableFuture that resolves to an ImportTibcoResponse.
     */
    @JsonRequest
    public CompletableFuture<ImportTibcoResponse> importTibco(ImportTibcoRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            ExtendedLanguageClient langClient = this.context.get(ExtendedLanguageClient.class);
            if (langClient == null) {
                return new ImportTibcoResponse("Language client not available", null, null, null);
            }
            Consumer<String> stateCallback = langClient::stateCallback;
            Consumer<String> logCallback = langClient::logCallback;
            ToolExecutionResult result = TibcoImporter.importTibco(request.orgName(), request.packageName(),
                    request.sourcePath(), stateCallback, logCallback);
            return ImportTibcoResponse.from(result);
        });
    }
}
