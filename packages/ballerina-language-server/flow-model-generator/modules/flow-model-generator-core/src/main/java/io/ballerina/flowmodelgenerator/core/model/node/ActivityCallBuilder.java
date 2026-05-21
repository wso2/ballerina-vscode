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

package io.ballerina.flowmodelgenerator.core.model.node;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ParameterSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.FunctionSignatureNode;
import io.ballerina.compiler.syntax.tree.ParameterNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.model.node.builtin.BuiltinActivityStrategy;
import io.ballerina.flowmodelgenerator.core.model.node.builtin.EmailActivityStrategy;
import io.ballerina.flowmodelgenerator.core.model.node.builtin.RestActivityStrategy;
import io.ballerina.flowmodelgenerator.core.model.node.builtin.SoapActivityStrategy;
import io.ballerina.flowmodelgenerator.core.utils.FileSystemUtils;
import io.ballerina.flowmodelgenerator.core.utils.ParamUtils;
import io.ballerina.flowmodelgenerator.core.utils.WorkflowUtil;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.FunctionDataBuilder;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.modelgenerator.commons.ParameterData;
import io.ballerina.projects.Module;
import io.ballerina.tools.text.LineRange;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.ACTIVITY_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.BUILTIN_EMAIL_FUNCTION;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.BUILTIN_REST_FUNCTION;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.BUILTIN_SOAP_FUNCTION;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.CONTEXT_CLASS_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.DEFAULT_CTX_PARAM_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;
import static io.ballerina.flowmodelgenerator.core.model.Property.ADVANCED_PARAM_KEY;
import static io.ballerina.flowmodelgenerator.core.utils.WorkflowUtil.isWorkflowContextParameter;

/**
 * Represents a workflow activity call node.
 * Handles both user-defined activity functions and builtin activity functions
 * (callRestAPI, callSoapAPI, sendEmail) from the workflow.activity module.
 *
 * <p>For user-defined activities, generates:
 * {@code int result = check ctx->callActivity(myActivity, {input});}
 *
 * <p>For builtin activities, generates:
 * {@code <T> varName = check ctx->callActivity(activity:<fn>, {connection: <c>, ...});}
 *
 * @since 1.8.0
 */
public class ActivityCallBuilder extends CallBuilder {
    public static final String LABEL = "Activity Call";
    public static final String DESCRIPTION = "Call a workflow activity function";
    public static final String CALL_ACTIVITY_METHOD = "callActivity";
    public static final String DEFAULT_RETURN_TYPE = "anydata";
    public static final String ADVANCE_CONFIGURATIONS = "Activity call configurations";
    public static final String CHECK_ERROR_KEY = "checkError";
    public static final Set<String> EXCLUDED_CALL_ACTIVITY_PARAMS = Set.of("activityFunction", "args", "T",
            CHECK_ERROR_KEY, Property.CONNECTION_KEY);

    private static final String NEW_CONNECTION_SENTINEL = "NEW_CONNECTION";
    private static final String ACTIVITY_MODULE_PREFIX = "activity";
    private static final String DEFAULT_REST_DATABINDING = "json";
    private static final String SOAP_RESPONSE_TYPE = "xml";

    /**
     * Maps builtin activity function symbols to the strategy that handles their form and source generation.
     */
    static final Map<String, BuiltinActivityStrategy> BUILTIN_STRATEGY_MAP = Map.of(
            BUILTIN_REST_FUNCTION, new RestActivityStrategy(),
            BUILTIN_SOAP_FUNCTION, new SoapActivityStrategy(),
            BUILTIN_EMAIL_FUNCTION, new EmailActivityStrategy());

    // Strategy resolved at setConcreteTemplateData time; used by processSpecialParameter
    // (called during super's parameter iteration) and buildBuiltinTemplate.
    private BuiltinActivityStrategy currentBuiltinStrategy;

    @Override
    protected NodeKind getFunctionNodeKind() {
        return NodeKind.ACTIVITY_CALL;
    }

    @Override
    protected FunctionData.Kind getFunctionResultKind() {
        return FunctionData.Kind.ACTIVITY;
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        Codedata codedata = context.codedata();
        currentBuiltinStrategy = ACTIVITY_MODULE.equals(codedata.module())
                ? BUILTIN_STRATEGY_MAP.get(codedata.symbol())
                : null;

        if (currentBuiltinStrategy != null) {
            buildBuiltinTemplate(context, codedata.symbol(), currentBuiltinStrategy);
        } else {
            super.setConcreteTemplateData(context);
            addAdvancedParameters(context, moduleInfo, this);
        }
    }

