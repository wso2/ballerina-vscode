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

package io.ballerina.servicemodelgenerator.extension.builder.service;

import com.google.gson.Gson;
import com.google.gson.stream.JsonReader;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.ModuleMemberDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.openapi.core.generators.common.exception.BallerinaOpenApiException;
import io.ballerina.projects.Document;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Module;
import io.ballerina.projects.Project;
import io.ballerina.servicemodelgenerator.extension.core.OpenApiServiceGenerator;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.PropertyType;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.util.FTPFunctionModelUtil;
import io.ballerina.servicemodelgenerator.extension.util.FTPListenerUtil;
import io.ballerina.servicemodelgenerator.extension.util.ListenerUtil;
import io.ballerina.servicemodelgenerator.extension.util.Utils;
import org.ballerinalang.formatter.core.FormatterException;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_CONFIGURE_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_LISTENER_SELECTION;
import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.BALLERINA;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.CLOSE_BRACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.FTP;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.NEW_LINE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ON;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.OPEN_BRACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.PROPERTY_DESIGN_APPROACH;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.PROP_READONLY_METADATA_KEY;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SERVICE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SPACE;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.extractFunctionNodesFromSource;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.extractFunctionsFromSource;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getReadonlyMetadata;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.updateListenerItems;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.applyEnabledChoiceProperty;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getImportStmt;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.importExists;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.populateListenerInfo;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.updateAnnotationAttachmentProperty;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.updateServiceDocs;

/**
 * Builder class for FTP service.
 *
 * @since 1.5.0
 */
public class FTPServiceBuilder extends AbstractServiceBuilder {

    private static final String FTP_INIT_JSON = "services/ftp_init.json";
    private static final String FTP_SERVICE_JSON = "services/ftp_service.json";

    // Display label
    private static final String LABEL_FTP = "FTP";

    // Variable name prefix for FTP sources (produces ftpSource, ftpSource1, ftpSource2, ...)
    private static final String FTP_SOURCE_VAR_NAME = "ftpSource";

    public static final String EVENT = "EVENT";
    private static final String SERVICE_CONFIG = "ServiceConfig";

    /**
     * Router key used by {@code ServiceBuilderRouter} to bind FTP service operations to this builder.
     */
    @Override
    public String kind() {
        return "FTP";
    }

    /**
     * Invoked by {@code serviceDesign/getServiceInitModel} when the frontend opens the FTP service-creation flow.
     */
    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        InputStream resourceStream = FTPServiceBuilder.class.getClassLoader()
                .getResourceAsStream(FTP_INIT_JSON);
        if (resourceStream == null) {
            return null;
        }

        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            ServiceInitModel serviceInitModel = new Gson().fromJson(reader, ServiceInitModel.class);

            // Navigate into the pre-structured configureListener CHOICE
            Value configureListener = serviceInitModel.getProperties().get(KEY_CONFIGURE_LISTENER);
            Value createNewChoice = configureListener.getChoices().get(1);
            Value sourceConfig = createNewChoice.getProperties().get("sourceConfig");

            // Generate a unique source name using the "ftpSource" prefix
            String sourceName = Utils.generateVariableIdentifier(context.semanticModel(), context.document(),
                    context.document().syntaxTree().rootNode().lineRange().endLine(), FTP_SOURCE_VAR_NAME);
            sourceConfig.getProperties().get(KEY_LISTENER_VAR_NAME).setValue(sourceName);

            // Check for existing compatible FTP listeners (excluding legacy ones)
            Set<String> allListeners = ListenerUtil.getCompatibleListeners(context.moduleName(),
                    context.semanticModel(), context.project());
            Set<String> compatibleListeners = filterNonLegacyListeners(allListeners, context.semanticModel(),
                    context.project());

