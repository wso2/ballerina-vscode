/*
 *  Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.flowmodelgenerator.extension;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.flowmodelgenerator.core.DataMapManager;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperAddClausesRequest;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperAddElementRequest;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperFieldPositionRequest;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperModelRequest;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperQueryConvertRequest;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperSourceRequest;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperSubMappingRequest;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperTypesRequest;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperVisualizeRequest;
import io.ballerina.flowmodelgenerator.extension.response.DataMapperFieldPositionResponse;
import io.ballerina.flowmodelgenerator.extension.response.DataMapperModelResponse;
import io.ballerina.flowmodelgenerator.extension.response.DataMapperSourceResponse;
import io.ballerina.flowmodelgenerator.extension.response.DataMapperSubMappingResponse;
import io.ballerina.flowmodelgenerator.extension.response.DataMapperTypesResponse;
import io.ballerina.flowmodelgenerator.extension.response.DataMapperVisualizeResponse;
import io.ballerina.projects.Document;
import io.ballerina.projects.Project;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManagerProxy;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment;
import org.eclipse.lsp4j.services.LanguageServer;

import java.nio.file.Path;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@JavaSPIService("org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService")
@JsonSegment("dataMapper")
public class DataMapperService implements ExtendedLanguageServerService {

    private WorkspaceManager workspaceManager;

    @Override
    public void init(LanguageServer langServer, WorkspaceManagerProxy workspaceManagerProxy,
                     LanguageServerContext serverContext) {
        this.workspaceManager = workspaceManagerProxy.get();
    }

    @Override
    public Class<?> getRemoteInterface() {
        return null;
    }

    @JsonRequest
    public CompletableFuture<DataMapperTypesResponse> types(DataMapperTypesRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            DataMapperTypesResponse response = new DataMapperTypesResponse();
            try {
                Path filePath = Path.of(request.filePath());
                this.workspaceManager.loadProject(filePath);
                Optional<SemanticModel> semanticModel = this.workspaceManager.semanticModel(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                if (semanticModel.isEmpty() || document.isEmpty()) {
                    return response;
                }

                DataMapManager dataMapManager = new DataMapManager(document.get());
                response.setType(dataMapManager.getTypes(request.flowNode(), request.propertyKey(),
                        semanticModel.get()));
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }

    @JsonRequest
    public CompletableFuture<DataMapperModelResponse> mappings(DataMapperModelRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            DataMapperModelResponse response = new DataMapperModelResponse();
            try {
                Path filePath = Path.of(request.filePath());
                this.workspaceManager.loadProject(filePath);
                Optional<SemanticModel> semanticModel = this.workspaceManager.semanticModel(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                if (semanticModel.isEmpty() || document.isEmpty()) {
                    return response;
                }

                DataMapManager dataMapManager = new DataMapManager(document.get());
                response.setMappingsModel(dataMapManager.getMappings(semanticModel.get(), request.codedata(),
                        request.position(), request.propertyKey(), request.targetField()));
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }

    @JsonRequest
    public CompletableFuture<DataMapperSourceResponse> getSource(DataMapperSourceRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            DataMapperSourceResponse response = new DataMapperSourceResponse();
            try {
                Path filePath = Path.of(request.filePath());
                this.workspaceManager.loadProject(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                if (document.isEmpty()) {
                    return response;
                }

                DataMapManager dataMapManager = new DataMapManager(document.get());
                response.setTextEdits(dataMapManager.getSource(filePath, request.codedata(), request.mapping(),
                        request.targetField()));
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }

    @JsonRequest
    public CompletableFuture<DataMapperSourceResponse> addClauses(DataMapperAddClausesRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            DataMapperSourceResponse response = new DataMapperSourceResponse();
            try {
                Path filePath = Path.of(request.filePath());
                this.workspaceManager.loadProject(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                if (document.isEmpty()) {
                    return response;
                }

                DataMapManager dataMapManager = new DataMapManager(document.get());
                response.setTextEdits(dataMapManager.addClauses(filePath, request.codedata(), request.clause(),
                        request.index(), request.targetField()));
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }

    @JsonRequest
    public CompletableFuture<DataMapperSourceResponse> convertToQuery(DataMapperQueryConvertRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            DataMapperSourceResponse response = new DataMapperSourceResponse();
            try {
                Path filePath = Path.of(request.filePath());
                this.workspaceManager.loadProject(filePath);
                Optional<SemanticModel> semanticModel = this.workspaceManager.semanticModel(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                if (semanticModel.isEmpty() || document.isEmpty()) {
                    return response;
                }
                DataMapManager dataMapManager = new DataMapManager(document.get());
                response.setTextEdits(dataMapManager.getQuery(semanticModel.get(), request.codedata(),
                        request.targetField(), Path.of(request.filePath())));
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }

    @JsonRequest
    public CompletableFuture<DataMapperVisualizeResponse> visualizable(DataMapperVisualizeRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            DataMapperVisualizeResponse response = new DataMapperVisualizeResponse();
            try {
                Path filePath = Path.of(request.filePath());
                this.workspaceManager.loadProject(filePath);
                Optional<SemanticModel> semanticModel = this.workspaceManager.semanticModel(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                if (document.isEmpty() || semanticModel.isEmpty()) {
                    return response;
                }
                DataMapManager dataMapManager = new DataMapManager(document.get());
                response.setVisualizableProperties(
                        dataMapManager.getVisualizableProperties(semanticModel.get(), request.flowNode()));
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }

    @JsonRequest
    public CompletableFuture<DataMapperSourceResponse> addElement(DataMapperAddElementRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            DataMapperSourceResponse response = new DataMapperSourceResponse();
            try {
                Path filePath = Path.of(request.filePath());
                Project project = this.workspaceManager.loadProject(filePath);
                Optional<SemanticModel> semanticModel = this.workspaceManager.semanticModel(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                if (semanticModel.isEmpty() || document.isEmpty()) {
                    return response;
                }
                DataMapManager dataMapManager = new DataMapManager(document.get());
                response.setTextEdits(dataMapManager.addElement(semanticModel.get(), request.codedata(),
                        Path.of(request.filePath()), request.targetField()));
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }

    @JsonRequest
    public CompletableFuture<DataMapperFieldPositionResponse> fieldPosition(DataMapperFieldPositionRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            DataMapperFieldPositionResponse response = new DataMapperFieldPositionResponse();
            try {
                Path filePath = Path.of(request.filePath());
                this.workspaceManager.loadProject(filePath);
                Optional<SemanticModel> semanticModel = this.workspaceManager.semanticModel(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                if (semanticModel.isEmpty() || document.isEmpty()) {
                    return response;
                }
                DataMapManager dataMapManager = new DataMapManager(document.get());
                response.setField(dataMapManager.getFieldPosition(request.codedata(), request.targetField(),
                        request.fieldId(), Path.of(request.filePath())));
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }

    @JsonRequest
    public CompletableFuture<DataMapperSubMappingResponse> subMapping(DataMapperSubMappingRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            DataMapperSubMappingResponse response = new DataMapperSubMappingResponse();
            try {
                Path filePath = Path.of(request.filePath());
                this.workspaceManager.loadProject(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                if (document.isEmpty()) {
                    return response;
                }
                DataMapManager dataMapManager = new DataMapManager(document.get());
                response.setCodedata(dataMapManager.subMapping(request.codedata(), request.view()));
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }
}
