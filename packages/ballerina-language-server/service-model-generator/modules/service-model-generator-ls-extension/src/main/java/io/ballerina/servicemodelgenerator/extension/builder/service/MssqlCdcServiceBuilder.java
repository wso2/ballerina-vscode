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

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_LISTENER_VAR_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_INCLUDED_DEFAULTABLE_FIELD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_INCLUDED_FIELD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ARG_TYPE_LISTENER_PARAM_REQUIRED;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.CLOSE_BRACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.NEW_LINE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.ON;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.OPEN_BRACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SERVICE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SPACE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_EXPRESSION;
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

    private static final String CDC_MSSQL_SERVICE_MODEL_LOCATION = "services/cdc_mssql.json";
    public static final String AFTER_ENTRY_FIELD = "afterEntry";
    public static final String BEFORE_ENTRY_FIELD = "beforeEntry";
    public static final String TYPE_PREFIX = "MssqlCdcEvent";
    private static final String ON_CREATE_FUNCTION = "onCreate";
    private static final String ON_READ_FUNCTION = "onRead";
    private static final String ON_UPDATE_FUNCTION = "onUpdate";
    private static final String ON_DELETE_FUNCTION = "onDelete";
    private static final String KEY_CONFIGURE_LISTENER = "configureListener";
    private static final int CHOICE_SELECT_EXISTING_LISTENER = 0;
    private static final int CHOICE_CONFIGURE_NEW_LISTENER = 1;
    private static final String KEY_SELECT_LISTENER = "selectListener";
    private static final String KEY_TABLES = "tables";

    private final List<String> listenerFields = List.of(
            "listenerVarName",
            "host",
            "port",
            "username",
            "password",
            "databases",
            "schemas",
            "databaseInstance",
            "secureSocket",
            "options"
    );

    // Regex to match string template literals with only whitespace: string `<spaces>`
    Pattern emptyStringTemplate = Pattern.compile("^string\\s*`\\s*`$");

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
        Set<String> listeners = ListenerUtil.getCompatibleListeners(context.serviceInitModel().getModuleName(),
                context.semanticModel(), context.project());
        boolean listenerExists = !listeners.isEmpty();
        Map<String, Value> listenerProperties = getListenerProperties(properties, listenerExists);
        applyListenerConfigurations(listenerProperties);

        boolean useExisingListener = listenerExists
                && !properties.get(KEY_CONFIGURE_LISTENER).getChoices().get(CHOICE_CONFIGURE_NEW_LISTENER).isEnabled();

        // TODO: move to a diff func
        String listenerDeclaration;
        String listenerName;
        // Build listener declaration if not using an existing listener
        if (!listenerExists || !useExisingListener) {
            ListenerDTO listenerDTO = buildCdcListenerDTO(serviceInitModel.getModuleName(), listenerProperties);
            listenerDeclaration = listenerDTO.listenerDeclaration();
            listenerName = listenerDTO.listenerVarName();
        } else {
            listenerDeclaration = "";
            listenerName = properties.get(KEY_CONFIGURE_LISTENER).getChoices().get(CHOICE_SELECT_EXISTING_LISTENER)
                    .getProperties().get(KEY_SELECT_LISTENER).getValue();
        }

        ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();
        Value tablesValue = properties.get(KEY_TABLES);

        String serviceDeclaration = NEW_LINE +
                listenerDeclaration +
                buildServiceConfigurations(tablesValue) +
                NEW_LINE +
                SERVICE + SPACE + "cdc:Service" +
                SPACE + ON + SPACE + listenerName + SPACE +
                OPEN_BRACE +
                NEW_LINE +
                CLOSE_BRACE + NEW_LINE;

        List<TextEdit> edits = new ArrayList<>();

        // TODO: unify import addition logic
        if (!importExists(modulePartNode, serviceInitModel.getOrgName(), serviceInitModel.getModuleName())) {
            String importText = getImportStmt(serviceInitModel.getOrgName(), serviceInitModel.getModuleName());
            edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().startLine()), importText));
        }
        if (!importExists(modulePartNode, "ballerinax", "cdc")) {
            String importText = getImportStmt("ballerinax", "cdc");
            edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().startLine()), importText));
        }
        if (!importExists(modulePartNode, "ballerinax", "mssql.cdc.driver")) {
            String importText = getImportStmt("ballerinax", "mssql.cdc.driver" + " as _");
            edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().startLine()), importText));
        }
        edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().endLine()), serviceDeclaration));

        return Map.of(context.filePath(), edits);
    }

    private void formatInitModelForNewListener(Map<String, Value> properties) {
        properties.remove(KEY_CONFIGURE_LISTENER);
    }

    private void formatInitModelForExistingListener(Set<String> listenerNames, Map<String, Value> properties) {
        Value configureListenerValue = properties.get(KEY_CONFIGURE_LISTENER);

        // fill the existing listeners values
        Value selectListenerValue = configureListenerValue.getChoices().get(CHOICE_SELECT_EXISTING_LISTENER)
                .getProperties().get(KEY_SELECT_LISTENER);
        selectListenerValue.setValue(listenerNames.iterator().next());
        selectListenerValue.setItems(Arrays.asList(listenerNames.toArray()));

        // Add all listener properties to choice 1 of configureListener
        listenerFields.forEach(key -> {
            Value value = properties.get(key);
            configureListenerValue.getChoices().get(CHOICE_CONFIGURE_NEW_LISTENER).getProperties().put(key, value);
        });
        // Remove all listener properties from outside
        listenerFields.forEach(properties::remove);
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
        String listenerVarName = properties.get(KEY_LISTENER_VAR_NAME).getValue();
        requiredParams.addAll(includedParams);
        String args = String.join(", ", requiredParams);
        String listenerDeclaration = String.format("listener %s:%s %s = new (%s);",
                listenerProtocol, "CdcListener", listenerVarName, args);
        return new ListenerDTO(listenerProtocol, listenerVarName, listenerDeclaration);
    }

    // TODO: refactor
    private void applyListenerConfigurations(Map<String, Value> properties) {
        String databaseConfig = buildDatabaseConfig(properties);
        Value databaseValue = new Value.ValueBuilder()
                .value(databaseConfig)
                .valueType(VALUE_TYPE_EXPRESSION)
                .enabled(true)
                .editable(false)
                .setCodedata(new Codedata(null, ARG_TYPE_LISTENER_PARAM_INCLUDED_FIELD))
                .build();
        properties.put("database", databaseValue); // TODO: make constants

        // TODO: move to a new method
        Value optionsValue = properties.get("options");
        if (optionsValue.getValue().isBlank()
                && !emptyStringTemplate.matcher(optionsValue.getValue().trim()).matches()) {
            properties.remove("options");
        }
    }

    private String buildServiceConfigurations(Value tablesValue) {
        StringBuilder annotation = new StringBuilder();

        annotation.append("@").append("cdc:ServiceConfig").append(" {").append("\n");
        // TODO: create and set the cdc:ServiceConfig annotation using the tables property
        List<String> tableList = new ArrayList<>();
        if (tablesValue.getValues() != null && !tablesValue.getValues().isEmpty()) {
            tableList = tablesValue.getValues().stream()
                    .filter(Objects::nonNull)
                    .filter(v -> !emptyStringTemplate.matcher(v.trim()).matches())
                    .toList();
        }

        annotation.append("    tables: [")
                .append(String.join(", ", tableList))
                .append("]").append("\n");
        annotation.append("}").append("\n");

        return annotation.toString();
    }

    private String buildDatabaseConfig(Map<String, Value> properties) {
        // TODO: need to handle the secure socket properties
        List<String> dbFields = new ArrayList<>();

        properties.forEach((key, value) -> {
            if (value.getCodedata() == null || !"databaseConfig".equals(value.getCodedata().getArgType())) {
                return;
            }
            if (value.getValues() != null && !value.getValues().isEmpty()) {
                List<String> valueArray = value.getValues().stream()
                        .filter(v -> v != null && !emptyStringTemplate.matcher(v.trim()).matches())
                        .collect(Collectors.toList());
                if (!valueArray.isEmpty()) {
                    dbFields.add(value.getCodedata().getOriginalName() + " : [" + String.join(", ", valueArray) + "]");
                }
                return;
            }
            if (value.getValue() != null && !value.getValue().isBlank()
                    && !emptyStringTemplate.matcher(value.getValue().trim()).matches()) {
                dbFields.add(value.getCodedata().getOriginalName() + " : " + value.getValue());
            }
        });
        return "{" + String.join(", ", dbFields) + "}";
    }

    private Map<String, Value> getListenerProperties(Map<String, Value> properties, boolean listenerExists) {
        if (listenerExists) {
            return properties.get(KEY_CONFIGURE_LISTENER).getChoices().get(CHOICE_CONFIGURE_NEW_LISTENER)
                    .getProperties();
        }
        return properties;
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

            // Find matching source function
            Function sourceFunction = sourceFunctionMap.get(functionName);
            if (sourceFunction == null) {
                continue;
            }

            restoreAndUpdateDataBindingParams(function, sourceFunction, originalParameterKinds.get(functionName));
        }

        return serviceModel;
    }

    @Override
    public String kind() {
        return "mssql";
    }
}
