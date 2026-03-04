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

package io.ballerina.servicemodelgenerator.extension.util;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.AnnotationSymbol;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.syntax.tree.AnnotationNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingFieldNode;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.QualifiedNameReferenceNode;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.Value;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.BALLERINA;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.FTP;

/**
 * Shared helper methods for FTP function-model extraction and mapping.
 *
 * @since 1.6.0
 */
public final class FTPFunctionModelUtil {

    public static final String DATA_BINDING = "DATA_BINDING";
    public static final String STREAM = "stream";
    public static final String CONTENT = "content";
    public static final String POST_PROCESS_ACTION = "postProcessAction";
    public static final String POST_PROCESS_ACTION_ON_SUCCESS = "onSuccess";
    public static final String POST_PROCESS_ACTION_ON_ERROR = "onError";
    public static final String FUNCTION_CONFIG = "FunctionConfig";
    public static final String AFTER_PROCESS = "afterProcess";
    public static final String AFTER_ERROR = "afterError";
    public static final String ACTION_DELETE = "DELETE";
    public static final String ACTION_MOVE = "MOVE";
    public static final String MOVE_TO = "moveTo";

    private FTPFunctionModelUtil() {
    }

    /**
     * Shared function-shape synchronization used by FTP service/function source extraction flows.
     * Currently used by {@code FTPServiceBuilder#getModelFromSource} and
     * {@code FTPFunctionBuilder#mergeWithTemplate}.
     */
    public static void syncFunctionFromSource(Function sourceFunc, Function modelFunc,
                                              boolean createStreamPropertyIfMissing) {
        if (sourceFunc == null || modelFunc == null) {
            return;
        }

        enableParameters(sourceFunc, modelFunc);
        updateDatabindingParameter(sourceFunc, modelFunc);
        syncStreamProperty(sourceFunc, modelFunc, createStreamPropertyIfMissing);
    }

    /**
     * Shared mapper from {@code @ftp:FunctionConfig} annotation values to UI-facing postProcessAction properties.
     * Used by both service-level and function-level model-from-source endpoints.
     */
    public static void populatePostProcessActionsFromAnnotation(FunctionDefinitionNode functionNode, Function modelFunc,
                                                                SemanticModel semanticModel,
                                                                boolean disableRootProperty) {
        Value postProcessAction = modelFunc.getProperties().get(POST_PROCESS_ACTION);
        if (postProcessAction == null || postProcessAction.getProperties() == null) {
            return;
        }

        Map<String, Value> postProcessProps = postProcessAction.getProperties();
        Value successProperty = postProcessProps.get(POST_PROCESS_ACTION_ON_SUCCESS);
        Value errorProperty = postProcessProps.get(POST_PROCESS_ACTION_ON_ERROR);

        if (functionNode.metadata().isEmpty()) {
            disablePostProcessActions(postProcessAction, successProperty, errorProperty, disableRootProperty);
            return;
        }

        Optional<AnnotationNode> functionConfig = findFtpAnnotation(functionNode.metadata().get().annotations(),
                FUNCTION_CONFIG, semanticModel);
        if (functionConfig.isEmpty()) {
            disablePostProcessActions(postProcessAction, successProperty, errorProperty, disableRootProperty);
            return;
        }

        Optional<MappingConstructorExpressionNode> annotValue = functionConfig.get().annotValue();
        if (annotValue.isEmpty()) {
            disablePostProcessActions(postProcessAction, successProperty, errorProperty, disableRootProperty);
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
        if (disableRootProperty) {
            postProcessAction.setEnabled(hasAfterProcess || hasAfterError);
        }
    }

    /**
     * Shared FTP annotation resolver used by FTP service/function builders.
     * Supports semantic-model-based checks with source-text fallbacks.
     */
    public static Optional<AnnotationNode> findFtpAnnotation(NodeList<AnnotationNode> annotations,
                                                              String annotationName,
                                                              SemanticModel semanticModel) {
        for (AnnotationNode annotation : annotations) {
            if (isMatchingFtpAnnotation(annotation, annotationName, semanticModel)) {
                return Optional.of(annotation);
            }
        }
        return Optional.empty();
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

    private static void syncStreamProperty(Function sourceFunc, Function modelFunc,
                                           boolean createStreamPropertyIfMissing) {
        boolean isStream = isStreamParameter(sourceFunc);
        Value streamProperty = modelFunc.getProperties().get(STREAM);
        if (streamProperty == null) {
            if (!createStreamPropertyIfMissing) {
                return;
            }
            streamProperty = new Value.ValueBuilder()
                    .value(String.valueOf(isStream))
                    .enabled(isStream)
                    .editable(false)
                    .optional(false)
                    .setAdvanced(false)
                    .build();
            modelFunc.addProperty(STREAM, streamProperty);
            return;
        }
        streamProperty.setValue(String.valueOf(isStream));
        streamProperty.setEnabled(isStream);
        streamProperty.setEditable(false);
    }

    private static boolean isStreamParameter(Function sourceFunc) {
        if (sourceFunc.getParameters() == null || sourceFunc.getParameters().isEmpty()) {
            return false;
        }
        Parameter firstParam = sourceFunc.getParameters().getFirst();
        if (firstParam.getType() == null) {
            return false;
        }
        String paramType = firstParam.getType().getValue();
        return paramType != null && paramType.startsWith("stream<");
    }

    private static void disablePostProcessActions(Value postProcessAction, Value successProperty, Value errorProperty,
                                                  boolean disableRootProperty) {
        if (successProperty != null) {
            successProperty.setEnabled(false);
        }
        if (errorProperty != null) {
            errorProperty.setEnabled(false);
        }
        if (disableRootProperty && postProcessAction != null) {
            postProcessAction.setEnabled(false);
        }
    }

    private static void applyPostProcessAction(Value actionProperty, ExpressionNode valueExpr) {
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

    private static Map<String, String> extractMoveProperties(MappingConstructorExpressionNode mappingExpr) {
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

    private static void selectPostProcessChoice(Value actionProperty, String action, Map<String, String> moveProps) {
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

    private static boolean isMatchingFtpAnnotation(AnnotationNode annotation, String annotationName,
                                                   SemanticModel semanticModel) {
        if (semanticModel != null) {
            Optional<Symbol> symbol = semanticModel.symbol(annotation);
            if (symbol.orElse(null) instanceof AnnotationSymbol annotationSymbol) {
                Optional<ModuleSymbol> module = annotationSymbol.getModule();
                if (module.isPresent() && annotationSymbol.getName().isPresent()
                        && annotationName.equals(annotationSymbol.getName().get())) {
                    String orgName = module.get().id().orgName();
                    String packageName = module.get().id().packageName();
                    String moduleName = module.get().id().moduleName();
                    return BALLERINA.equals(orgName) && (FTP.equals(packageName) || FTP.equals(moduleName));
                }
            }
        }

        if (annotation.annotReference() instanceof QualifiedNameReferenceNode qualifiedName) {
            return FTP.equals(qualifiedName.modulePrefix().text())
                    && annotationName.equals(qualifiedName.identifier().text().trim());
        }

        String annotationText = annotation.annotReference().toString().trim();
        return annotationText.endsWith(annotationName);
    }
}