            if (!compatibleListeners.isEmpty()) {
                // Extract template metadata from designApproach for consistent labels
                Value designApproach = sourceConfig.getProperties().get(PROPERTY_DESIGN_APPROACH);
                Map<String, Value> templateProps = (designApproach != null
                        && designApproach.getChoices() != null && !designApproach.getChoices().isEmpty())
                        ? designApproach.getChoices().get(0).getProperties() : Map.of();

                // Extract actual configs from existing listener declarations
                Map<String, Map<String, Value>> listenerConfigs = FTPListenerUtil.extractListenerConfigs(
                        compatibleListeners, context.semanticModel(), context.project());
                applyInitModelMetadata(listenerConfigs, templateProps, designApproach);

                // Populate the "Use existing" choice
                Value existingChoice = configureListener.getChoices().get(0);
                existingChoice.setMetadata(new MetaData("Use existing",
                        "Select an existing " + LABEL_FTP + " source"));
                existingChoice.setEnabled(true);
                existingChoice.setEditable(true);

                // Build the SINGLE_SELECT dropdown and place it in the existing sourceConfig
                Value listenerDropdown = buildListenerDropdown(listenerConfigs, compatibleListeners);
                Map<String, Value> existingSourceProps = new LinkedHashMap<>();
                existingSourceProps.put(ServiceInitModel.KEY_EXISTING_LISTENER, listenerDropdown);
                existingChoice.getProperties().get("sourceConfig").setProperties(existingSourceProps);

                // Set "Use existing" as default selection
                configureListener.setValue("0");
                createNewChoice.setEnabled(false);
            }

