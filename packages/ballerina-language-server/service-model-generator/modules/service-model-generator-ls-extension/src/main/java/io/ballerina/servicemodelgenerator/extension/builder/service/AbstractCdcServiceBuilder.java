/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.openapi.core.generators.common.exception.BallerinaOpenApiException;
import io.ballerina.projects.Project;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.PropertyType;
import io.ballerina.servicemodelgenerator.extension.model.PropertyTypeMemberInfo;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
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
import java.util.LinkedHashMap;
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
import static io.ballerina.servicemodelgenerator.extension.util.Constants.CD_TYPE_ANNOTATION_ATTACHMENT;
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
import static io.ballerina.servicemodelgenerator.extension.util.Utils.applyEnabledChoiceProperty;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getImportStmt;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.importExists;

/**
 * Abstract base class for CDC (Change Data Capture) service builders.
 * Provides common functionality for all CDC database implementations (MSSQL, PostgreSQL, etc.).
 *
 * @since 1.5.0
 */
public abstract class AbstractCdcServiceBuilder extends AbstractServiceBuilder {

    // Public field name constants (used in databinding)
    public static final String AFTER_ENTRY_FIELD = "afterEntry";
    public static final String BEFORE_ENTRY_FIELD = "beforeEntry";

    protected static final String DATABINDING_PARAM_LABEL = "Database Entry";

    // Property keys and values
    protected static final String DEFAULT_TYPE_TAB_PROPERTY = "defaultTypeTab";
    protected static final String DEFAULT_TYPE_TAB_VALUE = "create-from-scratch";

    // Module names
    protected static final String CDC_MODULE_NAME = "cdc";
    protected static final String UNNAMED_IMPORT_SUFFIX = " as _";

    // Property keys
    protected static final String KEY_LISTENER_VAR_NAME = "listenerVarName";
    protected static final String KEY_HOST = "host";
    protected static final String KEY_PORT = "port";
    protected static final String KEY_USERNAME = "username";
    protected static final String KEY_PASSWORD = "password";
    protected static final String KEY_DATABASE = "database";
    protected static final String KEY_SCHEMAS = "schemas";
    protected static final String KEY_SECURE_SOCKET = "secureSocket";
    protected static final String KEY_OPTIONS = "options";
    protected static final String KEY_CONFIGURE_LISTENER = "configureListener";
    protected static final String KEY_ADVANCED_CONFIGURATIONS = "advancedConfigurations";
    protected static final String KEY_TABLE = "table";

    // Type and annotation names
    protected static final String TYPE_CDC_LISTENER = "CdcListener";
    protected static final String ANNOTATION_CDC_SERVICE_CONFIG = "cdc:ServiceConfig";

    // Field names
    protected static final String FIELD_TABLES = "tables: ";

    // Function names
    protected static final String FUNCTION_ON_UPDATE = "onUpdate";

    // Argument types
    protected static final String ARG_TYPE_DATABASE_CONFIG = "databaseConfig";

    // Validation pattern
    protected final Pattern emptyStringTemplate = Pattern.compile("^string\\s*`\\s*`$|^\"\"$");

    private static final String SERVICE_CONFIG_ANNOTATION = "ServiceConfig";
    private static final String SERVICE_CONFIG_ANNOTATION_KEY = "annotServiceConfig";
    private static final String SERVICE_CONFIG_ANNOTATION_CONSTRAINT = "cdc:CdcServiceConfig";

    /**
     * Data holder for import information.
     *
     * @param org     The organization name
     * @param module  The module name
     * @param unnamed Whether the import is unnamed (i.e., uses "as _" suffix)
     */
    protected record Import(String org, String module, boolean unnamed) { }

    /**
     * Returns the location of the CDC service model JSON resource file.
     * @return Resource path (e.g., "services/cdc_mssql.json")
     */
    protected abstract String getCdcServiceModelLocation();

    /**
     * Returns the CDC driver module name for imports.
     * @return Module name (e.g., "mssql.cdc.driver")
     */
    protected abstract String getCdcDriverModuleName();

