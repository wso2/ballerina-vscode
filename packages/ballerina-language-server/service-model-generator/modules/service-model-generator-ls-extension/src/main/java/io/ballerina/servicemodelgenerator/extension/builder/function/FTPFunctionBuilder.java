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
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import io.ballerina.servicemodelgenerator.extension.util.FTPFunctionModelUtil;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.FTP;
import static io.ballerina.servicemodelgenerator.extension.util.FTPFunctionModelUtil.ACTION_DELETE;
import static io.ballerina.servicemodelgenerator.extension.util.FTPFunctionModelUtil.ACTION_MOVE;
import static io.ballerina.servicemodelgenerator.extension.util.FTPFunctionModelUtil.AFTER_ERROR;
import static io.ballerina.servicemodelgenerator.extension.util.FTPFunctionModelUtil.AFTER_PROCESS;
import static io.ballerina.servicemodelgenerator.extension.util.FTPFunctionModelUtil.FUNCTION_CONFIG;
import static io.ballerina.servicemodelgenerator.extension.util.FTPFunctionModelUtil.MOVE_TO;
import static io.ballerina.servicemodelgenerator.extension.util.FTPFunctionModelUtil.POST_PROCESS_ACTION;
import static io.ballerina.servicemodelgenerator.extension.util.FTPFunctionModelUtil.POST_PROCESS_ACTION_ON_ERROR;
import static io.ballerina.servicemodelgenerator.extension.util.FTPFunctionModelUtil.POST_PROCESS_ACTION_ON_SUCCESS;

/**
 * Represents the FTP function builder of the service model generator.
 * Handles post-processing actions for FTP functions.
 *
 * @since 1.5.0
 */
public final class FTPFunctionBuilder extends AbstractFunctionBuilder {

    private static final String FTP_SERVICE_JSON = "services/ftp_service.json";
    private static final String ANNOTATION_ATTACHMENT = "ANNOTATION_ATTACHMENT";

    /**
     * Invoked by {@code serviceDesign/updateFunction} through {@code FunctionBuilderRouter} when the frontend
     * updates an existing FTP handler.
     */
    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        processPostProcessActions(context.function());
        return super.updateModel(context);
    }

    /**
     * Invoked by {@code serviceDesign/addFunction} through {@code FunctionBuilderRouter} when the frontend adds
     * a new FTP handler.
     */
    @Override
    public Map<String, List<TextEdit>> addModel(AddModelContext context) throws Exception {
        processPostProcessActions(context.function());
        return super.addModel(context);
    }

    /**
     * Invoked by {@code serviceDesign/getFunctionFromSource} to load a single FTP handler model for edit flows.
     */
    @Override
    public Function getModelFromSource(ModelFromSourceContext context) {
        Function functionModel = super.getModelFromSource(context);
        if (context.node() instanceof FunctionDefinitionNode functionNode) {
            functionModel = mergeWithTemplate(functionNode, functionModel);
            FTPFunctionModelUtil.populatePostProcessActionsFromAnnotation(functionNode, functionModel,
                    context.semanticModel(), false);
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

        FTPFunctionModelUtil.syncFunctionFromSource(sourceFunction, mergedFunction, false);
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

    /**
     * Processes the post-processing action properties and converts them to an annotation property.
     * Handles postProcessAction.properties.onSuccess and postProcessAction.properties.onError for all handlers.
     *
     * @param function the function model to process
     */
    private void processPostProcessActions(Function function) {
        Map<String, Value> properties = function.getProperties();

        // Handle nested postProcessAction property
        Value postProcessAction = properties.get(POST_PROCESS_ACTION);
        if (postProcessAction == null || postProcessAction.getProperties() == null) {
            return;
        }

        Map<String, Value> actionProperties = postProcessAction.getProperties();
        Value successAction = actionProperties.get(POST_PROCESS_ACTION_ON_SUCCESS);
        Value errorAction = actionProperties.get(POST_PROCESS_ACTION_ON_ERROR);

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
            String moveTo = "";
            if (moveToValue != null) {
                String valueString = moveToValue.getValueString();
                if (valueString != null && !valueString.isEmpty()) {
                    moveTo = valueString;
                } else if (moveToValue.getValue() != null) {
                    moveTo = moveToValue.getValue();
                }
            }

            String trimmedMoveTo = moveTo.trim();
            if (trimmedMoveTo.isEmpty() || "\"\"".equals(trimmedMoveTo) || "''".equals(trimmedMoveTo)) {
                return "";
            }
            String templateContent = trimmedMoveTo.replaceFirst("^string\\s*`([\\s\\S]*)`$", "$1");
            if (!templateContent.equals(trimmedMoveTo) && templateContent.trim().isEmpty()) {
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

    /**
     * Router key used by {@code FunctionBuilderRouter} to bind FTP function operations to this builder.
     */
    @Override
    public String kind() {
        return FTP;
    }
}
