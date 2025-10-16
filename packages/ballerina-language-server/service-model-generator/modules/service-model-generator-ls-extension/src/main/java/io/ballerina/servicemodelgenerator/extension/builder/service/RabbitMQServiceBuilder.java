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

package io.ballerina.servicemodelgenerator.extension.builder.service;

import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.RecordFieldNode;
import io.ballerina.compiler.syntax.tree.RecordTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.openapi.core.generators.common.exception.BallerinaOpenApiException;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.util.Constants;
import io.ballerina.servicemodelgenerator.extension.util.ListenerUtil;
import org.ballerinalang.formatter.core.FormatterException;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_CONFIGURE_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_EXISTING_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.PROPERTY_BASE_PATH;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.RABBITMQ;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_CHOICE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_FORM;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_SINGLE_SELECT;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.applyEnabledChoiceProperty;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getFunctionModel;

/**
 * Builder class for RabbitMQ service.
 *
 * @since 1.2.0
 */
public final class RabbitMQServiceBuilder extends AbstractServiceBuilder {

    private static final String ON_MESSAGE = "onMessage";
    private static final String ON_REQUEST = "onRequest";

    @Override
    public Service getModelFromSource(ModelFromSourceContext context) {
        Service service = super.getModelFromSource(context);
        filterRabbitMqFunctions(service.getFunctions());
        addDataBindingParam(service, ON_MESSAGE, context);
        return service;
    }

