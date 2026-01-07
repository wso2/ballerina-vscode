/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package io.ballerina.servicemodelgenerator.extension.builder.service;

import com.google.gson.Gson;
import com.google.gson.stream.JsonReader;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.openapi.core.generators.common.exception.BallerinaOpenApiException;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.PropertyType;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_INCLUDED_DEFAULTABLE_FIELD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_INCLUDED_FIELD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_REQUIRED;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.AT;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.BALLERINAX;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.CLOSE_BRACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.COLON;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.DATA_BINDING;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.NEW_LINE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ON;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.OPEN_BRACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SERVICE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SERVICE_TYPE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SPACE;
import static io.ballerina.servicemodelgenerator.extension.util.DatabindUtil.extractParameterKinds;
import static io.ballerina.servicemodelgenerator.extension.util.DatabindUtil.restoreAndUpdateDataBindingParams;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.extractFunctionsFromSource;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getProtocol;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getImportStmt;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.importExists;

/**
 * Builder class for Microsoft SQL Server CDC service.
 *
 * @since 1.5.0
 */
public final class MssqlCdcServiceBuilder extends AbstractServiceBuilder {

    // Public field name constants (used in databinding)
    public static final String AFTER_ENTRY_FIELD = "afterEntry";
    public static final String BEFORE_ENTRY_FIELD = "beforeEntry";

    private static final String DATABINDING_PARAM_LABEL = "Database Entry";

    // Property keys and values
    private static final String DEFAULT_TYPE_TAB_PROPERTY = "defaultTypeTab";
    private static final String DEFAULT_TYPE_TAB_VALUE = "create-from-scratch";

    // Resource location
    private static final String CDC_MSSQL_SERVICE_MODEL_LOCATION = "services/cdc_mssql.json";

    // Module names
    private static final String CDC_MODULE_NAME = "cdc";
    private static final String MSSQL_CDC_DRIVER_MODULE_NAME = "mssql.cdc.driver";
    private static final String UNNAMED_IMPORT_SUFFIX = " as _";

    // Property keys
    private static final String KEY_LISTENER_VAR_NAME = "listenerVarName";
    private static final String KEY_HOST = "host";
    private static final String KEY_PORT = "port";
    private static final String KEY_USERNAME = "username";
    private static final String KEY_PASSWORD = "password";
    private static final String KEY_DATABASES = "databases";
    private static final String KEY_SCHEMAS = "schemas";
    private static final String KEY_DATABASE_INSTANCE = "databaseInstance";
    private static final String KEY_SECURE_SOCKET = "secureSocket";
    private static final String KEY_OPTIONS = "options";
    private static final String KEY_CONFIGURE_LISTENER = "configureListener";
    private static final String KEY_SELECT_LISTENER = "selectListener";
    private static final String KEY_TABLE = "table";
    private static final String KEY_DATABASE = "database";

    // Choice indices
    private static final int CHOICE_SELECT_EXISTING_LISTENER = 0;
    private static final int CHOICE_CONFIGURE_NEW_LISTENER = 1;

    // Type and annotation names
    private static final String TYPE_CDC_LISTENER = "CdcListener";
    private static final String ANNOTATION_CDC_SERVICE_CONFIG = "cdc:ServiceConfig";

    // Field names
    private static final String FIELD_TABLES = "tables: ";

    // Function names
    private static final String FUNCTION_ON_UPDATE = "onUpdate";

    // Argument types
    private static final String ARG_TYPE_DATABASE_CONFIG = "databaseConfig";

    // Listener field list
    private final List<String> listenerFields = List.of(
            KEY_LISTENER_VAR_NAME,
            KEY_HOST,
            KEY_PORT,
            KEY_USERNAME,
            KEY_PASSWORD,
            KEY_DATABASES,
            KEY_SCHEMAS,
            KEY_DATABASE_INSTANCE,
            KEY_SECURE_SOCKET,
            KEY_OPTIONS
    );

    // Validation pattern
    Pattern emptyStringTemplate = Pattern.compile("^string\\s*`\\s*`$|^\"\"$");

    /**
     * Data holder for listener information.
     *
     * @param name        The listener variable name
     * @param declaration The listener declaration code
     */
    private record ListenerInfo(String name, String declaration) { }