    /**
     * Builds the form template for a builtin activity (callRestAPI, callSoapAPI, sendEmail).
     * Uses the strategy's setFormProperties instead of reading from the actual function signature,
     * so the form can have rich UX (dropdowns, dual-type fields, dynamic fields).
     */
    private void buildBuiltinTemplate(TemplateContext context, String symbol, BuiltinActivityStrategy strategy) {
        metadata().label(strategy.getLabel()).description(strategy.getDescription());
        codedata().node(NodeKind.ACTIVITY_CALL)
                .org(WORKFLOW_ORG)
                .module(ACTIVITY_MODULE)
                .symbol(symbol);

        properties().connectionSelector(NEW_CONNECTION_SENTINEL,
                strategy.searchNodesKind(), strategy.connectors());

        strategy.setFormProperties(this, context);
        addBuiltinPostProperties(strategy, context);
        addCheckErrorProperty();
        addAdvancedParameters(context, moduleInfo, this);
    }

    private void addBuiltinPostProperties(BuiltinActivityStrategy strategy, TemplateContext context) {
        if (strategy instanceof RestActivityStrategy) {
            properties().custom()
                    .metadata()
                        .label("Databinding")
                        .description("Response data binding type (e.g., json, xml, record type)")
                        .stepOut()
                    .value(DEFAULT_REST_DATABINDING)
                    .type()
                        .fieldType(Property.ValueType.TYPE)
                        .selected(true)
                        .stepOut()
                    .editable(true)
                    .stepOut()
                    .addProperty(Property.TYPE_KEY);

            properties().data(Property.RESULT_NAME, context.getAllVisibleSymbolNames(),
                    Property.RESULT_NAME, Property.RESULT_DOC, false);
        } else if (strategy instanceof SoapActivityStrategy) {
            properties().data(Property.RESULT_NAME, context.getAllVisibleSymbolNames(),
                    Property.RESULT_NAME, Property.RESULT_DOC, false);
        }
        // Email (error? return): no result variable or type field.
    }

    private void addCheckErrorProperty() {
        properties().custom()
                .metadata()
                    .label("Check Error")
                    .description("Add 'check' to propagate errors. Uncheck to handle errors manually.")
                    .stepOut()
                .type().fieldType(Property.ValueType.FLAG).ballerinaType("boolean").selected(true).stepOut()
                .value("true")
                .editable(true)
                .optional(true)
                .stepOut()
                .addProperty(CHECK_ERROR_KEY);
    }

    /**
     * Intercepts the {@code connection} parameter of builtin activity functions and replaces it
     * with a {@code CONNECTION}-type property so the UI renders a connection dropdown.
     */
    @Override
    protected boolean processSpecialParameter(ParameterData paramData) {
        if (currentBuiltinStrategy == null) {
            return false;
        }
        String paramName = ParamUtils.removeLeadingSingleQuote(paramData.name());
        if (!Property.CONNECTION_KEY.equals(paramName)) {
            return false;
        }
        properties().connectionSelector(
                NEW_CONNECTION_SENTINEL,
                currentBuiltinStrategy.searchNodesKind(),
                currentBuiltinStrategy.connectors());
        return true;
    }

    public static void addAdvancedParameters(TemplateContext context, ModuleInfo moduleInfo,
                                             CallBuilder builder) {
        ModuleInfo workflowModuleInfo = new ModuleInfo(WORKFLOW_ORG, WORKFLOW_MODULE, WORKFLOW_MODULE, null);
        FunctionData callActivityData = new FunctionDataBuilder()
                .name(CALL_ACTIVITY_METHOD)
                .moduleInfo(workflowModuleInfo)
                .parentSymbolType(CONTEXT_CLASS_NAME)
                .functionResultKind(FunctionData.Kind.REMOTE)
                .project(PackageUtil.loadProject(context.workspaceManager(), context.filePath()))
                .userModuleInfo(moduleInfo)
                .workspaceManager(context.workspaceManager())
                .filePath(context.filePath())
                .build();

        LinkedHashMap<String, ParameterData> filteredParams = new LinkedHashMap<>(callActivityData.parameters());
        filteredParams.keySet().removeAll(EXCLUDED_CALL_ACTIVITY_PARAMS);
        callActivityData.setParameters(filteredParams);

        Module module = context.workspaceManager().module(context.filePath()).orElse(null);

        builder.properties().nestedProperty();
        builder.setParameterProperties(callActivityData, module);
        builder.properties().endNestedProperty(Property.ValueType.ADVANCE_PARAM_LIST, ADVANCED_PARAM_KEY,
                ADVANCE_CONFIGURATIONS, ADVANCE_CONFIGURATIONS);
    }

