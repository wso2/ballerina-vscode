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
import io.ballerina.compiler.api.symbols.AnnotationSymbol;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.AnnotationNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingFieldNode;
import io.ballerina.compiler.syntax.tree.ModuleMemberDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.QualifiedNameReferenceNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.SimpleNameReferenceNode;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
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
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
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
    public static final String DATA_BINDING = "DATA_BINDING";
    public static final String STREAM = "stream";
    public static final String EVENT = "EVENT";
    private static final String SERVICE_CONFIG = "ServiceConfig";
    private static final String FUNCTION_CONFIG = "FunctionConfig";
    private static final String SERVICE_PATH = "path";
    private static final String POST_PROCESS_ACTION = "postProcessAction";
    private static final String POST_PROCESS_ACTION_ON_SUCCESS = "onSuccess";
    private static final String POST_PROCESS_ACTION_ON_ERROR = "onError";
    private static final String AFTER_PROCESS = "afterProcess";
    private static final String AFTER_ERROR = "afterError";
    private static final String ACTION_MOVE = "MOVE";
    private static final String ACTION_DELETE = "DELETE";
    private static final String MOVE_TO = "moveTo";

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

                        enableParameters(sourceFunc, modelFunc);
                        updateDatabindingParameter(sourceFunc, modelFunc);
                        FunctionDefinitionNode functionNode = functionNodes.get(sourceFuncName);
                        if (functionNode != null) {
                            updatePostProcessActionsFromAnnotation(functionNode, modelFunc, semanticModel);
                        }

                        if (modelFunc.getProperties().containsKey(STREAM)) {
                            setStreamProperty(modelFunc, sourceFunc);
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
        if (property != null && property.getLiteralValue() != null && !property.getLiteralValue().isEmpty()) {
            return property.getLiteralValue();
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

    private static void enableParameters(Function sourceFunc, Function modelFunc) {
        modelFunc.getParameters().forEach(
                parameter -> parameter.setEnabled(false)
        );
        for (Parameter sourceParam: sourceFunc.getParameters()) {

            modelFunc.getParameters().stream().filter(
                    modelParam -> modelParam.getType().getValue()
                            .equals(sourceParam.getType().getValue()) ||
                            modelParam.getKind().equals(DATA_BINDING)
                            || modelParam.getName().getValue().equals("content")
            ).forEach(
                    modelParam -> {
                        modelParam.setEnabled(true);
                    }
            );
        }
    }

    private static void updateDatabindingParameter(Function sourceFunc, Function modelFunc) {
        if (sourceFunc.getParameters() != null) {

            // In source always data-binding parameter must be the first one
            Parameter sourceParam = sourceFunc.getParameters().getFirst();
            if (modelFunc.getParameters() != null) {
                Parameter modelParam = modelFunc.getParameters().getFirst();

                if (modelParam.getType() != null &&
                        DATA_BINDING.equals(modelParam.getKind())) {

                    // Update parameter name
                    if (sourceParam.getName() != null && modelParam.getName() != null) {
                        modelParam.getName().setValue(sourceParam.getName().getValue());
                    }

                    // Update a parameter type while preserving placeholder if it exists
                    if (sourceParam.getType() != null && modelParam.getType() != null) {
                        modelParam.getType().setValue(sourceParam.getType().getValue());
                    }
                }
            }
        }
    }

    private void updatePostProcessActionsFromAnnotation(FunctionDefinitionNode functionNode, Function modelFunc,
                                                        SemanticModel semanticModel) {
        Value postProcessAction = modelFunc.getProperties().get(POST_PROCESS_ACTION);
        if (postProcessAction == null || postProcessAction.getProperties() == null) {
            return;
        }
        Map<String, Value> postProcessProps = postProcessAction.getProperties();
        Value successProperty = postProcessProps.get(POST_PROCESS_ACTION_ON_SUCCESS);
        Value errorProperty = postProcessProps.get(POST_PROCESS_ACTION_ON_ERROR);

        if (functionNode.metadata().isEmpty()) {
            disablePostProcessActions(postProcessAction, successProperty, errorProperty);
            return;
        }

        Optional<AnnotationNode> functionConfig = findFtpAnnotation(
                functionNode.metadata().get().annotations(), FUNCTION_CONFIG, semanticModel);
        if (functionConfig.isEmpty()) {
            disablePostProcessActions(postProcessAction, successProperty, errorProperty);
            return;
        }
        Optional<MappingConstructorExpressionNode> annotValue = functionConfig.get().annotValue();
        if (annotValue.isEmpty()) {
            disablePostProcessActions(postProcessAction, successProperty, errorProperty);
            return;
        }
        boolean hasAfterProcess = false;
        boolean hasAfterError = false;
        for (MappingFieldNode field : annotValue.get().fields()) {
            if (field.kind() != SyntaxKind.SPECIFIC_FIELD) {
                continue;
            }
            SpecificFieldNode specificField = (SpecificFieldNode) field;
            String fieldName = specificField.fieldName().toString().trim();
            Optional<ExpressionNode> valueExpr = specificField.valueExpr();
            if (valueExpr.isEmpty()) {
                continue;
            }
            if (AFTER_PROCESS.equals(fieldName)) {
                hasAfterProcess = true;
                applyPostProcessAction(successProperty, valueExpr.get());
            } else if (AFTER_ERROR.equals(fieldName)) {
                hasAfterError = true;
                applyPostProcessAction(errorProperty, valueExpr.get());
            }
        }
        if (successProperty != null) {
            successProperty.setEnabled(hasAfterProcess);
        }
        if (errorProperty != null) {
            errorProperty.setEnabled(hasAfterError);
        }
        postProcessAction.setEnabled(hasAfterProcess || hasAfterError);
    }

    private void disablePostProcessActions(Value postProcessAction, Value successProperty, Value errorProperty) {
        if (successProperty != null) {
            successProperty.setEnabled(false);
        }
        if (errorProperty != null) {
            errorProperty.setEnabled(false);
        }
        if (postProcessAction != null) {
            postProcessAction.setEnabled(false);
        }
    }

    private void applyPostProcessAction(Value actionProperty, ExpressionNode valueExpr) {
        if (actionProperty == null || actionProperty.getChoices() == null) {
            return;
        }

        if (valueExpr instanceof MappingConstructorExpressionNode mappingExpr) {
            selectPostProcessChoice(actionProperty, ACTION_MOVE, extractMoveProperties(mappingExpr));
            return;
        }

        String exprText = valueExpr.toSourceCode().trim();
        if (exprText.endsWith(ACTION_DELETE)) {
            selectPostProcessChoice(actionProperty, ACTION_DELETE, null);
        }
    }

    private Map<String, String> extractMoveProperties(MappingConstructorExpressionNode mappingExpr) {
        Map<String, String> moveProps = new HashMap<>();
        for (MappingFieldNode field : mappingExpr.fields()) {
            if (field.kind() != SyntaxKind.SPECIFIC_FIELD) {
                continue;
            }
            SpecificFieldNode specificField = (SpecificFieldNode) field;
            String fieldName = specificField.fieldName().toString().trim();
            Optional<ExpressionNode> valueExpr = specificField.valueExpr();
            valueExpr.ifPresent(expressionNode -> moveProps.put(fieldName,
                    expressionNode.toSourceCode().trim()));
        }
        return moveProps;
    }

    private void selectPostProcessChoice(Value actionProperty, String action, Map<String, String> moveProps) {
        for (Value choice : actionProperty.getChoices()) {
            boolean isSelected = action.equals(choice.getValue());
            choice.setEnabled(isSelected);
            if (isSelected && ACTION_MOVE.equals(action) && moveProps != null && choice.getProperties() != null) {
                Value moveTo = choice.getProperties().get(MOVE_TO);
                if (moveTo != null && moveProps.containsKey(MOVE_TO)) {
                    moveTo.setValue(moveProps.get(MOVE_TO));
                }
            }
        }
    }

    private Optional<AnnotationNode> findFtpAnnotation(NodeList<AnnotationNode> annotations, String annotationName,
                                                        SemanticModel semanticModel) {
        for (AnnotationNode annotation : annotations) {
            if (isMatchingFtpAnnotation(annotation, annotationName, semanticModel)) {
                return Optional.of(annotation);
            }
        }
        return Optional.empty();
    }

    private boolean isMatchingFtpAnnotation(AnnotationNode annotation, String annotationName,
                                            SemanticModel semanticModel) {
        Optional<Symbol> symbol = semanticModel.symbol(annotation);
        if (symbol.orElse(null) instanceof AnnotationSymbol annotationSymbol) {
            Optional<ModuleSymbol> module = annotationSymbol.getModule();
            if (module.isEmpty() || annotationSymbol.getName().isEmpty()
                    || !annotationName.equals(annotationSymbol.getName().get())) {
                return false;
            }
            String orgName = module.get().id().orgName();
            String packageName = module.get().id().packageName();
            String moduleName = module.get().id().moduleName();
            return BALLERINA.equals(orgName) && (FTP.equals(packageName) || FTP.equals(moduleName));
        }

        // Fallback when symbol resolution is unavailable (e.g., temporary semantic model issues).
        if (annotation.annotReference() instanceof QualifiedNameReferenceNode qualifiedName) {
            return FTP.equals(qualifiedName.modulePrefix().text())
                    && annotationName.equals(qualifiedName.identifier().text().trim());
        }
        return false;
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
        return findFtpAnnotation(serviceNode.metadata().get().annotations(), SERVICE_CONFIG, semanticModel).isPresent();
    }
}