    /**
     * Data holder for import information.
     *
     * @param org     The organization name
     * @param module  The module name
     * @param unnamed Whether the import is unnamed (i.e., uses "as _" suffix)
     */
    private record Import(String org, String module, boolean unnamed) { }

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        InputStream resourceStream = MssqlCdcServiceBuilder.class.getClassLoader()
                .getResourceAsStream(CDC_MSSQL_SERVICE_MODEL_LOCATION);
        if (resourceStream == null) {
            return null;
        }
        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            ServiceInitModel serviceInitModel = new Gson().fromJson(reader, ServiceInitModel.class);
            Map<String, Value> properties = serviceInitModel.getProperties();
            Set<String> listeners = ListenerUtil.getCompatibleListeners(context.moduleName(),
                    context.semanticModel(), context.project());
            if (listeners.isEmpty()) {
                formatInitModelForNewListener(properties);
            } else {
                formatInitModelForExistingListener(listeners, properties);
            }
            return serviceInitModel;
        } catch (IOException e) {
            return null;
        }
    }

    @Override
    public Map<String, List<TextEdit>> addServiceInitSource(AddServiceInitModelContext context)
            throws WorkspaceDocumentException, FormatterException, IOException, BallerinaOpenApiException,
            EventSyncException {
        ServiceInitModel serviceInitModel = context.serviceInitModel();
        Map<String, Value> properties = serviceInitModel.getProperties();

        ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();
        List<TextEdit> edits = new ArrayList<>();

        // Add necessary imports
        Import[] imports = new Import[]{
                new Import(BALLERINAX, CDC_MODULE_NAME, false),
                new Import(serviceInitModel.getOrgName(), serviceInitModel.getModuleName(), false),
                new Import(BALLERINAX, MSSQL_CDC_DRIVER_MODULE_NAME, true)
        };
        addImportTextEdits(modulePartNode, imports, edits);

        // Get listener information and add declaration
        ListenerInfo listenerInfo = getListenerInfo(context, properties);
        addListenerDeclarationEdit(context, listenerInfo.declaration(), edits);

        // Add service declaration
        addServiceTextEdits(context, listenerInfo.name(), edits);

        return Map.of(context.filePath(), edits);
    }

    private void formatInitModelForNewListener(Map<String, Value> properties) {
        properties.remove(KEY_CONFIGURE_LISTENER);
    }

    private void formatInitModelForExistingListener(Set<String> listenerNames, Map<String, Value> properties) {
        Value configureListenerValue = properties.get(KEY_CONFIGURE_LISTENER);

        updateListenerNameSuffix(listenerNames, properties);

        // fill the existing listeners values
        Value selectListenerTemplate = configureListenerValue.getChoices().get(CHOICE_SELECT_EXISTING_LISTENER)
                .getProperties().get(KEY_SELECT_LISTENER);
        Value existingListenerOptions = new Value.ValueBuilder()
                .metadata(selectListenerTemplate.getMetadata().label(),
                        selectListenerTemplate.getMetadata().description())
                .value(listenerNames.iterator().next())
                .types(List.of(PropertyType.types(
                        Value.FieldType.SINGLE_SELECT,
                        Arrays.asList(listenerNames.toArray()))))
                .enabled(true)
                .editable(true)
                .setAdvanced(false)
                .build();
        configureListenerValue.getChoices().get(CHOICE_SELECT_EXISTING_LISTENER)
                .getProperties().put(KEY_SELECT_LISTENER, existingListenerOptions);

        // Add all listener properties to choice 1 of configureListener
        listenerFields.forEach(key -> {
            Value value = properties.get(key);
            configureListenerValue.getChoices().get(CHOICE_CONFIGURE_NEW_LISTENER).getProperties().put(key, value);
        });
        // Remove all listener properties from outside
        listenerFields.forEach(properties::remove);
    }

    private void updateListenerNameSuffix(Set<String> listenerNames, Map<String, Value> properties) {
        Value listenerVarName = properties.get(ServiceInitModel.KEY_LISTENER_VAR_NAME);
        // add a number suffix if there are existing listeners
        String baseListenerName = listenerVarName.getValue();
        int suffix = listenerNames.size() + 1;
        while (listenerNames.contains(baseListenerName + suffix)) {
            suffix++;
        }
        listenerVarName.setValue(baseListenerName + suffix);
    }

    private void addImportTextEdits(ModulePartNode modulePartNode, Import[] imports, List<TextEdit> edits) {
        for (Import im : imports) {
            String org = im.org();
            String module = im.module();
            if (!importExists(modulePartNode, org, module)) {
                if (im.unnamed()) {
                    module += UNNAMED_IMPORT_SUFFIX;
                }
                String importText = getImportStmt(org, module);
                edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().startLine()), importText));
            }
        }
    }

    private void addServiceTextEdits(AddServiceInitModelContext context, String listenerName, List<TextEdit> edits) {
        Map<String, Value> properties = context.serviceInitModel().getProperties();
        Value tableValue = properties.get(KEY_TABLE);
        String serviceDeclaration =
                buildServiceConfigurations(tableValue) +
                        NEW_LINE +
                        SERVICE + SPACE + CDC_MODULE_NAME + COLON + SERVICE_TYPE +
                        SPACE + ON + SPACE + listenerName + SPACE +
                        OPEN_BRACE +
                        NEW_LINE +
                        CLOSE_BRACE + NEW_LINE;
        ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();
        edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().endLine()), serviceDeclaration));

    }

    private ListenerDTO buildCdcListenerDTO(String moduleName, Map<String, Value> properties) {
        List<String> requiredParams = new ArrayList<>();
        List<String> includedParams = new ArrayList<>();
        for (Map.Entry<String, Value> entry : properties.entrySet()) {
            Value value = entry.getValue();
            if (value.getCodedata() == null) {
                continue;
            }
            Codedata codedata = value.getCodedata();
            String argType = codedata.getArgType();
            if (Objects.isNull(argType) || argType.isEmpty()) {
                continue;
            }
            if (argType.equals(ARG_TYPE_LISTENER_PARAM_REQUIRED)) {
                requiredParams.add(value.getValue());
            } else if (argType.equals(ARG_TYPE_LISTENER_PARAM_INCLUDED_FIELD)
                    || argType.equals(ARG_TYPE_LISTENER_PARAM_INCLUDED_DEFAULTABLE_FIELD)) {
                includedParams.add(entry.getKey() + " = " + value.getValue());
            }
        }
        String listenerProtocol = getProtocol(moduleName);
        String listenerVarName = properties.get(ServiceInitModel.KEY_LISTENER_VAR_NAME).getValue();
        requiredParams.addAll(includedParams);
        String args = String.join(", ", requiredParams);
        String listenerDeclaration = String.format("listener %s:%s %s = new (%s);",
                listenerProtocol, TYPE_CDC_LISTENER, listenerVarName, args);
        return new ListenerDTO(listenerProtocol, listenerVarName, listenerDeclaration);
    }

    /**
     * Applies listener-specific configurations by building database config and validating options.
     *
     * @param properties The listener properties map
     */
    private void applyListenerConfigurations(Map<String, Value> properties) {
        addDatabaseConfiguration(properties);
        validateAndRemoveInvalidOptions(properties);
    }

    private String buildServiceConfigurations(Value tableValue) {
        String tableField = tableValue.getValue();
        if (isInvalidValue(tableField)) {
            return "";
        }
        return AT + ANNOTATION_CDC_SERVICE_CONFIG + SPACE + OPEN_BRACE + NEW_LINE +
                "    " + FIELD_TABLES +
                tableField +
                CLOSE_BRACE + NEW_LINE;
    }

    private String buildDatabaseConfig(Map<String, Value> properties) {
        List<String> dbFields = new ArrayList<>();

        properties.forEach((key, value) -> {
            if (value.getCodedata() == null || !ARG_TYPE_DATABASE_CONFIG.equals(value.getCodedata().getArgType())) {
                return;
            }
            if (value.getValues() != null && !value.getValues().isEmpty()) {
                List<String> valueArray = value.getValues().stream()
                        .filter(v -> v != null && !isInvalidValue(v))
                        .toList();
                if (!valueArray.isEmpty()) {
                    dbFields.add(value.getCodedata().getOriginalName() + " : [" + String.join(", ", valueArray) + "]");
                }
                return;
            }
            if (value.getValue() != null && !isInvalidValue(value.getValue())) {
                dbFields.add(value.getCodedata().getOriginalName() + " : " + value.getValue());
            }
        });
        return OPEN_BRACE + String.join(", ", dbFields) + CLOSE_BRACE;
    }

    private Map<String, Value> getListenerProperties(Map<String, Value> properties, boolean listenerExists) {
        if (listenerExists) {
            return properties.get(KEY_CONFIGURE_LISTENER).getChoices().get(CHOICE_CONFIGURE_NEW_LISTENER)
                    .getProperties();
        }
        return properties;
    }

    private boolean isInvalidValue(String value) {
        return value.isBlank() || emptyStringTemplate.matcher(value.trim()).matches();
    }

    private void validateAndRemoveInvalidOptions(Map<String, Value> properties) {
        Value optionsValue = properties.get(KEY_OPTIONS);
        if (optionsValue != null && isInvalidValue(optionsValue.getValue())) {
            properties.remove(KEY_OPTIONS);
        }
    }

    private void addDatabaseConfiguration(Map<String, Value> properties) {
        String databaseConfig = buildDatabaseConfig(properties);
        Value databaseValue = new Value.ValueBuilder()
                .value(databaseConfig)
                .types(List.of(PropertyType.types(Value.FieldType.EXPRESSION)))
                .enabled(true)
                .editable(false)
                .setCodedata(new Codedata(null, ARG_TYPE_LISTENER_PARAM_INCLUDED_FIELD))
                .build();
        properties.put(KEY_DATABASE, databaseValue);
    }

    /**
     * Determines listener information based on whether an existing listener is used or a new one is created.
     *
     * @param context    The service initialization context
     * @param properties The service properties
     * @return ListenerInfo containing the listener name and declaration
     */
    private ListenerInfo getListenerInfo(AddServiceInitModelContext context, Map<String, Value> properties) {
        Set<String> listeners = ListenerUtil.getCompatibleListeners(
                context.serviceInitModel().getModuleName(),
                context.semanticModel(),
                context.project()
        );

        boolean listenerExists = !listeners.isEmpty();
        Map<String, Value> listenerProperties = getListenerProperties(properties, listenerExists);
        applyListenerConfigurations(listenerProperties);

        boolean useExistingListener = listenerExists
                && !properties.get(KEY_CONFIGURE_LISTENER)
                .getChoices().get(CHOICE_CONFIGURE_NEW_LISTENER).isEnabled();

        String listenerDeclaration;
        String listenerName;

        if (!listenerExists || !useExistingListener) {
            ListenerDTO listenerDTO = buildCdcListenerDTO(
                    context.serviceInitModel().getModuleName(),
                    listenerProperties
            );
            listenerDeclaration = NEW_LINE + listenerDTO.listenerDeclaration();
            listenerName = listenerDTO.listenerVarName();
        } else {
            listenerDeclaration = "";
            listenerName = properties.get(KEY_CONFIGURE_LISTENER)
                    .getChoices().get(CHOICE_SELECT_EXISTING_LISTENER)
                    .getProperties().get(KEY_SELECT_LISTENER).getValue();
        }

        return new ListenerInfo(listenerName, listenerDeclaration);
    }

    /**
     * Adds listener declaration text edits to the module.
     *
     * @param context             The service initialization context
     * @param listenerDeclaration The listener declaration code
     * @param edits               The list of text edits to add to
     */
    private void addListenerDeclarationEdit(
            AddServiceInitModelContext context,
            String listenerDeclaration,
            List<TextEdit> edits
    ) {
        if (!listenerDeclaration.isEmpty()) {
            ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();
            edits.add(new TextEdit(
                    Utils.toRange(modulePartNode.lineRange().endLine()),
                    listenerDeclaration
            ));
        }
    }

    @Override
    public Service getModelFromSource(ModelFromSourceContext context) {
        // First, create the base service model to get the original template with DATA_BINDING kinds
        Service baseServiceModel = createBaseServiceModel(context);
        if (baseServiceModel == null) {
            return null;
        }

        // Store original parameter kinds before standard consolidation modifies them
        Map<String, Map<Integer, String>> originalParameterKinds = extractParameterKinds(baseServiceModel);

        // Run standard consolidation (this may overwrite DATA_BINDING kinds to REQUIRED)
        Service serviceModel = super.getModelFromSource(context);

        if (serviceModel == null) {
            return null;
        }

        ServiceDeclarationNode serviceNode = (ServiceDeclarationNode) context.node();

        List<Function> sourceFunctions = extractFunctionsFromSource(serviceNode);

        // Create a map for quick lookup by function name
        Map<String, Function> sourceFunctionMap = sourceFunctions.stream()
                .collect(Collectors.toMap(f -> f.getName().getValue(), f -> f));

        // Process each function to update DATA_BINDING parameters
        for (Function function : serviceModel.getFunctions()) {
            String functionName = function.getName().getValue();

            // Add defaultTypeTab property
            function.addProperty(DEFAULT_TYPE_TAB_PROPERTY,
                    new Value.ValueBuilder().value(DEFAULT_TYPE_TAB_VALUE).build()
            );

            // Set module name on function codedata so router can correctly invoke MssqlCdcFunctionBuilder
            setModuleName(function);

            // Find matching source function
            Function sourceFunction = sourceFunctionMap.get(functionName);
            if (sourceFunction == null) {
                updateDatabindingParameterMetadata(function);
                continue;
            }

            restoreAndUpdateDataBindingParams(function, sourceFunction, originalParameterKinds.get(functionName));
            updateDatabindingParameterMetadata(function);
        }

        // After all consolidation and databinding processing is complete,
        // apply onUpdate parameter combining to all functions
        applyOnUpdateCombining(serviceModel);

        return serviceModel;
    }

    /**
     * Updates the metadata label to "Database Entry" for all databinding parameters in the given function.
     *
     * @param function The function whose parameters should be updated
     */
    private void updateDatabindingParameterMetadata(Function function) {
        for (Parameter param : function.getParameters()) {
            if (DATA_BINDING.equals(param.getKind())) {
                param.setMetadata(new MetaData(
                        DATABINDING_PARAM_LABEL,
                        param.getMetadata() != null ? param.getMetadata().description() : ""
                ));
            }
        }
    }

    /**
     * Ensures the function has a Codedata object and sets the module name. This is required for the router to correctly
     * invoke MssqlCdcFunctionBuilder.
     *
     * @param function The function to process
     */
    private void setModuleName(Function function) {
        if (function.getCodedata() == null) {
            function.setCodedata(new Codedata());
        }
        function.getCodedata().setModuleName(kind());
    }

    /**
     * Applies onUpdate parameter combining to all functions in the service model. This ensures that onUpdate function
     * shows only one databinding parameter in the UI, regardless of whether the function exists in source code or is
     * being added from the UI.
     *
     * @param serviceModel The service model to process
     */
    private void applyOnUpdateCombining(Service serviceModel) {
        for (Function function : serviceModel.getFunctions()) {
            if (FUNCTION_ON_UPDATE.equals(function.getName().getValue())) {
                combineDatabindingParams(function);
            }
        }
    }

    /**
     * Combines the two DATA_BINDING parameters (beforeEntry and afterEntry) for onUpdate function. The UI will show
     * only afterEntry as the databinding parameter. beforeEntry is kept in the model but marked as hidden
     * (enabled=false) so it can be expanded during code generation.
     * <p>
     * This method handles two scenarios: 1. Template case: Both parameters disabled (template initial state) - keeps
     * beforeEntry disabled 2. Source case: Both parameters enabled with same type - disables beforeEntry This ensures
     * UI shows only ONE databinding button/field for onUpdate.
     * </p>
     *
     * @param function The onUpdate function to process
     */
    private void combineDatabindingParams(Function function) {
        List<Parameter> parameters = function.getParameters();
        Parameter beforeEntry = null;
        Parameter afterEntry = null;

        // Find the two DATA_BINDING parameters
        for (Parameter param : parameters) {
            if (!DATA_BINDING.equals(param.getKind())) {
                continue;
            }
            String paramName = param.getName().getValue();
            if (BEFORE_ENTRY_FIELD.equals(paramName)) {
                beforeEntry = param;
            } else if (AFTER_ENTRY_FIELD.equals(paramName)) {
                afterEntry = param;
            }
        }

        // Both parameters must exist
        if (beforeEntry == null || afterEntry == null) {
            return;
        }

        // Case 1: Both disabled  - keep beforeEntry disabled, afterEntry disabled
        if (!beforeEntry.isEnabled() && !afterEntry.isEnabled()) {
            // Nothing to do - already in desired state (beforeEntry hidden)
            return;
        }

        // Case 2: Both enabled with same type (from source code) - disable beforeEntry
        if (beforeEntry.isEnabled() && afterEntry.isEnabled()) {
            String beforeType = beforeEntry.getType().getValue();
            String afterType = afterEntry.getType().getValue();

            // Combine if both have the same type (whether "record {}" or custom type)
            if (beforeType.equals(afterType)) {
                // Hide beforeEntry - it will be expanded during code generation
                beforeEntry.setEnabled(false);
                // afterEntry stays enabled and represents both parameters in the UI
            }
        }

    }

    @Override
    public String kind() {
        return "mssql";
    }
}