    /**
     * Returns the strategy for the given function symbol, or {@code null} if it is not a builtin.
     * Used by CodeAnalyzer when re-populating diagram node properties from source.
     */
    public static BuiltinActivityStrategy getBuiltinStrategy(String functionSymbol) {
        return functionSymbol != null ? BUILTIN_STRATEGY_MAP.get(functionSymbol) : null;
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        BuiltinActivityStrategy strategy = resolveBuiltinStrategy(sourceBuilder.flowNode.codedata());
        if (strategy != null) {
            return toSourceBuiltin(sourceBuilder, strategy);
        }
        return toSourceUserActivity(sourceBuilder);
    }

    private Map<Path, List<TextEdit>> toSourceUserActivity(SourceBuilder sourceBuilder) {
        FlowNode flowNode = sourceBuilder.flowNode;

        Optional<Property> typeProp = sourceBuilder.getProperty(Property.TYPE_KEY);
        Optional<Property> variableProp = sourceBuilder.getProperty(Property.VARIABLE_KEY);

        String resultType = typeProp
                .map(p -> p.value().toString())
                .orElse(DEFAULT_RETURN_TYPE);
        String variableName = variableProp
                .map(p -> p.value().toString())
                .orElse("result");

        String ctxParamName = resolveContextParamName(sourceBuilder);

        Codedata codedata = flowNode.codedata();
        String activityFunctionSymbol = codedata.symbol();
        if (activityFunctionSymbol == null || activityFunctionSymbol.isBlank()) {
            throw new IllegalStateException("ActivityCallBuilder requires a non-empty activity function symbol");
        }

        String qualifiedActivityFunction = getQualifiedActivityFunctionName(sourceBuilder, codedata);

        sourceBuilder.token()
                .name(resultType)
                .whiteSpace()
                .name(variableName)
                .whiteSpace()
                .keyword(SyntaxKind.EQUAL_TOKEN)
                .keyword(SyntaxKind.CHECK_KEYWORD)
                .name(ctxParamName)
                .keyword(SyntaxKind.RIGHT_ARROW_TOKEN)
                .name(CALL_ACTIVITY_METHOD)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN)
                .name(qualifiedActivityFunction)
                .keyword(SyntaxKind.COMMA_TOKEN);

        Map<String, Property> properties = flowNode.properties();
        Set<String> excludedKeys = Set.of(Property.VARIABLE_KEY, Property.TYPE_KEY,
                CHECK_ERROR_KEY, ADVANCED_PARAM_KEY);
        populateActivityCallArg(sourceBuilder, properties, excludedKeys);
        populateAdvancedArgs(sourceBuilder, properties);

        sourceBuilder.token()
                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                .endOfStatement();

