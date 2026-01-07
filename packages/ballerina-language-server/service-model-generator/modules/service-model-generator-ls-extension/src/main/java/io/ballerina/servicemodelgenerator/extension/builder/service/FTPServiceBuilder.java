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
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.openapi.core.generators.common.exception.BallerinaOpenApiException;
import io.ballerina.servicemodelgenerator.extension.core.OpenApiServiceGenerator;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
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
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_CONFIGURE_LISTENER;
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

    @Override
    public String kind() {
        return "FTP";
    }

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        InputStream resourceStream = HttpServiceBuilder.class.getClassLoader()
                .getResourceAsStream(FTP_INIT_JSON);
        if (resourceStream == null) {
            return null;
        }

        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            ServiceInitModel serviceInitModel = new Gson().fromJson(reader, ServiceInitModel.class);
            Value listenerNameProp = listenerNameProperty(context);
            Value listener = serviceInitModel.getProperties().get(KEY_LISTENER_VAR_NAME);
            listener.setValue(listenerNameProp.getValue());
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

        // Get the selected protocol (ftp, ftps, or sftp) from the design approach choices
        String selectedProtocol = getEnabledChoiceValue(serviceInitModel, PROPERTY_DESIGN_APPROACH);

        applyEnabledChoiceProperty(serviceInitModel, PROPERTY_DESIGN_APPROACH);
        applyEnabledChoiceProperty(serviceInitModel, KEY_CONFIGURE_LISTENER);

        Map<String, Value> properties = serviceInitModel.getProperties();

        // After applyEnabledChoiceProperty, all properties are flattened into the main properties map
        String listenerVarName = properties.get("listenerVarName").getValue();
        String host = cleanQuotes(getPropertyValue(properties, "host", "127.0.0.1"));
        String port = getPropertyValue(properties, "portNumber", "21");
        String folderPath = cleanQuotes(getPropertyValue(properties, "folderPath", "/"));

        applyEnabledChoiceProperty(serviceInitModel, "authentication");
        String username = getPropertyValue(properties, "userName", "");
        String password = getPropertyValue(properties, "password", "");
        String privateKey = cleanQuotes(getPropertyValue(properties, "privateKey", ""));
        String secureSocket = cleanQuotes(getPropertyValue(properties, "secureSocket", ""));

        // Build the listener declaration
        StringBuilder listenerDeclaration = new StringBuilder();
        listenerDeclaration.append("listener ftp:Listener ").append(listenerVarName).append(" = new(");
        listenerDeclaration.append("protocol= ftp:").append(selectedProtocol).append(", ");
        listenerDeclaration.append("host= \"").append(host).append("\", ");

        // Add authentication configuration if any auth details are provided
        if (!username.isEmpty() || !password.isEmpty() || !privateKey.isEmpty() || !secureSocket.isEmpty()) {
            listenerDeclaration.append("auth= { ");

            // Add credentials block if username or password is provided
            if (!username.isEmpty() || !password.isEmpty()) {
                listenerDeclaration.append("credentials: { ");
                if (!username.isEmpty()) {
                    listenerDeclaration.append("username: ").append(username);
                    if (!password.isEmpty()) {
                        listenerDeclaration.append(", ");
                    }
                }
                if (!password.isEmpty()) {
                    listenerDeclaration.append("password: ").append(password).append(" ");
                }
                listenerDeclaration.append("}");

                // Add comma if private key or secure socket is also present
                if (!privateKey.isEmpty() || !secureSocket.isEmpty()) {
                    listenerDeclaration.append(", ");
                } else {
                    listenerDeclaration.append(" ");
                }
            }

            // Add private key configuration if provided
            if (!privateKey.isEmpty()) {
                listenerDeclaration.append("privateKey: ");
                listenerDeclaration.append(privateKey);

                // Add comma if secure socket is also present
                if (!secureSocket.isEmpty()) {
                    listenerDeclaration.append(", ");
                } else {
                    listenerDeclaration.append(" ");
                }
            }

            if (!secureSocket.isEmpty()) {
                listenerDeclaration.append("secureSocket: ").append(secureSocket).append(" ");
            }
            listenerDeclaration.append("}, ");
        }


        listenerDeclaration.append("port= ").append(port).append(", ");
        listenerDeclaration.append("path= \"").append(folderPath).append("\" ");
        listenerDeclaration.append(");");

        if (Objects.nonNull(serviceInitModel.getOpenAPISpec())) {
            return new OpenApiServiceGenerator(Path.of(serviceInitModel.getOpenAPISpec().getValue()),
                    context.project().sourceRoot(), context.workspaceManager())
                    .generateService(serviceInitModel, listenerVarName, listenerDeclaration.toString());
        }

        ModulePartNode modulePartNode = context.document().syntaxTree().rootNode();

        String serviceCode = NEW_LINE +
                listenerDeclaration +
                NEW_LINE +
                NEW_LINE +
                SERVICE + SPACE + ON + SPACE + listenerVarName + SPACE + OPEN_BRACE +
                NEW_LINE +
                CLOSE_BRACE + NEW_LINE;

        List<TextEdit> edits = new ArrayList<>();
        if (!importExists(modulePartNode, serviceInitModel.getOrgName(), serviceInitModel.getModuleName())) {
            String importText = getImportStmt(serviceInitModel.getOrgName(), serviceInitModel.getModuleName());
            edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().startLine()), importText));
        }
        edits.add(new TextEdit(Utils.toRange(modulePartNode.lineRange().endLine()), serviceCode));

        return Map.of(context.filePath(), edits);
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
     * Helper method to clean surrounding quotes from string values.
     */
    private String cleanQuotes(String value) {
        if (value == null) {
            return "";
        }
        // Remove surrounding quotes if present
        String cleaned = value.trim();
        if (cleaned.startsWith("\"") && cleaned.endsWith("\"") && cleaned.length() > 1) {
            cleaned = cleaned.substring(1, cleaned.length() - 1);
        }
        return cleaned;
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

    @Override
    public Service getModelFromSource(ModelFromSourceContext context) {
        Optional<Service> service = getModelTemplate(GetModelContext.fromServiceAndFunctionType(BALLERINA, FTP));
        if (service.isEmpty()) {
            return null;
        }

        Service serviceModel = service.get();
        ServiceDeclarationNode serviceNode = (ServiceDeclarationNode) context.node();
        SemanticModel semanticModel = context.semanticModel();
        Codedata codedata = new Codedata.Builder()
                .setLineRange(serviceNode.lineRange())
                .setOrgName(context.orgName())
                .setPackageName(context.packageName())
                .setModuleName(context.moduleName())
                .build();
        serviceModel.setCodedata(codedata);

        List<Function> functionsInSource = extractFunctionsFromSource(serviceNode);

        // Enable specific functions in serviceModel if they match enabled functions in functionsInSource
        // Also copy codedata from functionsInSource while preserving metadata
        if (serviceModel.getFunctions() != null) {
            for (Function sourceFunc : functionsInSource) {
                if (sourceFunc.isEnabled() && sourceFunc.getName() != null) {
                    String sourceFuncName = sourceFunc.getName().getValue();
                    serviceModel.getFunctions().stream()
                        .filter(modelFunc -> modelFunc.getName() != null &&
                                sourceFuncName.equals(modelFunc.getName().getValue()))
                        .forEach(modelFunc -> {
                            modelFunc.setEnabled(true);
                            modelFunc.setCodedata(sourceFunc.getCodedata());
                            modelFunc.getCodedata().setModuleName(FTP);
                            modelFunc.getParameters().forEach(
                                    parameter -> parameter.setEnabled(false)
                            );
                            for (Parameter sourceParam: sourceFunc.getParameters()) {

                                modelFunc.getParameters().stream().filter(
                                        modelParam -> modelParam.getType().getValue()
                                                .equals(sourceParam.getType().getValue()) ||
                                                modelParam.getKind().equals("DATA_BINDING")
                                || modelParam.getName().getValue().equals("content")
                                ).forEach(
                                        modelParam -> {
                                            modelParam.setEnabled(true);
                                        }
                                );
                            }

                            if (sourceFunc.getCodedata() != null) {
                                modelFunc.setCodedata(sourceFunc.getCodedata());
                            }
                            // Filter source function parameters (exclude FTP_CALLER_TYPE and FTP_INFO_TYPE)
                            if (sourceFunc.getParameters() != null) {

                                Parameter sourceParam = sourceFunc.getParameters().getFirst();


                                // Update model function parameters based on filtered source parameters
                                if (modelFunc.getParameters() != null) {
                                    Parameter modelParam = modelFunc.getParameters().getFirst();
                                    if (modelParam.getType() != null &&
                                        "DATA_BINDING".equals(modelParam.getKind())) {

                                        // Update parameter name while preserving placeholder if it exists
                                        if (sourceParam.getName() != null && modelParam.getName() != null) {
                                            String sourceParamName = sourceParam.getName().getValue();
                                            modelParam.getName().setValue(sourceParam.getName().getValue());
                                            if (sourceParamName != null) {
                                                modelParam.getName().setPlaceholder(sourceParamName);
                                            }
                                        }

                                        // Update parameter type while preserving placeholder if it exists
                                        if (sourceParam.getType() != null && modelParam.getType() != null) {
                                            modelParam.getType().setValue(sourceParam.getType().getValue());

                                        }
                                    }
                                }
                            }
                            if (modelFunc.getProperties().containsKey("stream")) {
                                // Set stream property based on first parameter type
                                setStreamProperty(modelFunc, sourceFunc);
                            }
                        }
                    );
                }
            }
        }

        // Initialize readOnly metadata if not present in template (HttpServiceBuilder uses custom template)
        if (serviceModel.getProperty(PROP_READONLY_METADATA_KEY) == null) {
            String serviceType = serviceModel.getType();
            Value readOnlyMetadata = getReadonlyMetadata(serviceModel.getOrgName(), serviceModel.getPackageName(),
                    serviceType);
            serviceModel.getProperties().put(PROP_READONLY_METADATA_KEY, readOnlyMetadata);
        }

        updateReadOnlyMetadataWithAnnotations(serviceModel, serviceNode, context);
        populateListenerInfo(serviceModel, serviceNode);
        updateServiceDocs(serviceNode, serviceModel);
        updateAnnotationAttachmentProperty(serviceNode, serviceModel);
        updateListenerItems(FTP, semanticModel, context.project(), serviceModel);
        return serviceModel;
    }

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
     * Sets the stream property based on the first parameter type of the function.
     * Stream property is set to true if the first parameter has a type of stream<{type},error>.
     *
     * @param modelFunc The model function to update
     * @param sourceFunc The source function to check
     */
    private void setStreamProperty(Function modelFunc, Function sourceFunc) {
        boolean isStream = false;

        if (sourceFunc.getParameters() != null && !sourceFunc.getParameters().isEmpty()) {
            Parameter firstParam = sourceFunc.getParameters().get(0);
            if (firstParam.getType() != null) {
                String paramType = firstParam.getType().getValue();
                // Check if the parameter type is a stream type (e.g., stream<{type},error>)
                if (paramType != null && paramType.startsWith("stream<")) {
                    isStream = true;
                }
            }
        }

        // Create or update the stream property in the function's properties map
        Value streamProperty = new Value.ValueBuilder()
                .value(String.valueOf(isStream))
                .enabled(isStream)
                .editable(false)
                .optional(false)
                .setAdvanced(false)
                .build();

        modelFunc.addProperty("stream", streamProperty);
    }
}
