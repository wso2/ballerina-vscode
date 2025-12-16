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
import io.ballerina.openapi.core.generators.common.exception.BallerinaOpenApiException;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
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
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
import static io.ballerina.servicemodelgenerator.extension.util.DatabindUtil.addDataBindingParam;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getProtocol;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getImportStmt;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.importExists;

/**
 * Builder class for Microsoft SQL Server CDC service.
 *
 * @since 1.5.0
 */
public final class MssqlCdcServiceBuilder extends AbstractServiceBuilder {

    private static final String CDC_MSSQL_SERVICE_MODEL_LOCATION = "services/cdc_mssql_init_wo_existing_listener.json";
    public static final String AFTER_ENTRY_FIELD = "afterEntry";
    public static final String BEFORE_ENTRY_FIELD = "beforeEntry";
    public static final String TYPE_PREFIX = "MssqlCdcEvent";
    private static final String ON_CREATE_FUNCTION = "onCreate";
    private static final String ON_READ_FUNCTION = "onRead";
    private static final String ON_UPDATE_FUNCTION = "onUpdate";
    private static final String ON_DELETE_FUNCTION = "onDelete";


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
            return new Gson().fromJson(reader, ServiceInitModel.class);
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
        applyListenerConfigurations(properties);

        ListenerDTO listenerDTO = buildCdcListenerDTO(context);

        ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();
//        List<Function> functions = getRequiredFunctionsForServiceType(serviceInitModel); // TODO: this is not required
//        List<String> functionsStr = buildMethodDefinitions(functions, TRIGGER_ADD, new HashMap<>());

        Value tablesValue = properties.get("tables");

        String serviceDeclaration = NEW_LINE +
                listenerDTO.listenerDeclaration() +
                buildServiceConfigurations(tablesValue) +
                NEW_LINE +
                SERVICE + SPACE + "cdc:Service" +
                SPACE + ON + SPACE + listenerDTO.listenerVarName() + SPACE +
                OPEN_BRACE +
                NEW_LINE +
//                String.join(TWO_NEW_LINES, functionsStr) + NEW_LINE +
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

    private ListenerDTO buildCdcListenerDTO(AddServiceInitModelContext context) {
        ServiceInitModel serviceInitModel = context.serviceInitModel();
        Map<String, Value> properties = serviceInitModel.getProperties();
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
        String listenerProtocol = getProtocol(serviceInitModel.getModuleName());
        String listenerVarName = properties.get(KEY_LISTENER_VAR_NAME).getValue();
        requiredParams.addAll(includedParams);
        String args = String.join(", ", requiredParams);
        String listenerDeclaration = String.format("listener %s:%s %s = new (%s);",
                listenerProtocol, "CdcListener", listenerVarName, args);
        return new ListenerDTO(listenerProtocol, listenerVarName, listenerDeclaration);
    }

//    @Override
//    public Service getModelFromSource(ModelFromSourceContext context) {
//        Service service = super.getModelFromSource(context);
//
//        // Add data binding for functions with single parameter (afterEntry)
//        addDataBindingParam(service, ON_READ_FUNCTION, context, AFTER_ENTRY_FIELD, TYPE_PREFIX);
//        addDataBindingParam(service, ON_CREATE_FUNCTION, context, AFTER_ENTRY_FIELD, TYPE_PREFIX);
//
//        // For onUpdate - add data binding for both beforeEntry and afterEntry
//        addDataBindingParam(service, ON_UPDATE_FUNCTION, context, BEFORE_ENTRY_FIELD, TYPE_PREFIX);
//        addDataBindingParam(service, ON_UPDATE_FUNCTION, context, AFTER_ENTRY_FIELD, TYPE_PREFIX);
//
//        // Add data binding for onDelete - has beforeEntry
//        addDataBindingParam(service, ON_DELETE_FUNCTION, context, BEFORE_ENTRY_FIELD, TYPE_PREFIX);
//
//        return service;
//    }

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

    @Override
    public String kind() {
        return "mssql";
    }
}