    @Override
    public Map<String, List<TextEdit>> addServiceInitSource(AddServiceInitModelContext context)
            throws WorkspaceDocumentException, FormatterException, IOException, BallerinaOpenApiException,
            EventSyncException {
        Map<String, Value> properties = context.serviceInitModel().getProperties();
        if (!properties.containsKey(KEY_CONFIGURE_LISTENER)) {
            return super.addServiceInitSource(context);
        }
        applyEnabledChoiceProperty(context.serviceInitModel(), KEY_CONFIGURE_LISTENER);
        ListenerDTO listenerDTO;
        if (properties.containsKey(KEY_EXISTING_LISTENER)) {
            listenerDTO = new ListenerDTO(RABBITMQ, properties.get(KEY_EXISTING_LISTENER).getValue(), "");
        } else {
            listenerDTO = buildListenerDTO(context);
        }
        return getServiceDeclarationEdits(context, listenerDTO);
    }

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        ServiceInitModel serviceInitModel = super.getServiceInitModel(context);
        Set<String> listeners = ListenerUtil.getCompatibleListeners(context.moduleName(),
                context.semanticModel(), context.project());
        if (!listeners.isEmpty()) {
            Map<String, Value> properties = serviceInitModel.getProperties();
            Value listenerVarNameProperty = properties.remove(KEY_LISTENER_VAR_NAME);
            Value host = properties.remove("host");
            Value port = properties.remove("port");
            Value basePath = properties.remove("basePath");
            Value createNewListenerChoice = buildCreateNewListenerChoice(listenerVarNameProperty, host, port);
            Value useExistingListenerChoice = buildUseExistingListenerChoice(listeners);

            Value choicesProperty = new Value.ValueBuilder()
                    .metadata("Use Existing Listener", "Use Existing Listener or Create New Listener")
                    .value(true)
                    .valueType(VALUE_TYPE_CHOICE)
                    .enabled(true)
                    .editable(true)
                    .setAdvanced(true)
                    .build();
            choicesProperty.setChoices(List.of(useExistingListenerChoice, createNewListenerChoice));
            properties.put(KEY_CONFIGURE_LISTENER, choicesProperty);
            properties.put(PROPERTY_BASE_PATH, basePath);
        }
        return serviceInitModel;
    }

    private Value buildCreateNewListenerChoice(Value listenerVarNameProperty, Value host, Value port) {
        Map<String, Value> newListenerProps = new LinkedHashMap<>();
        newListenerProps.put("host", host);
        newListenerProps.put("port", port);
        newListenerProps.put(KEY_LISTENER_VAR_NAME, listenerVarNameProperty);
        return new Value.ValueBuilder()
                .metadata("Create New Listener", "Create a new RabbitMQ listener")
                .value("true")
                .valueType(VALUE_TYPE_FORM)
                .enabled(false)
                .editable(false)
                .setAdvanced(false)
                .setProperties(newListenerProps)
                .build();
    }

    private Value buildUseExistingListenerChoice(Set<String> listeners) {
        Map<String, Value> existingListenerProps = new LinkedHashMap<>();
        List<String> items = listeners.stream().toList();
        List<Object> itemsAsObject = listeners.stream().map(item -> (Object) item).toList();
        Value existingListenerOptions = new Value.ValueBuilder()
                .metadata("Select Listener", "Select from the existing RabbitMQ listeners")
                .value(items.getFirst())
                .valueType(VALUE_TYPE_SINGLE_SELECT)
                .setItems(itemsAsObject)
                .enabled(true)
                .editable(true)
                .setAdvanced(false)
                .build();
        existingListenerProps.put(KEY_EXISTING_LISTENER, existingListenerOptions);

        return new Value.ValueBuilder()
                .metadata("Use Existing Listener", "Use Existing Listener")
                .value("true")
                .valueType(VALUE_TYPE_FORM)
                .enabled(false)
                .editable(false)
                .setAdvanced(false)
                .setProperties(existingListenerProps)
                .build();
    }

    /**
     * Filters the RabbitMQ service functions to ensure that only one of `onMessage` or `onRequest` is present.
     * If both are present, it retains the enabled one and removes the other.
     *
     * @param functions List of functions in the RabbitMQ service
     */
    private static void filterRabbitMqFunctions(List<Function> functions) {
        boolean hasOnMessage = false;
        boolean hasOnRequest = false;
        int onMessageIndex = -1;
        int onRequestIndex = -1;
        for (int i = 0; i < functions.size(); i++) {
            Function function = functions.get(i);
            String functionName = function.getName().getValue();
            if (functionName.equals(ON_MESSAGE)) {
                hasOnMessage = function.isEnabled();
                onMessageIndex = i;
            } else if (functionName.equals(ON_REQUEST)) {
                hasOnRequest = function.isEnabled();
                onRequestIndex = i;
            }
        }
        if (hasOnMessage) {
            functions.remove(onRequestIndex);
        } else if (hasOnRequest) {
            functions.remove(onMessageIndex);
        }
    }

    /**
     * Extracts the data binding type from a RecordTypeDescriptorNode.
     * For a parameter like "record {*rabbitmq:AnydataMessage; Order content;}" this extracts "Order".
     *
     * @param functionNode The FunctionDefinitionNode from source
     * @param paramName    The parameter name to search for
     * @return The extracted data binding type, or null if not found
     */
    private String extractDataBindingType(FunctionDefinitionNode functionNode, String paramName) {
        return functionNode.functionSignature().parameters().stream()
                .filter(paramNode -> paramNode instanceof io.ballerina.compiler.syntax.tree.RequiredParameterNode)
                .map(paramNode -> (io.ballerina.compiler.syntax.tree.RequiredParameterNode) paramNode)
                .filter(reqParam -> reqParam.paramName().isPresent() &&
                        reqParam.paramName().get().text().trim().equals(paramName))
                .findFirst()
                .flatMap(reqParam -> {
                    if (reqParam.typeName() instanceof RecordTypeDescriptorNode recordType) {
                        // Find the non-rest field in the record
                        for (Node field : recordType.fields()) {
                            if (field instanceof RecordFieldNode recordField) {
                                // Skip rest fields (those starting with *)
                                if (recordField.typeName().toString().trim().startsWith("*")) {
                                    continue;
                                }
                                // Extract the type name from the field
                                String fieldType = recordField.typeName().toString().trim();
                                return java.util.Optional.of(fieldType);
                            }
                        }
                    }
                    return java.util.Optional.empty();
                })
                .orElse(null);
    }

    /**
     * Adds a data binding parameter to the specified function in the list of functions.
     * This method checks if the function has a data binding parameter in the source code,
     * and adds it with the appropriate type and name information.
     *
     * @param functions    List of functions to search through
     * @param functionName Name of the function to add the data binding parameter to
     * @param context      ModelFromSourceContext to access the source node
     */
    private void addDataBindingParam(Service service, String functionName, ModelFromSourceContext context) {
        List<Function> functions = service.getFunctions();
        ServiceDeclarationNode serviceNode = (ServiceDeclarationNode) context.node();
        List<FunctionDefinitionNode> functionNodesInSource = serviceNode.members().stream()
                .filter(member -> member instanceof FunctionDefinitionNode)
                .map(member -> (FunctionDefinitionNode) member)
                .toList();

        List<Function> functionsInSource = functionNodesInSource.stream()
                .map(member -> getFunctionModel(member, Map.of()))
                .toList();

        // Find the target function in both lists
        Function targetFunction = null;
        Function sourceFunction = null;
        FunctionDefinitionNode sourceFunctionNode = null;

        for (Function function : functions) {
            if (function.getName().getValue().equals(functionName)) {
                targetFunction = function;
                break;
            }
        }

        for (int i = 0; i < functionsInSource.size(); i++) {
            Function function = functionsInSource.get(i);
            if (function.getName().getValue().equals(functionName)) {
                sourceFunction = function;
                sourceFunctionNode = functionNodesInSource.get(i);
                break;
            }
        }

        if (targetFunction == null) {
            return;
        }

        // Determine if DATA_BINDING should be enabled or disabled
        // DATA_BINDING is enabled when there's a data binding parameter in source (extracted type exists)
        // DATA_BINDING is disabled when the default/required parameter is enabled (no data binding in source)
        boolean dataBindingEnabled;
        String paramType = "";
        String paramName = "";

        if (sourceFunction != null && !sourceFunction.getParameters().isEmpty() && sourceFunctionNode != null) {
            // If there's a parameter in source, extract the data binding type and name
            Parameter sourceParam = sourceFunction.getParameters().getFirst();
            String fullParamType = sourceParam.getType().getValue();

            // Extract the data binding type from the record type descriptor
            // e.g., from "record {*rabbitmq:AnydataMessage; Order content;}" extract "Order"
            String dataBindingType = extractDataBindingType(sourceFunctionNode, sourceParam.getName().getValue());

            // If we successfully extracted a data binding type, it means data binding is being used
            if (dataBindingType != null) {
                dataBindingEnabled = true;
                paramType = dataBindingType;
            } else {
                // No data binding type found, DATA_BINDING should be disabled
                dataBindingEnabled = false;
                paramType = fullParamType;
            }
            paramName = sourceParam.getName().getValue();
        } else {
            // No parameter in source means the default parameter should be enabled
            // Therefore DATA_BINDING should be disabled
            dataBindingEnabled = false;
        }

        // Create the data binding parameter
        Value parameterType = new Value.ValueBuilder()
//                .setMetadata(new MetaData("Parameter Type", "The type of the parameter"))
                .valueType(Constants.VALUE_TYPE_TYPE)
                .value(paramType)
                .enabled(true)
                .editable(false)
                .build();

        Value parameterNameValue = new Value.ValueBuilder()
//                .setMetadata(new MetaData("Parameter Name", "The name of the parameter"))
                .valueType(Constants.VALUE_TYPE_IDENTIFIER)
                .value(paramName)
                .enabled(true)
                .editable(false)
                .build();

        Value parameterDefaultValue = new Value.ValueBuilder()
//                .setMetadata(new MetaData("Default Value", "The default value of the parameter"))
                .valueType(Constants.VALUE_TYPE_EXPRESSION)
                .enabled(true)
                .editable(true)
                .optional(true)
                .build();

        Parameter dataBindingParam = new Parameter.Builder()
                .metadata(new MetaData("Data Binding", "Data binding parameter"))
                .kind("DATA_BINDING")
                .type(parameterType)
                .name(parameterNameValue)
                .defaultValue(parameterDefaultValue)
                .enabled(dataBindingEnabled)
                .editable(true)
                .optional(false)
                .advanced(false)
                .httpParamType(null)
                .hidden(false)
                .build();

        targetFunction.addParameter(dataBindingParam);
        targetFunction.getCodedata().setModuleName(service.getModuleName());
    }

    @Override
    public String kind() {
        return RABBITMQ;
    }
}

