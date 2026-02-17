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

package io.ballerina.servicemodelgenerator.extension.builder.function;

import com.google.gson.Gson;
import com.google.gson.stream.JsonReader;
import io.ballerina.compiler.syntax.tree.AnnotationNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingFieldNode;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.FTP;

/**
 * Represents the FTP function builder of the service model generator.
 * Handles post-processing actions for FTP functions.
 *
 * @since 1.5.0
 */
public final class FTPFunctionBuilder extends AbstractFunctionBuilder {

    private static final String FTP_SERVICE_JSON = "services/ftp_service.json";
    private static final String POST_PROCESS_ACTION = "postProcessAction";
    private static final String ON_SUCCESS = "onSuccess";
    private static final String ON_ERROR = "onError";
    private static final String FUNCTION_CONFIG = "FunctionConfig";
    private static final String ANNOTATION_ATTACHMENT = "ANNOTATION_ATTACHMENT";
    private static final String DATA_BINDING = "DATA_BINDING";
    private static final String STREAM = "stream";
    private static final String CONTENT = "content";

    // Post-processing action types
    private static final String ACTION_MOVE = "MOVE";
    private static final String ACTION_DELETE = "DELETE";

    // Property keys for MOVE action
    private static final String MOVE_TO = "moveTo";

    // Annotation field names
    private static final String AFTER_PROCESS = "afterProcess";
    private static final String AFTER_ERROR = "afterError";

    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        processPostProcessActions(context.function());
        return super.updateModel(context);
    }

    @Override
    public Map<String, List<TextEdit>> addModel(AddModelContext context) throws Exception {
        processPostProcessActions(context.function());
        return super.addModel(context);
    }

    @Override
    public Function getModelFromSource(ModelFromSourceContext context) {
        Function functionModel = super.getModelFromSource(context);
        if (context.node() instanceof FunctionDefinitionNode functionNode) {
            functionModel = mergeWithTemplate(functionNode, functionModel);
            updatePostProcessActionsFromAnnotation(functionNode, functionModel);
        }
        return functionModel;
    }

    /**
     * Merges source function details with the FTP template function model.
     * This ensures FTP-specific properties like postProcessAction are available in edit mode.
     */
    private Function mergeWithTemplate(FunctionDefinitionNode functionNode, Function sourceFunction) {
        Optional<Function> templateFunction = getTemplateFunction(functionNode.functionName().text().trim());
        if (templateFunction.isEmpty()) {
            return sourceFunction;
        }

        Function mergedFunction = templateFunction.get();
        mergedFunction.setEnabled(true);
        mergedFunction.setEditable(true);
        mergedFunction.setCodedata(sourceFunction.getCodedata());
        mergedFunction.setDocumentation(sourceFunction.getDocumentation());

        if (sourceFunction.getReturnType() != null && mergedFunction.getReturnType() != null) {
            mergedFunction.getReturnType().setValue(sourceFunction.getReturnType().getValue());
        }

        enableParameters(sourceFunction, mergedFunction);
        updateDatabindingParameter(sourceFunction, mergedFunction);

        if (mergedFunction.getProperties() != null && mergedFunction.getProperties().containsKey(STREAM)) {
            setStreamProperty(mergedFunction, sourceFunction);
        }
        return mergedFunction;
    }

    private Optional<Function> getTemplateFunction(String functionName) {
        InputStream resourceStream = FTPFunctionBuilder.class.getClassLoader().getResourceAsStream(FTP_SERVICE_JSON);
        if (resourceStream == null) {
            return Optional.empty();
        }

        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            Service service = new Gson().fromJson(reader, Service.class);
            if (service == null || service.getFunctions() == null) {
                return Optional.empty();
            }
            return service.getFunctions().stream()
                    .filter(function -> 
                        function.getName() != null && functionName.equals(function.getName().getValue()))
                    .findFirst();
        } catch (IOException ignored) {
            return Optional.empty();
        }
    }

    private static void enableParameters(Function sourceFunc, Function modelFunc) {
        if (modelFunc.getParameters() == null || sourceFunc.getParameters() == null) {
            return;
        }
        modelFunc.getParameters().forEach(parameter -> parameter.setEnabled(false));
        for (Parameter sourceParam : sourceFunc.getParameters()) {
            modelFunc.getParameters().stream()
                    .filter(modelParam -> modelParam.getType().getValue().equals(sourceParam.getType().getValue())
                            || DATA_BINDING.equals(modelParam.getKind())
                            || CONTENT.equals(modelParam.getName().getValue()))
                    .forEach(modelParam -> modelParam.setEnabled(true));
        }
    }

    private static void updateDatabindingParameter(Function sourceFunc, Function modelFunc) {
        if (sourceFunc.getParameters() == null || sourceFunc.getParameters().isEmpty()
                || modelFunc.getParameters() == null || modelFunc.getParameters().isEmpty()) {
            return;
        }

        // In source, the data-binding/content parameter is expected to be the first one.
        Parameter sourceParam = sourceFunc.getParameters().getFirst();
        Parameter modelParam = modelFunc.getParameters().getFirst();
        if (modelParam.getType() != null && DATA_BINDING.equals(modelParam.getKind())) {
            if (sourceParam.getName() != null && modelParam.getName() != null) {
                modelParam.getName().setValue(sourceParam.getName().getValue());
            }
            if (sourceParam.getType() != null && modelParam.getType() != null) {
                modelParam.getType().setValue(sourceParam.getType().getValue());
            }
        }
    }

    private static void setStreamProperty(Function modelFunc, Function sourceFunc) {
        boolean isStream = false;
        if (sourceFunc.getParameters() != null && !sourceFunc.getParameters().isEmpty()) {
            Parameter firstParam = sourceFunc.getParameters().getFirst();
            if (firstParam.getType() != null) {
                String paramType = firstParam.getType().getValue();
                if (paramType != null && paramType.startsWith("stream<")) {
                    isStream = true;
                }
            }
        }

        Value streamProperty = modelFunc.getProperties().get(STREAM);
        if (streamProperty == null) {
            return;
        }
        streamProperty.setValue(String.valueOf(isStream));
        streamProperty.setEnabled(isStream);
        streamProperty.setEditable(false);
    }

    /**
     * Processes the post-processing action properties and converts them to an annotation property.
     * Handles postProcessAction.properties.onSuccess and postProcessAction.properties.onError for all handlers.
     *
     * @param function the function model to process
     */
    private void processPostProcessActions(Function function) {
        Map<String, Value> properties = function.getProperties();
        if (properties == null) {
            return;
        }

        // Handle nested postProcessAction property
        Value postProcessAction = properties.get(POST_PROCESS_ACTION);
        if (postProcessAction == null || postProcessAction.getProperties() == null) {
            return;
        }

        Map<String, Value> actionProperties = postProcessAction.getProperties();
        Value successAction = actionProperties.get(ON_SUCCESS);
        Value errorAction = actionProperties.get(ON_ERROR);

        Value successChoice = getEnabledChoice(successAction);
        Value errorChoice = getEnabledChoice(errorAction);

        // Build annotation content for both actions
        String successAnnotation = buildActionAnnotation(successChoice, AFTER_PROCESS);
        String errorAnnotation = buildActionAnnotation(errorChoice, AFTER_ERROR);

        // Remove the source property
        properties.remove(POST_PROCESS_ACTION);

        // If both are NONE or empty, don't create annotation
        if (successAnnotation.isEmpty() && errorAnnotation.isEmpty()) {
            return;
        }

        // Build combined annotation value
        String annotationValue = buildCombinedAnnotationValue(successAnnotation, errorAnnotation);

        // Create the annotation property
        Codedata codedata = new Codedata.Builder()
                .setType(ANNOTATION_ATTACHMENT)
                .setOriginalName(FUNCTION_CONFIG)
                .setModuleName(FTP)
                .build();

        Value annotationProperty = new Value.ValueBuilder()
                .setCodedata(codedata)
                .value(annotationValue)
                .enabled(true)
                .editable(false)
                .optional(false)
                .setAdvanced(false)
                .build();

        properties.put(FUNCTION_CONFIG, annotationProperty);
    }

    /**
     * Gets the enabled choice from a post-processing action property.
     *
     * @param action the post-processing action property
     * @return the enabled choice, or null if none is enabled
     */
    private Value getEnabledChoice(Value action) {
        if (action == null || action.getChoices() == null || !action.isEnabled()) {
            return null;
        }
        for (Value choice : action.getChoices()) {
            if (choice.isEnabled()) {
                return choice;
            }
        }
        return null;
    }

    /**
     * Builds the annotation content for a single action.
     *
     * @param choice the selected choice
     * @param fieldName the annotation field name (afterProcess or afterError)
     * @return the annotation content string, or empty string if NONE
     */
    private String buildActionAnnotation(Value choice, String fieldName) {
        if (choice == null) {
            return "";
        }

        String actionType = choice.getValue();

        if (ACTION_DELETE.equals(actionType)) {
            return fieldName + ": ftp:DELETE";
        }

        if (ACTION_MOVE.equals(actionType)) {
            Map<String, Value> moveProperties = choice.getProperties();
            if (moveProperties == null) {
                return "";
            }

            Value moveToValue = moveProperties.get(MOVE_TO);
            String moveTo = moveToValue != null && moveToValue.getValue() != null
                    ? moveToValue.getValue() : "";
            String trimmedMoveTo = moveTo.trim();
            if (trimmedMoveTo.isEmpty() || "\"\"".equals(trimmedMoveTo)) {
                return "";
            }

            return fieldName + ": {\n" +
                    "        moveTo: " + moveTo + "\n" +
                    "    }";
        }

        return "";
    }

    /**
     * Builds the combined annotation value from success and error action annotations.
     *
     * @param successAnnotation the success action annotation content
     * @param errorAnnotation the error action annotation content
     * @return the combined annotation value
     */
    private String buildCombinedAnnotationValue(String successAnnotation, String errorAnnotation) {
        StringBuilder builder = new StringBuilder(" {\n");

        if (!successAnnotation.isEmpty()) {
            builder.append("    ").append(successAnnotation);
            if (!errorAnnotation.isEmpty()) {
                builder.append(",\n");
            } else {
                builder.append("\n");
            }
        }

        if (!errorAnnotation.isEmpty()) {
            builder.append("    ").append(errorAnnotation).append("\n");
        }

        builder.append("}");
        return builder.toString();
    }

    private void updatePostProcessActionsFromAnnotation(FunctionDefinitionNode functionNode, Function modelFunc) {
        if (modelFunc.getProperties() == null) {
            return;
        }

        Value postProcessAction = modelFunc.getProperties().get(POST_PROCESS_ACTION);
        if (postProcessAction == null || postProcessAction.getProperties() == null) {
            return;
        }

        Map<String, Value> actionProperties = postProcessAction.getProperties();
        Value successProperty = actionProperties.get(ON_SUCCESS);
        Value errorProperty = actionProperties.get(ON_ERROR);

        if (functionNode.metadata().isEmpty()) {
            if (successProperty != null) {
                successProperty.setEnabled(false);
            }
            if (errorProperty != null) {
                errorProperty.setEnabled(false);
            }
            return;
        }

        Optional<AnnotationNode> functionConfig = findAnnotationBySuffix(
                functionNode.metadata().get().annotations(), FUNCTION_CONFIG);
        if (functionConfig.isEmpty()) {
            if (successProperty != null) {
                successProperty.setEnabled(false);
            }
            if (errorProperty != null) {
                errorProperty.setEnabled(false);
            }
            return;
        }

        Optional<MappingConstructorExpressionNode> annotValue = functionConfig.get().annotValue();
        if (annotValue.isEmpty()) {
            if (successProperty != null) {
                successProperty.setEnabled(false);
            }
            if (errorProperty != null) {
                errorProperty.setEnabled(false);
            }
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

    private Optional<AnnotationNode> findAnnotationBySuffix(NodeList<AnnotationNode> annotations, String suffix) {
        for (AnnotationNode annotation : annotations) {
            String annotationText = annotation.annotReference().toString().trim();
            if (annotationText.endsWith(suffix)) {
                return Optional.of(annotation);
            }
        }
        return Optional.empty();
    }

    @Override
    public String kind() {
        return FTP;
    }
}
