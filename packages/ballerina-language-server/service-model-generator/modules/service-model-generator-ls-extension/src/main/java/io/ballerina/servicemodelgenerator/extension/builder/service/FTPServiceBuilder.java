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
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.ModuleMemberDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.SimpleNameReferenceNode;
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
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.util.FTPFunctionModelUtil;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

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

    // Listener configuration property keys (path is service-level, not listener-level)
    // designApproach contains protocol choice with nested listener properties (host, port, auth)
    private static final List<String> LISTENER_CONFIG_KEYS = List.of(
            KEY_LISTENER_VAR_NAME, "designApproach", "host", "portNumber", "authentication", "secureSocket"
    );
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
            Value listenerNameProp = listenerNameProperty(context);
            Value listener = serviceInitModel.getProperties().get(KEY_LISTENER_VAR_NAME);
            listener.setValue(listenerNameProp.getValue());

            // Check for existing compatible FTP listeners (excluding legacy ones)
            Set<String> allListeners = ListenerUtil.getCompatibleListeners(context.moduleName(),
                    context.semanticModel(), context.project());
            Set<String> compatibleListeners = filterNonLegacyListeners(allListeners, context.semanticModel(),
                    context.project());

            if (!compatibleListeners.isEmpty()) {
                Map<String, Value> properties = serviceInitModel.getProperties();
                // Get properties from the enabled design approach choice
                Map<String, Value> listenerProps =
                        ListenerUtil.removeAndCollectListenerProperties(properties, LISTENER_CONFIG_KEYS);
                Value choicesProperty = ListenerUtil.buildListenerChoiceProperty(listenerProps, compatibleListeners,
                        LABEL_FTP);
                properties.put(KEY_CONFIGURE_LISTENER, choicesProperty);
            }

            return serviceInitModel;
        } catch (IOException e) {
            return null;
        }
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

        // Check if listener choice property exists and apply it first (designApproach is nested)
        if (properties.containsKey(KEY_CONFIGURE_LISTENER)) {
            applyEnabledChoiceProperty(serviceInitModel, KEY_CONFIGURE_LISTENER);
        }

        // Get the selected protocol (ftp, ftps, or sftp) from the design approach choices
        String selectedProtocol = getEnabledChoiceValue(serviceInitModel, PROPERTY_DESIGN_APPROACH);
        applyEnabledChoiceProperty(serviceInitModel, PROPERTY_DESIGN_APPROACH);

        properties = serviceInitModel.getProperties();

        // Check if we should use an existing listener
        boolean useExistingListener = ListenerUtil.shouldUseExistingListener(properties);
        String listenerVarName;
        String listenerDeclaration = "";
        // path is now a service-level property (in @ftp:ServiceConfig annotation).
        // Keep backward compatibility with legacy payloads that still send `folderPath`.
        String folderPath = getPropertyValueLiteralValue(properties, "path",
                getPropertyValueLiteralValue(properties, "folderPath", "\"/\""));

        if (useExistingListener) {
            listenerVarName = ListenerUtil.getExistingListenerName(properties).orElse("");
        } else {
            // After applyEnabledChoiceProperty, all properties are flattened into the main properties map
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

                // Add credentials block if username or password is provided
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

                    // Add comma if private key or secure socket is also present
                    if (!privateKey.isEmpty() || !secureSocket.isEmpty()) {
                        listenerBuilder.append(", ");
                    } else {
                        listenerBuilder.append(" ");
                    }
                }

                // Add private key configuration if provided
                if (!privateKey.isEmpty()) {
                    listenerBuilder.append("privateKey: ");
                    listenerBuilder.append(privateKey);

                    // Add comma if secure socket is also present
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

                        FTPFunctionModelUtil.syncFunctionFromSource(sourceFunc, modelFunc, true);
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
                if (isServiceAttachedToListener(serviceNode, listenerName)) {
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
     * Checks if a service is attached to a specific listener.
     */
    private boolean isServiceAttachedToListener(ServiceDeclarationNode serviceNode, String listenerName) {
        for (ExpressionNode expr : serviceNode.expressions()) {
            if (expr instanceof SimpleNameReferenceNode simpleRef) {
                if (simpleRef.name().text().equals(listenerName)) {
                    return true;
                }
            }
        }
        return false;
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