            return serviceInitModel;
        } catch (IOException e) {
            return null;
        }
    }

    /**
     * Applies metadata from the init model template properties onto the extracted existing listener
     * configs so that labels and descriptions are consistent between "Create new" and
     * "Use existing" source views.
     *
     * @param configs         Extracted listener configs (listener name → property key → Value)
     * @param templateProps   Properties from the first designApproach choice in ftp_init.json
     * @param designApproach  The designApproach Value from the init model (used for protocol)
     */
    private static void applyInitModelMetadata(Map<String, Map<String, Value>> configs,
                                               Map<String, Value> templateProps,
                                               Value designApproach) {
        // Mapping from extracted config keys to init model property keys
        Map<String, String> keyMapping = Map.of(
                "host", "host",
                "portNumber", "portNumber",
                "authentication", "authentication",
                "secureSocket", "secureSocket"
        );

        // secureSocket metadata comes from the FTPS choice (index 2), not FTP (index 0)
        Map<String, Value> ftpsTemplateProps = (designApproach != null
                && designApproach.getChoices() != null && designApproach.getChoices().size() > 2)
                ? designApproach.getChoices().get(2).getProperties() : Map.of();

        for (Map<String, Value> config : configs.values()) {
            // Build protocol radio button from designApproach choices
            if (designApproach != null && config.containsKey("protocol")) {
                config.put("protocol", buildProtocolFromDesignApproach(
                        designApproach, config.get("protocol").getValue()));
            }

            // Apply metadata from template properties
            for (Map.Entry<String, String> mapping : keyMapping.entrySet()) {
                Value configValue = config.get(mapping.getKey());
                // Use FTPS template props for secureSocket, default template for others
                Map<String, Value> sourceProps = "secureSocket".equals(mapping.getKey())
                        ? ftpsTemplateProps : templateProps;
                Value templateValue = sourceProps.get(mapping.getValue());
                if (configValue != null && templateValue != null && templateValue.getMetadata() != null) {
                    configValue.setMetadata(templateValue.getMetadata());
                }
            }

            // Reorder config to desired display order: protocol, host, portNumber, authentication, secureSocket
            List<String> displayOrder = List.of("protocol", "host", "portNumber", "authentication", "secureSocket");
            LinkedHashMap<String, Value> ordered = new LinkedHashMap<>();
            for (String key : displayOrder) {
                if (config.containsKey(key)) {
                    ordered.put(key, config.remove(key));
                }
            }
            // Append any remaining keys not in the display order
            ordered.putAll(config);
            config.clear();
            config.putAll(ordered);
        }
    }

    /**
     * Builds a read-only CHOICE (radio button) protocol Value from the designApproach choices in the
     * init model, so the options are derived from the model rather than hardcoded.
     */
    private static Value buildProtocolFromDesignApproach(Value designApproach, String selectedValue) {
        List<Value> choices = new ArrayList<>();
        if (designApproach.getChoices() != null) {
            for (Value choice : designApproach.getChoices()) {
                MetaData choiceMeta = choice.getMetadata();
                if (choiceMeta != null) {
                    String choiceValue = choice.getValue();
                    choices.add(new Value.ValueBuilder()
                            .metadata(choiceMeta.label(), "")
                            .value(choiceValue)
                            .types(List.of(PropertyType.types(Value.FieldType.FORM)))
                            .enabled(choiceValue.equals(selectedValue))
                            .editable(false)
                            .setAdvanced(false)
                            .build());
                }
            }
        }

        Value protocol = new Value.ValueBuilder()
                .setMetadata(designApproach.getMetadata())
                .value(selectedValue)
                .types(List.of(PropertyType.types(Value.FieldType.CHOICE)))
                .enabled(true)
                .editable(false)
                .setAdvanced(false)
                .build();
        protocol.setChoices(choices);
        return protocol;
    }

    /**
     * Builds a SINGLE_SELECT dropdown for selecting an existing listener.
     * Each listener's configuration is stored as nested properties keyed by listener name,
     * so the frontend can show read-only config when a listener is selected.
     */
    private static Value buildListenerDropdown(Map<String, Map<String, Value>> listenerConfigs,
                                                Set<String> listeners) {
        List<String> listenerNames = new ArrayList<>(listeners);

        Map<String, Value> perListenerConfigs = new LinkedHashMap<>();
        for (String listenerName : listenerNames) {
            Map<String, Value> config = listenerConfigs.getOrDefault(listenerName, new LinkedHashMap<>());

            // Make all config properties read-only
            Map<String, Value> readOnlyConfig = new LinkedHashMap<>();
            for (Map.Entry<String, Value> entry : config.entrySet()) {
                entry.getValue().setEditable(false);
                readOnlyConfig.put(entry.getKey(), entry.getValue());
            }

            Value configGroup = new Value.ValueBuilder()
                    .metadata(listenerName, LABEL_FTP + " source: " + listenerName)
                    .value(listenerName)
                    .types(List.of(PropertyType.types(Value.FieldType.FORM)))
                    .enabled(true)
                    .editable(false)
                    .setProperties(readOnlyConfig)
                    .build();
            perListenerConfigs.put(listenerName, configGroup);
        }

        return new Value.ValueBuilder()
                .metadata("Source Name", "Select an existing " + LABEL_FTP + " source")
                .value(listenerNames.get(0))
                .types(List.of(PropertyType.types(Value.FieldType.SINGLE_SELECT)))
                .enabled(true)
                .editable(true)
                .setItems(new ArrayList<Object>(listenerNames))
                .setProperties(perListenerConfigs)
                .build();
    }

    /**
     * Invoked by {@code serviceDesign/addServiceAndListener} when the frontend creates a new FTP service.
     */
    @Override
    public Map<String, List<TextEdit>> addServiceInitSource(AddServiceInitModelContext context)
            throws WorkspaceDocumentException, FormatterException, IOException, BallerinaOpenApiException,
            EventSyncException {
        ServiceInitModel serviceInitModel = context.serviceInitModel();

        Map<String, Value> properties = serviceInitModel.getProperties();

        // Apply the configure listener choice (always present now)
        if (properties.containsKey(KEY_CONFIGURE_LISTENER)) {
            applyEnabledChoiceProperty(serviceInitModel, KEY_CONFIGURE_LISTENER);
        }

        properties = serviceInitModel.getProperties();

        // Unwrap GROUP_SECTION properties to top level so downstream code can access them directly
        for (String key : List.copyOf(properties.keySet())) {
            Value val = properties.get(key);
            if (val != null && val.getTypes() != null
                    && val.getTypes().stream().anyMatch(t -> t.fieldType() == Value.FieldType.GROUP_SECTION)
                    && val.getProperties() != null) {
                properties.putAll(val.getProperties());
                properties.remove(key);
            }
        }

        // Determine if "Use existing" source was selected.
        // The existingListener SINGLE_SELECT value contains the listener name.
        boolean useExistingListener = false;
        String existingListenerName = null;
        if (properties.containsKey(ServiceInitModel.KEY_EXISTING_LISTENER)) {
            Value existingListenerValue = properties.get(ServiceInitModel.KEY_EXISTING_LISTENER);
            if (existingListenerValue != null && existingListenerValue.getValue() != null) {
                existingListenerName = String.valueOf(existingListenerValue.getValue());
                useExistingListener = !existingListenerName.isEmpty();
            }
            properties.remove(ServiceInitModel.KEY_EXISTING_LISTENER);
        }
        // Backward compatibility: also check the old-style nested CHOICE via listenerSelection
        if (!useExistingListener && properties.containsKey(KEY_LISTENER_SELECTION)) {
            Value listenerSelection = properties.get(KEY_LISTENER_SELECTION);
            if (listenerSelection != null && listenerSelection.getChoices() != null) {
                for (Value choice : listenerSelection.getChoices()) {
                    if (choice.isEnabled()) {
                        existingListenerName = String.valueOf(choice.getValue());
                        useExistingListener = true;
                        break;
                    }
                }
            }
            properties.remove(KEY_LISTENER_SELECTION);
        }
        if (!useExistingListener && ListenerUtil.shouldUseExistingListener(properties)) {
            useExistingListener = true;
            existingListenerName = ListenerUtil.getExistingListenerName(properties).orElse("");
        }

        // path is a service-level property (in @ftp:ServiceConfig annotation).
        // Keep backward compatibility with legacy payloads that still send `folderPath`.
        String folderPath = getPropertyValueLiteralValue(properties, "path",
                getPropertyValueLiteralValue(properties, "folderPath", "\"/\""));

        String listenerVarName;
        String listenerDeclaration = "";

        if (useExistingListener) {
            listenerVarName = existingListenerName;
        } else {
            // "Create new" source was selected - get the protocol and build the listener declaration
            String selectedProtocol = getEnabledChoiceValue(serviceInitModel, PROPERTY_DESIGN_APPROACH);
            applyEnabledChoiceProperty(serviceInitModel, PROPERTY_DESIGN_APPROACH);
            properties = serviceInitModel.getProperties();

            listenerVarName = properties.get("listenerVarName").getValue();
            String host = getPropertyValueLiteralValue(properties, "host", "\"127.0.0.1\"");
            String port = getPropertyValue(properties, "portNumber", "21");

            applyEnabledChoiceProperty(serviceInitModel, "authentication");
            properties = serviceInitModel.getProperties();
            String username = getPropertyValue(properties, "userName", "");
            String password = getPropertyValue(properties, "password", "");
            String privateKey = getPropertyValueLiteralValue(properties, "privateKey", "");
            String secureSocket = getPropertyValueLiteralValue(properties, "secureSocket", "");

            // Build the listener declaration
            StringBuilder listenerBuilder = new StringBuilder();
            listenerBuilder.append("listener ftp:Listener ").append(listenerVarName).append(" = new(");
            listenerBuilder.append("protocol= ftp:").append(selectedProtocol).append(", ");
            listenerBuilder.append("host=").append(host).append(", ");

            // Add authentication configuration if any auth details are provided
            if (!username.isEmpty() || !password.isEmpty() || !privateKey.isEmpty() || !secureSocket.isEmpty()) {
                listenerBuilder.append("auth= { ");

                if (!username.isEmpty() || !password.isEmpty()) {
                    listenerBuilder.append("credentials: { ");
                    if (!username.isEmpty()) {
                        listenerBuilder.append("username: ").append(username);
                        if (!password.isEmpty()) {
                            listenerBuilder.append(", ");
                        }
                    }
                    if (!password.isEmpty()) {
                        listenerBuilder.append("password: ").append(password).append(" ");
                    }
                    listenerBuilder.append("}");

                    if (!privateKey.isEmpty() || !secureSocket.isEmpty()) {
                        listenerBuilder.append(", ");
                    } else {
                        listenerBuilder.append(" ");
                    }
                }

                if (!privateKey.isEmpty()) {
                    listenerBuilder.append("privateKey: ");
                    listenerBuilder.append(privateKey);

                    if (!secureSocket.isEmpty()) {
                        listenerBuilder.append(", ");
                    } else {
                        listenerBuilder.append(" ");
                    }
                }

                if (!secureSocket.isEmpty()) {
                    listenerBuilder.append("secureSocket: ").append(secureSocket).append(" ");
                }
                listenerBuilder.append("}, ");
            }

            listenerBuilder.append("port= ").append(port);
            listenerBuilder.append(");");
            listenerDeclaration = listenerBuilder.toString();
        }

        if (Objects.nonNull(serviceInitModel.getOpenAPISpec())) {
            return new OpenApiServiceGenerator(Path.of(serviceInitModel.getOpenAPISpec().getValue()),
                    context.project().sourceRoot(), context.workspaceManager())
                    .generateService(serviceInitModel, listenerVarName, listenerDeclaration);
        }

        ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();

        // Service-level annotation for monitoring path
        String serviceConfigAnnotation = "@ftp:ServiceConfig {" + NEW_LINE +
                "    path: " + folderPath + NEW_LINE +
                "}" + NEW_LINE;

        String serviceCode;
        if (useExistingListener) {
            // When using an existing listener, don't include listener declaration
            serviceCode = NEW_LINE +
                    serviceConfigAnnotation +
                    SERVICE + SPACE + ON + SPACE + listenerVarName + SPACE + OPEN_BRACE +
                    NEW_LINE +
                    CLOSE_BRACE + NEW_LINE;
        } else {
            serviceCode = NEW_LINE +
                    listenerDeclaration +
                    NEW_LINE +
                    NEW_LINE +
                    serviceConfigAnnotation +
                    SERVICE + SPACE + ON + SPACE + listenerVarName + SPACE + OPEN_BRACE +
                    NEW_LINE +
                    CLOSE_BRACE + NEW_LINE;
        }

        List<TextEdit> edits = new ArrayList<>();
        if (!importExists(modulePartNode, serviceInitModel.getOrgName(), serviceInitModel.getModuleName())) {
            String importText = getImportStmt(serviceInitModel.getOrgName(), serviceInitModel.getModuleName());
            edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().startLine()), importText));
        }
        edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().endLine()), serviceCode));

        return Map.of(context.filePath(), edits);
    }

    /**
     * Invoked by {@code serviceDesign/getServiceFromSource} to load the FTP service model and all handler metadata.
     */
    @Override
    public Service getModelFromSource(ModelFromSourceContext context) {
        Optional<Service> service = getModelTemplate(GetModelContext.fromServiceAndFunctionType(BALLERINA, FTP));
        if (service.isEmpty()) {
            return null;
        }

        Service serviceModel = service.get();
        ServiceDeclarationNode serviceNode = (ServiceDeclarationNode) context.node();
        SemanticModel semanticModel = context.semanticModel();
        Map<String, FunctionDefinitionNode> functionNodes = new HashMap<>();
        for (FunctionDefinitionNode functionNode : extractFunctionNodesFromSource(serviceNode)) {
            functionNodes.put(functionNode.functionName().text().trim(), functionNode);
        }
        Codedata codedata = new Codedata.Builder()
                .setLineRange(serviceNode.lineRange())
                .setOrgName(context.orgName())
                .setPackageName(context.packageName())
                .setModuleName(context.moduleName())
                .build();
        serviceModel.setCodedata(codedata);

        List<Function> functionsInSource = extractFunctionsFromSource(serviceNode);
        Map<String, Function> functionMap = new HashMap<>();
        for (Function function : serviceModel.getFunctions()) {
            if (function.getName() != null && function.getName().getValue() != null) {
                functionMap.put(function.getName().getValue(), function);
            }
        }

        if (serviceModel.getFunctions() != null) {
            for (Function sourceFunc : functionsInSource) {
                if (sourceFunc.isEnabled() && sourceFunc.getName() != null) {
                    String sourceFuncName = sourceFunc.getName().getValue();
                    Function modelFunc = functionMap.get(sourceFuncName);
                    if (modelFunc != null) {
                        modelFunc.setEnabled(true);
                        modelFunc.setCodedata(sourceFunc.getCodedata());
                        modelFunc.getCodedata().setModuleName(FTP);

                        FTPFunctionModelUtil.syncFunctionFromSource(sourceFunc, modelFunc);
                        FunctionDefinitionNode functionNode = functionNodes.get(sourceFuncName);
                        if (functionNode != null) {
                            FTPFunctionModelUtil.populatePostProcessActionsFromAnnotation(functionNode, modelFunc,
                                    semanticModel, true);
                        }
                    } else {
                        // Handle deprecated file handlers
                        sourceFunc.setEnabled(true);
                        sourceFunc.setOptional(true);
                        sourceFunc.setEditable(false);
                        MetaData sourceMetadata = sourceFunc.getMetadata();
                        String description = sourceMetadata != null ? sourceMetadata.description() : null;
                        sourceFunc.setMetadata(new MetaData(EVENT, description));
                        serviceModel.addFunction(sourceFunc);
                    }
                }
            }
        }

        if (serviceModel.getProperty(PROP_READONLY_METADATA_KEY) == null) {
            String serviceType = serviceModel.getType();
            Value readOnlyMetadata = getReadonlyMetadata(serviceModel.getOrgName(), serviceModel.getPackageName(),
                    serviceType);
            serviceModel.getProperties().put(PROP_READONLY_METADATA_KEY, readOnlyMetadata);
        }

        updateReadOnlyMetadataWithAnnotations(serviceModel, serviceNode, context);
        populateListenerInfo(serviceModel, serviceNode);
        updateServiceDocs(serviceNode, serviceModel);

        boolean hasServiceConfig = hasServiceConfigAnnotation(serviceNode, semanticModel);
        if (hasServiceConfig) {
            updateAnnotationAttachmentProperty(serviceNode, serviceModel);
        } else {
            // Legacy listener-based configuration should continue to expose listener params,
            // without showing the new service-level ServiceConfig annotation editor.
            serviceModel.getProperties().remove("annotServiceConfig");
        }

        updateListenerItems(FTP, semanticModel, context.project(), serviceModel);
        return serviceModel;
    }

    /**
     * Used by the router/template lookup path for FTP service defaults before source extraction and creation flows.
     */
    @Override
    public Optional<Service> getModelTemplate(GetModelContext context) {
        InputStream resourceStream = HttpServiceBuilder.class.getClassLoader()
                .getResourceAsStream(FTP_SERVICE_JSON);
        if (resourceStream == null) {
            return Optional.empty();
        }

        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            Service service = new Gson().fromJson(reader, Service.class);
            return Optional.of(service);
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    /**
     * Helper method to get property value with default fallback.
     */
    private String getPropertyValue(Map<String, Value> properties, String key, String defaultValue) {
        Value property = properties.get(key);
        if (property != null && property.getValue() != null && !property.getValue().isEmpty()) {
            return property.getValue();
        }
        return defaultValue;
    }

    /**
     * Helper method to get property literal value with default fallback.
     */
    private String getPropertyValueLiteralValue(Map<String, Value> properties, String key, String defaultValue) {
        Value property = properties.get(key);
        if (property == null) {
            return defaultValue;
        }

        String value;
        if (property.getTypes() == null || property.getTypes().isEmpty()) {
            value = property.getLiteralValue();
        } else {
            Value.FieldType selectedType = property.getTypes().stream()
                    .filter(type -> type.selected())
                    .findFirst()
                    .map(type -> type.fieldType())
                    .orElse(property.getTypes().getFirst().fieldType());
            value = selectedType == Value.FieldType.TEXT ? property.getLiteralValue() : property.getValue();
        }

        if (value != null && !value.isEmpty()) {
            return value;
        }
        return defaultValue;
    }

    /**
     * Helper method to get the enabled choice value.
     */
    private String getEnabledChoiceValue(ServiceInitModel serviceInitModel, String propertyKey) {
        Value property = serviceInitModel.getProperties().get(propertyKey);
        if (property == null || property.getChoices() == null) {
            return "FTP";
        }

        for (Value choice : property.getChoices()) {
            if (choice.isEnabled()) {
                return choice.getValue();
            }
        }
        return "FTP";
    }

    /**
     * Filters out legacy FTP listeners from the given set.
     * A listener is considered legacy if it has services attached that don't use the new
     * {@code @ftp:ServiceConfig} annotation pattern.
     *
     * @param listeners     Set of listener variable names
     * @param semanticModel Semantic model for symbol resolution
     * @param project       Project for accessing documents
     * @return Set of non-legacy listener names
     */
    private Set<String> filterNonLegacyListeners(Set<String> listeners, SemanticModel semanticModel, Project project) {
        Set<String> nonLegacyListeners = new LinkedHashSet<>();

        for (String listenerName : listeners) {
            if (isListenerCompatibleWithNewPattern(listenerName, semanticModel, project)) {
                nonLegacyListeners.add(listenerName);
            }
        }

        return nonLegacyListeners;
    }

    /**
     * Checks if a listener is compatible with the new service pattern.
     * A listener is compatible if:
     * 1. It has no services attached to it, OR
     * 2. All services attached to it use the {@code @ftp:ServiceConfig} annotation
     *
     * @param listenerName  Name of the listener variable
     * @param semanticModel Semantic model for symbol resolution
     * @param project       Project for accessing documents
     * @return true if the listener is compatible with the new pattern
     */
    private boolean isListenerCompatibleWithNewPattern(String listenerName, SemanticModel semanticModel,
                                                       Project project) {
        // Find the listener symbol
        Optional<VariableSymbol> listenerSymbol = findListenerSymbol(listenerName, semanticModel);
        if (listenerSymbol.isEmpty()) {
            return true; // If we can't find it, assume it's compatible
        }

        // Check all services in the project for ones attached to this listener
        Module defaultModule = project.currentPackage().getDefaultModule();
        for (DocumentId documentId : defaultModule.documentIds()) {
            Document document = defaultModule.document(documentId);
            ModulePartNode modulePartNode = document.syntaxTree().rootNode();

            for (ModuleMemberDeclarationNode member : modulePartNode.members()) {
                if (member.kind() != SyntaxKind.SERVICE_DECLARATION) {
                    continue;
                }

                ServiceDeclarationNode serviceNode = (ServiceDeclarationNode) member;
                if (FTPListenerUtil.isServiceAttachedToListener(serviceNode, listenerName)) {
                    // Check if this service uses the new pattern (has @ftp:ServiceConfig annotation)
                    if (!hasServiceConfigAnnotation(serviceNode, semanticModel)) {
                        return false; // Legacy service found
                    }
                }
            }
        }

        return true; // No legacy services found
    }

    /**
     * Finds a listener symbol by its variable name.
     */
    private Optional<VariableSymbol> findListenerSymbol(String listenerName, SemanticModel semanticModel) {
        for (Symbol moduleSymbol : semanticModel.moduleSymbols()) {
            if (!(moduleSymbol instanceof VariableSymbol variableSymbol)
                    || !variableSymbol.qualifiers().contains(Qualifier.LISTENER)) {
                continue;
            }
            Optional<ModuleSymbol> module = variableSymbol.typeDescriptor().getModule();
            if (module.isEmpty() || !module.get().id().moduleName().equals(FTP)) {
                continue;
            }
            if (variableSymbol.getName().isPresent() && variableSymbol.getName().get().equals(listenerName)) {
                return Optional.of(variableSymbol);
            }
        }
        return Optional.empty();
    }

    /**
     * Checks if a service has the @ftp:ServiceConfig annotation.
     */
    private boolean hasServiceConfigAnnotation(ServiceDeclarationNode serviceNode, SemanticModel semanticModel) {
        if (serviceNode.metadata().isEmpty()) {
            return false;
        }
        return FTPFunctionModelUtil.findFtpAnnotation(serviceNode.metadata().get().annotations(), SERVICE_CONFIG,
                semanticModel).isPresent();
    }
}