        return sourceBuilder.textEdit().build();
    }

    private Map<Path, List<TextEdit>> toSourceBuiltin(SourceBuilder sourceBuilder,
                                                       BuiltinActivityStrategy strategy) {
        LineRange lineRange = sourceBuilder.flowNode.codedata().lineRange();
        if (lineRange == null) {
            throw new IllegalStateException("Line range is not available for the builtin activity node");
        }

        Optional<Property> connectionProp = sourceBuilder.getProperty(Property.CONNECTION_KEY);
        String connection = connectionProp
                .map(p -> p.value() == null ? "" : p.value().toString())
                .orElse("");
        if (connection.isEmpty() || NEW_CONNECTION_SENTINEL.equals(connection)) {
            throw new IllegalStateException("A connection is required for the builtin activity. "
                    + "Pick a module-level final client from the Connection dropdown.");
        }

        Optional<Property> checkErrorProp = sourceBuilder.getProperty(CHECK_ERROR_KEY);
        boolean useCheck = checkErrorProp
                .map(p -> p.value() != null && "true".equals(p.value().toString()))
                .orElse(true);

        String variableName = sourceBuilder.getProperty(Property.VARIABLE_KEY)
                .map(p -> p.value() == null ? "result" : p.value().toString())
                .orElse("result");

        // Determine LHS type and whether to emit a result variable
        String lhsType;
        String databindingType = null;
        boolean hasReturnValue;
        if (strategy instanceof RestActivityStrategy) {
            databindingType = sourceBuilder.getProperty(Property.TYPE_KEY)
                    .map(p -> p.value() != null && !p.value().toString().isEmpty()
                            ? p.value().toString()
                            : DEFAULT_REST_DATABINDING)
                    .orElse(DEFAULT_REST_DATABINDING);
            lhsType = databindingType;
            hasReturnValue = true;
        } else if (strategy instanceof SoapActivityStrategy) {
            lhsType = SOAP_RESPONSE_TYPE;
            hasReturnValue = true;
        } else {
            lhsType = null;
            hasReturnValue = false;
        }

        String ctxParamName = resolveContextParamName(sourceBuilder);

        if (hasReturnValue) {
            String declaredType = useCheck ? lhsType : lhsType + "|error";
            sourceBuilder.token()
                    .name(declaredType)
                    .whiteSpace()
                    .name(variableName)
                    .whiteSpace()
                    .keyword(SyntaxKind.EQUAL_TOKEN);
        }

        if (useCheck) {
            sourceBuilder.token().keyword(SyntaxKind.CHECK_KEYWORD);
        }

        sourceBuilder.token()
                .name(ctxParamName)
                .keyword(SyntaxKind.RIGHT_ARROW_TOKEN)
                .name(CALL_ACTIVITY_METHOD)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN)
                .name(ACTIVITY_MODULE_PREFIX)
                .keyword(SyntaxKind.COLON_TOKEN)
                .name(strategy.activityFunctionSymbol())
                .keyword(SyntaxKind.COMMA_TOKEN);

        // Build args record: { connection: <c>, <strategy-specific args> }
        // NOTE: callRestAPI has `typedesc<anydata> t = <>` for contextual-inference — it must NOT
        // be passed explicitly; the LHS type drives the binding.
        List<String> argEntries = new ArrayList<>();
        argEntries.add("connection: " + connection);
        argEntries.addAll(strategy.getCallActivityArgs(sourceBuilder));

        sourceBuilder.token()
                .keyword(SyntaxKind.OPEN_BRACE_TOKEN)
                .name(String.join(", ", argEntries))
                .keyword(SyntaxKind.CLOSE_BRACE_TOKEN);
        populateAdvancedArgs(sourceBuilder, sourceBuilder.flowNode.properties());
        sourceBuilder.token()
                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                .endOfStatement();

        sourceBuilder.textEdit(SourceBuilder.SourceKind.STATEMENT,
                sourceBuilder.filePath, CommonUtils.toRange(lineRange));

        sourceBuilder.acceptImport(WORKFLOW_ORG, WORKFLOW_MODULE);
        sourceBuilder.acceptImport(WORKFLOW_ORG, ACTIVITY_MODULE);
        for (BuiltinActivityStrategy.Import imp : strategy.getRequiredImports(sourceBuilder)) {
            sourceBuilder.acceptImport(imp.org(), imp.module());
        }

        return sourceBuilder.build();
    }

    private static BuiltinActivityStrategy resolveBuiltinStrategy(Codedata codedata) {
        if (codedata == null || !ACTIVITY_MODULE.equals(codedata.module())) {
            return null;
        }
        return BUILTIN_STRATEGY_MAP.get(codedata.symbol());
    }

    /**
     * Resolves the workflow context parameter name from the enclosing workflow function.
     * If no context parameter exists, one is added automatically.
     */
    public static String resolveContextParamName(SourceBuilder sourceBuilder) {
        try {
            sourceBuilder.workspaceManager.loadProject(sourceBuilder.filePath);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load the project for file: " + sourceBuilder.filePath, e);
        }
        SemanticModel semanticModel = FileSystemUtils.getSemanticModel(sourceBuilder.workspaceManager,
                sourceBuilder.filePath);

        FunctionDefinitionNode functionNode = WorkflowUtil.findEnclosingWorkflowFunction(sourceBuilder);
        if (functionNode == null) {
            throw new IllegalStateException("Activity call must be inside a workflow function");
        }

        Optional<String> optCtxParamName = getContextParamName(functionNode, semanticModel);
        if (optCtxParamName.isPresent()) {
            return optCtxParamName.get();
        }
        addContextParameterToFunction(sourceBuilder, functionNode);
        return DEFAULT_CTX_PARAM_NAME;
    }

    /**
     * Emits a map of activity function parameters as {@code {key: value, ...}} into the source builder.
     */
    public static void populateActivityCallArg(SourceBuilder sourceBuilder, Map<String, Property> properties,
                                               Set<String> excludedKeys) {
        sourceBuilder.token().keyword(SyntaxKind.OPEN_BRACE_TOKEN);
        if (properties != null) {
            boolean isFirstArg = true;
            for (Map.Entry<String, Property> entry : properties.entrySet()) {
                if (excludedKeys.contains(entry.getKey())) {
                    continue;
                }

                Object value = entry.getValue().value();
                if (value == null) {
                    continue;
                }

                if (!isFirstArg) {
                    sourceBuilder.token()
                            .keyword(SyntaxKind.COMMA_TOKEN);
                } else {
                    isFirstArg = false;
                }
                sourceBuilder.token()
                        .whiteSpace()
                        .name(entry.getKey())
                        .keyword(SyntaxKind.COLON_TOKEN)
                        .name(value.toString());
            }
        }
        sourceBuilder.token()
                .keyword(SyntaxKind.CLOSE_BRACE_TOKEN);
    }

    /**
     * Emits activity call options as named arguments into the source builder.
     */
    public static void populateAdvancedArgs(SourceBuilder sourceBuilder, Map<String, Property> properties) {
        if (properties == null) {
            return;
        }
        Property advanceProp = properties.get(ADVANCED_PARAM_KEY);
        if (advanceProp != null && advanceProp.value() instanceof Map<?, ?> advance) {
            for (Map.Entry<?, ?> param : advance.entrySet()) {
                if (param.getKey() instanceof String paramName && !paramName.isEmpty() &&
                        param.getValue() instanceof Map<?, ?> paramProp) {
                    Property paramData = Property.convertToProperty(paramProp);
                    if (paramData.value() != null && !paramData.value().toString().isEmpty()) {
                        sourceBuilder.token()
                                .keyword(SyntaxKind.COMMA_TOKEN)
                                .name(paramName)
                                .whiteSpace()
                                .keyword(SyntaxKind.EQUAL_TOKEN)
                                .param(paramData);
                    }
                }
            }
        }
    }

    public static Optional<String> getContextParamName(FunctionDefinitionNode functionNode,
                                                              SemanticModel semanticModel) {
        SeparatedNodeList<ParameterNode> parameters = functionNode.functionSignature().parameters();
        if (parameters.isEmpty()) {
            return Optional.empty();
        }

        Optional<Symbol> symbol = semanticModel.symbol(parameters.get(0));
        if (symbol.isPresent() && symbol.get().kind() == SymbolKind.PARAMETER) {
            ParameterSymbol paramSymbol = (ParameterSymbol) symbol.get();
            if (isWorkflowContextParameter(paramSymbol)) {
                return paramSymbol.getName();
            }
        }

        return Optional.empty();
    }

    public static void addContextParameterToFunction(SourceBuilder sourceBuilder,
                                                      FunctionDefinitionNode functionNode) {
        FunctionSignatureNode functionSignature = functionNode.functionSignature();
        LineRange closeParenLineRange = functionSignature.openParenToken().lineRange();
        Range insertRange = CommonUtils.toRange(closeParenLineRange.endLine());
        sourceBuilder.token()
                .name(WORKFLOW_MODULE)
                .name(SyntaxKind.COLON_TOKEN.stringValue())
                .name(CONTEXT_CLASS_NAME)
                .whiteSpace()
                .name(DEFAULT_CTX_PARAM_NAME);
        if (!functionSignature.parameters().isEmpty()) {
            sourceBuilder.token().keyword(SyntaxKind.COMMA_TOKEN);
        }
        sourceBuilder.token().skipFormatting().stepOut().textEdit(null, sourceBuilder.filePath, insertRange);
    }

    /**
     * Gets the qualified activity function name, handling both local and imported module functions.
     */
    private String getQualifiedActivityFunctionName(SourceBuilder sourceBuilder, Codedata codedata) {
        String functionSymbol = codedata.symbol();
        String org = codedata.org();
        String module = codedata.module();

        if (org == null || org.isEmpty() || module == null || module.isEmpty()) {
            return functionSymbol;
        }

        boolean isLocalFunction = PackageUtil.isLocalFunction(
                sourceBuilder.workspaceManager, sourceBuilder.filePath, org, module);

        if (isLocalFunction) {
            return functionSymbol;
        }

        String modulePrefix = module.substring(module.lastIndexOf('.') + 1);
        sourceBuilder.acceptImport(org, module);
        return modulePrefix + ":" + functionSymbol;
    }
}