    /**
     * Returns the list of listener field keys for this CDC type.
     * MSSQL includes KEY_DATABASE_INSTANCE, PostgreSQL does not.
     * @return List of field keys
     */
    protected abstract List<String> getListenerFields();

    /**
     * Returns the kind identifier for this CDC service type.
     * @return Kind identifier (e.g., "mssql", "postgresql")
     */
    @Override
    public abstract String kind();

    /**
     * Returns the display label for this CDC type (e.g., "MSSQL CDC", "PostgreSQL CDC").
     * Used in the listener choice UI labels.
     */
    protected abstract String getDisplayLabel();

    /**
     * Extracts read-only listener configurations from existing listener declarations in source code.
     *
     * @param listenerNames  Set of listener variable names to extract configs for
     * @param semanticModel  Semantic model for symbol resolution
     * @param project        Project for source traversal
     * @return Map of listener name to its configuration properties (read-only Values)
     */
    protected abstract Map<String, Map<String, Value>> extractListenerConfigs(
            Set<String> listenerNames, SemanticModel semanticModel, Project project);

    /**
     * Applies metadata (labels, descriptions) from the JSON template properties onto the extracted
     * existing listener configs so that labels and descriptions are consistent between
     * "Create new" and "Use existing" views.
     *
     * @param configs        Extracted listener configs (listener name -> property key -> Value)
     * @param templateProps  Properties from the JSON template (the init model properties)
     */
    protected abstract void applyInitModelMetadata(Map<String, Map<String, Value>> configs,
                                                    Map<String, Value> templateProps);

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        InputStream resourceStream = this.getClass().getClassLoader()
                .getResourceAsStream(getCdcServiceModelLocation());
        if (resourceStream == null) {
            return null;
        }
        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            ServiceInitModel serviceInitModel = new Gson().fromJson(reader, ServiceInitModel.class);
            Map<String, Value> properties = serviceInitModel.getProperties();

            // Navigate into the pre-structured configureListener CHOICE
            Value configureListener = properties.get(KEY_CONFIGURE_LISTENER);
            Value createNewChoice = configureListener.getChoices().get(1);
            Value listenerConfig = createNewChoice.getProperties().get("listenerConfig");
            Value advancedSection = listenerConfig.getProperties().get(KEY_ADVANCED_CONFIGURATIONS);

            // Generate a unique listener variable name
            String listenerVarName = Utils.generateVariableIdentifier(context.semanticModel(), context.document(),
                    context.document().syntaxTree().rootNode().lineRange().endLine(),
                    advancedSection.getProperties().get(KEY_LISTENER_VAR_NAME).getValue());
            advancedSection.getProperties().get(KEY_LISTENER_VAR_NAME).setValue(listenerVarName);

            // Check for existing compatible listeners
            Set<String> compatibleListeners = ListenerUtil.getCompatibleListeners(context.moduleName(),
                    context.semanticModel(), context.project());

