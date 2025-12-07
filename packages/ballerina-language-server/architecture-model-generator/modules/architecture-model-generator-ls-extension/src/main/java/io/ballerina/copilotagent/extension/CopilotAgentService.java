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

package io.ballerina.copilotagent.extension;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import io.ballerina.copilotagent.core.SemanticDiffComputer;
import io.ballerina.projects.Module;
import io.ballerina.projects.Package;
import io.ballerina.projects.Project;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManagerProxy;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment;
import org.eclipse.lsp4j.services.LanguageServer;

import java.nio.file.Path;
import java.util.concurrent.CompletableFuture;

@JavaSPIService("org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService")
@JsonSegment("copilotAgentService")
public class CopilotAgentService implements ExtendedLanguageServerService {

    private WorkspaceManager workspaceManager;
    private WorkspaceManager aiWorkspaceManager;

    @Override
    public void init(LanguageServer langServer,
                     WorkspaceManagerProxy workspaceManagerProxy,
                     LanguageServerContext serverContext) {
        this.workspaceManager = workspaceManagerProxy.get();
        this.aiWorkspaceManager = workspaceManagerProxy.get("ai://file.bal");
    }

    @Override
    public Class<?> getRemoteInterface() {
        return null;
    }

    @JsonRequest
    public CompletableFuture<JsonElement> getSemanticDiff(String projectPath) {
        return CompletableFuture.supplyAsync(() -> {
            Path path = Path.of(projectPath);
            Project originalProject;
            Project shadowProject;
            try {
                originalProject = this.workspaceManager.loadProject(path);
                shadowProject = this.aiWorkspaceManager.loadProject(path);

                SemanticDiffComputer diffComputer = new SemanticDiffComputer(
                        originalProject,
                        shadowProject,
                        this.workspaceManager,
                        this.aiWorkspaceManager
                );
                return new Gson().toJsonTree(diffComputer.computeSemanticDiffs());
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
    }
}
