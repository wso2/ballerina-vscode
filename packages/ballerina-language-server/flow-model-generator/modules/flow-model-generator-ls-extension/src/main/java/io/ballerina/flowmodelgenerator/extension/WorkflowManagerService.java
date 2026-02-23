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

package io.ballerina.flowmodelgenerator.extension;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.FunctionTypeSymbol;
import io.ballerina.compiler.api.symbols.FutureTypeSymbol;
import io.ballerina.compiler.api.symbols.ParameterSymbol;
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.flowmodelgenerator.core.utils.WorkflowUtil;
import io.ballerina.flowmodelgenerator.extension.request.GetAllEventsRequest;
import io.ballerina.flowmodelgenerator.extension.response.GetAllEventsResponse;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.projects.Package;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment;
import org.eclipse.lsp4j.services.LanguageServer;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.EVENTS_SUFFIX;

/**
 * Service for managing workflow-related operations.
 *
 * @since 2.0.0
 */
@JavaSPIService("org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService")
@JsonSegment("workflowManager")
public class WorkflowManagerService implements ExtendedLanguageServerService {

    private WorkspaceManager workspaceManager;

    @Override
    public void init(LanguageServer langServer, WorkspaceManager workspaceManager) {
        this.workspaceManager = workspaceManager;
    }

    @Override
    public Class<?> getRemoteInterface() {
        return null;
    }

    /**
     * Gets all events defined for a given workflow function.
     * Events are retrieved from the events type parameter (third parameter) of the workflow process function.
     *
     * @param request The request containing file path and workflow name
     * @return Response containing array of event information
     */
    @JsonRequest
    public CompletableFuture<GetAllEventsResponse> getAllEvents(GetAllEventsRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            GetAllEventsResponse response = new GetAllEventsResponse();
            try {
                Path filePath = Path.of(request.filePath());
                this.workspaceManager.loadProject(filePath);

                Package currentPackage = PackageUtil.loadProject(workspaceManager, filePath).currentPackage();
                PackageUtil.getCompilation(currentPackage);

                JsonArray eventsArray = new JsonArray();

                // Search for the workflow function by name
                currentPackage.modules().forEach(module -> {
                    SemanticModel semanticModel = module.getCompilation().getSemanticModel();

                    // Find the function symbol matching the workflow function name
                    Optional<Symbol> functionSymbol = semanticModel.moduleSymbols().stream()
                            .filter(symbol -> symbol.kind() == SymbolKind.FUNCTION)
                            .filter(symbol -> symbol.getName().orElse("").equals(request.workflowName()))
                            .filter(symbol -> WorkflowUtil.isWorkflowFunction((FunctionSymbol) symbol))
                            .findFirst();

                    if (functionSymbol.isPresent() && functionSymbol.get() instanceof FunctionSymbol funcSymbol) {
                        // Get events from the function's events type (third parameter)
                        JsonArray events = getEventsFromWorkflowFunction(funcSymbol, semanticModel);
                        events.forEach(eventsArray::add);
                    }
                });

                response.setEvents(eventsArray);
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }

    /**
     * Gets events from a workflow function by analyzing its events type parameter.
     *
     * @param funcSymbol    The workflow function symbol
     * @param semanticModel The semantic model
     * @return JsonArray of event information
     */
    private JsonArray getEventsFromWorkflowFunction(FunctionSymbol funcSymbol, SemanticModel semanticModel) {
        JsonArray events = new JsonArray();

        FunctionTypeSymbol functionType = funcSymbol.typeDescriptor();
        Optional<List<ParameterSymbol>> params = functionType.params();

        if (params.isEmpty() || params.get().size() < 3) {
            // Try to find events type by convention: <FunctionName>Events
            String funcName = funcSymbol.getName().orElse("");
            String eventsTypeName = funcName.substring(0, 1).toUpperCase() + funcName.substring(1) + EVENTS_SUFFIX;

            Optional<Symbol> eventsTypeSymbol = semanticModel.moduleSymbols().stream()
                    .filter(symbol -> symbol.nameEquals(eventsTypeName))
                    .findFirst();

            if (eventsTypeSymbol.isPresent() && eventsTypeSymbol.get().kind() == SymbolKind.TYPE_DEFINITION) {
                TypeDefinitionSymbol typeDefSymbol = (TypeDefinitionSymbol) eventsTypeSymbol.get();
                return extractEventsFromRecordType(typeDefSymbol.typeDescriptor());
            }

            return events;
        }

        // Get the third parameter (events parameter)
        ParameterSymbol eventsParam = params.get().get(2);
        TypeSymbol eventsType = eventsParam.typeDescriptor();

        // Unwrap type reference
        if (eventsType.typeKind() == TypeDescKind.TYPE_REFERENCE) {
            TypeReferenceTypeSymbol typeRef = (TypeReferenceTypeSymbol) eventsType;
            eventsType = typeRef.typeDescriptor();
        }

        return extractEventsFromRecordType(eventsType);
    }

    /**
     * Extracts event information from a record type.
     * Each field in the record with type future<T> represents an event.
     *
     * @param eventsType The events record type
     * @return JsonArray of event information
     */
    private JsonArray extractEventsFromRecordType(TypeSymbol eventsType) {
        JsonArray events = new JsonArray();

        if (eventsType.typeKind() != TypeDescKind.RECORD) {
            return events;
        }

        RecordTypeSymbol recordType = (RecordTypeSymbol) eventsType;
        Map<String, RecordFieldSymbol> fields = recordType.fieldDescriptors();

        for (Map.Entry<String, RecordFieldSymbol> entry : fields.entrySet()) {
            String fieldName = entry.getKey();
            RecordFieldSymbol fieldSymbol = entry.getValue();
            TypeSymbol fieldType = fieldSymbol.typeDescriptor();

            // Extract the type from future<T>
            String eventDataType = extractTypeFromFuture(fieldType);

            JsonObject eventObj = new JsonObject();
            eventObj.addProperty("name", fieldName);
            eventObj.addProperty("type", eventDataType);
            events.add(eventObj);
        }

        return events;
    }

    /**
     * Extracts the inner type from a future<T> type.
     *
     * @param typeSymbol The future type symbol
     * @return The inner type name, or the original type signature if not a future
     */
    private String extractTypeFromFuture(TypeSymbol typeSymbol) {
        return ((FutureTypeSymbol) typeSymbol).typeParameter().get().getName().get();
    }
}