            if (!compatibleListeners.isEmpty()) {
                // Build template props by flattening listener fields for metadata mapping
                Map<String, Value> templateProps = new LinkedHashMap<>(listenerConfig.getProperties());
                if (advancedSection.getProperties() != null) {
                    templateProps.putAll(advancedSection.getProperties());
                }

                // Extract configs from existing listener declarations
                Map<String, Map<String, Value>> listenerConfigs = extractListenerConfigs(compatibleListeners,
                        context.semanticModel(), context.project());
                applyInitModelMetadata(listenerConfigs, templateProps);

                // Populate "Use existing" choice
                Value existingChoice = configureListener.getChoices().get(0);
                existingChoice.setMetadata(new MetaData("Use existing",
                        "Select an existing " + getDisplayLabel() + " listener"));
                existingChoice.setEnabled(true);
                existingChoice.setEditable(true);

                // Build SINGLE_SELECT dropdown with per-listener configs
                List<String> listenerNames = new ArrayList<>(compatibleListeners);
                Map<String, Value> perListenerConfigs = new LinkedHashMap<>();
                for (String name : listenerNames) {
                    Map<String, Value> config = listenerConfigs.getOrDefault(name, new LinkedHashMap<>());
                    Map<String, Value> readOnlyConfig = new LinkedHashMap<>();
                    for (Map.Entry<String, Value> entry : config.entrySet()) {
                        entry.getValue().setEditable(false);
                        readOnlyConfig.put(entry.getKey(), entry.getValue());
                    }
                    Value configGroup = new Value.ValueBuilder()
                            .metadata(name, getDisplayLabel() + " source: " + name)
                            .value(name)
                            .types(List.of(PropertyType.types(Value.FieldType.FORM)))
                            .enabled(true)
                            .editable(false)
                            .setProperties(readOnlyConfig)
                            .build();
                    perListenerConfigs.put(name, configGroup);
                }

                Value listenerDropdown = new Value.ValueBuilder()
                        .metadata("Listener Name", "Select an existing " + getDisplayLabel() + " listener")
                        .value(listenerNames.get(0))
                        .types(List.of(PropertyType.types(Value.FieldType.SINGLE_SELECT)))
                        .enabled(true)
                        .editable(true)
                        .setItems(new ArrayList<>(listenerNames))
                        .setProperties(perListenerConfigs)
                        .build();

                Map<String, Value> existingProps = new LinkedHashMap<>();
                existingProps.put(ServiceInitModel.KEY_EXISTING_LISTENER, listenerDropdown);
                existingChoice.getProperties().get("listenerConfig").setProperties(existingProps);

                // Set "Use existing" as default selection
                configureListener.setValue("0");
                createNewChoice.setEnabled(false);
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

        // Apply the configure listener choice (always present now)
        if (properties.containsKey(KEY_CONFIGURE_LISTENER)) {
            applyEnabledChoiceProperty(serviceInitModel, KEY_CONFIGURE_LISTENER);
        }
        properties = serviceInitModel.getProperties();

        // Unwrap GROUP_SECTION children back into the properties map
        unwrapGroupSections(properties);

        // Determine if "Use existing" was selected
        boolean useExistingListener = ListenerUtil.shouldUseExistingListener(properties);
        String existingListenerName = ListenerUtil.getExistingListenerName(properties).orElse("");
        properties.remove(ServiceInitModel.KEY_EXISTING_LISTENER);

        ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();
        List<TextEdit> edits = new ArrayList<>();

        // Add necessary imports
        Import[] imports = new Import[]{
                new Import(BALLERINAX, CDC_MODULE_NAME, false),
                new Import(serviceInitModel.getOrgName(), serviceInitModel.getModuleName(), false),
                new Import(BALLERINAX, getCdcDriverModuleName(), true)
        };
        addImportTextEdits(modulePartNode, imports, edits);

        String listenerName;
        String listenerDeclaration;

        if (useExistingListener) {
            listenerName = existingListenerName;
            listenerDeclaration = "";
        } else {
            // Build new listener declaration
            applyListenerConfigurations(properties);
            ListenerDTO listenerDTO = buildCdcListenerDTO(
                    serviceInitModel.getModuleName(), properties);
            listenerName = listenerDTO.listenerVarName();
            listenerDeclaration = NEW_LINE + listenerDTO.listenerDeclaration();
        }

        // Add listener declaration if creating new
        addListenerDeclarationEdit(context, listenerDeclaration, edits);

        // Add service declaration
        addServiceTextEdits(context, listenerName, edits);

        return Map.of(context.filePath(), edits);
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

    private boolean isInvalidValue(String value) {
        return value.isBlank() || emptyStringTemplate.matcher(value.trim()).matches();
    }

    private void validateAndRemoveInvalidOptions(Map<String, Value> properties) {
        Value optionsValue = properties.get(KEY_OPTIONS);
        if (optionsValue != null && isInvalidValue(optionsValue.getValue())) {
            properties.remove(KEY_OPTIONS);
        }
    }

    private void unwrapGroupSections(Map<String, Value> properties) {
        List<String> groupKeys = new ArrayList<>();
        Map<String, Value> childProps = new LinkedHashMap<>();
        for (Map.Entry<String, Value> entry : properties.entrySet()) {
            Value value = entry.getValue();
            if (value.getTypes() != null && value.getTypes().stream()
                    .anyMatch(t -> t.fieldType() == Value.FieldType.GROUP_SECTION)) {
                groupKeys.add(entry.getKey());
                if (value.getProperties() != null) {
                    unwrapGroupSections(value.getProperties());
                    childProps.putAll(value.getProperties());
                }
            }
        }
        groupKeys.forEach(properties::remove);
        properties.putAll(childProps);
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

            // Set module name on function codedata so router can correctly invoke the appropriate FunctionBuilder
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
        updateServiceConfigAnnotation(serviceModel);

        return serviceModel;
    }

    private void updateServiceConfigAnnotation(Service serviceModel) {
        Codedata codedata = new Codedata.Builder()
                .setType(CD_TYPE_ANNOTATION_ATTACHMENT)
                .setOriginalName(SERVICE_CONFIG_ANNOTATION)
                .setModuleName("cdc")
                .build();

        Value property = new Value.ValueBuilder()
                .metadata("Service Config", "Advanced CDC configuration")
                .types(getAnnotationConfigTypes())
                .value("")
                .setCodedata(codedata)
                .enabled(true)
                .editable(true)
                .build();

        Map<String, Value> properties = serviceModel.getProperties();
        Value annotationProperty = properties.get(SERVICE_CONFIG_ANNOTATION_KEY);
        if (annotationProperty != null) {
            property.setValue(annotationProperty.getValue());
        } else {
            properties.put(SERVICE_CONFIG_ANNOTATION_KEY, property);
        }
        serviceModel.getProperties().put(SERVICE_CONFIG_ANNOTATION_KEY, property);
    }

    private List<PropertyType> getAnnotationConfigTypes() {

        PropertyType recordType = new PropertyType.Builder()
                .fieldType(Value.FieldType.RECORD_MAP_EXPRESSION)
                .ballerinaType(SERVICE_CONFIG_ANNOTATION_CONSTRAINT)
                .setMembers(List.of(new PropertyTypeMemberInfo(
                        SERVICE_CONFIG_ANNOTATION_CONSTRAINT,
                        "ballerinax:cdc:1.1.0", // TODO: resolve the correct version when there is a value
                        CDC_MODULE_NAME,
                        "RECORD_TYPE",
                        true
                )))
                .selected(true)
                .build();

        PropertyType expressionType = new PropertyType.Builder()
                .fieldType(Value.FieldType.EXPRESSION)
                .ballerinaType(SERVICE_CONFIG_ANNOTATION_CONSTRAINT)
                .selected(false)
                .build();

        return List.of(recordType, expressionType);
    }

    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        Map<String, List<TextEdit>> editsMap = super.updateModel(context);

        Service service = context.service();

        Value property = service.getProperties().get(SERVICE_CONFIG_ANNOTATION_KEY);
        if (property == null || property.getValue() == null || property.getValue().isBlank()) {
            return editsMap;
        }

        if (!importExists(context.document().syntaxTree().rootNode(), BALLERINAX, CDC_MODULE_NAME)) {
            ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();
            String importText = getImportStmt(BALLERINAX, CDC_MODULE_NAME);
            TextEdit importEdit = new TextEdit(Utils.toRange(modulePartNode.lineRange().startLine()), importText);
            Map<String, List<TextEdit>> newEdit = new LinkedHashMap<>(editsMap);
            newEdit.merge(context.filePath(), List.of(importEdit), (existingEdits, newEdits) -> {
                List<TextEdit> merged = new ArrayList<>(existingEdits);
                merged.addFirst(newEdits.getFirst());
                return merged;
            });
            return newEdit;
        }

        return editsMap;
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
     * invoke the appropriate CdcFunctionBuilder.
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
}
