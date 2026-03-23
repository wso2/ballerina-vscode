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
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.syntax.tree.DefaultableParameterNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.FunctionSignatureNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.ParameterNode;
import io.ballerina.compiler.syntax.tree.RequiredParameterNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.Token;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.utils.FileSystemUtils;
import io.ballerina.flowmodelgenerator.core.utils.TypeUtils;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.CONTEXT_CLASS_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.DEFAULT_CTX_PARAM_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;
import static io.ballerina.flowmodelgenerator.core.utils.WorkflowUtil.isWorkflowModule;

/**
 * Represents a workflow activity call node.
 * This generates code like: int result = check ctx->callActivity(myActivity, input);
 *
 * @since 2.0.0
 */
public class ActivityCallBuilder extends CallBuilder {
    public static final String LABEL = "Activity Call";
    public static final String DESCRIPTION = "Call a workflow activity function";
    public static final String CALL_ACTIVITY_METHOD = "callActivity";
    public static final String DEFAULT_RETURN_TYPE = "anydata";
    public static final String OPTIONS_PARAM_KEY = "options";
    public static final String ADVANCE_CONFIGURATIONS = "Activity call configurations";
    private static final Set<String> EXCLUDED_CALL_ACTIVITY_PARAMS = Set.of("activityFunction", "args", "T");

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
        super.setConcreteTemplateData(context);
        addCallActivityOptions(context, moduleInfo, this);
    }

    public static void addCallActivityOptions(TemplateContext context, ModuleInfo moduleInfo,
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
        builder.properties().endNestedProperty(Property.ValueType.ADVANCE_PARAM_LIST, OPTIONS_PARAM_KEY,
                ADVANCE_CONFIGURATIONS, ADVANCE_CONFIGURATIONS);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        FlowNode flowNode = sourceBuilder.flowNode;

        // Get properties
        Optional<Property> typeProp = sourceBuilder.getProperty(Property.TYPE_KEY);
        Optional<Property> variableProp = sourceBuilder.getProperty(Property.VARIABLE_KEY);

        String resultType = typeProp
                .map(p -> p.value().toString())
                .orElse(DEFAULT_RETURN_TYPE);
        String variableName = variableProp
                .map(p -> p.value().toString())
                .orElse("result");

        String ctxParamName = resolveContextParamName(sourceBuilder);

        // Get activity function from codedata.symbol()
        Codedata codedata = flowNode.codedata();
        String activityFunctionSymbol = codedata.symbol();
        if (activityFunctionSymbol == null || activityFunctionSymbol.isBlank()) {
            throw new IllegalStateException("ActivityCallBuilder requires a non-empty activity function symbol");
        }

        // Determine if the activity function is from the current module or an imported module
        // If from an imported module, use module-qualified name (modulePrefix:functionName)
        String qualifiedActivityFunction = getQualifiedActivityFunctionName(sourceBuilder, codedata);

        // Generate: int result = check ctx->callActivity(myActivity, input);
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
                Property.CHECK_ERROR_KEY, OPTIONS_PARAM_KEY);
        emitArgsMap(sourceBuilder, properties, excludedKeys);
        emitOptionsNamedArgs(sourceBuilder, properties);

        sourceBuilder.token()
                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                .endOfStatement();

        return sourceBuilder.textEdit().build();
    }

    /**
     * Resolves the workflow context parameter name from the enclosing workflow function.
     * If no context parameter exists, one is added automatically.
     *
     * @param sourceBuilder the source builder
     * @return the context parameter name
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
     *
     * @param sourceBuilder the source builder
     * @param properties    the flow node properties
     * @param excludedKeys  property keys to exclude from the map
     */
    public static void emitArgsMap(SourceBuilder sourceBuilder, Map<String, Property> properties,
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
     *
     * @param sourceBuilder the source builder
     * @param properties    the flow node properties
     */
    public static void emitOptionsNamedArgs(SourceBuilder sourceBuilder, Map<String, Property> properties) {
        if (properties == null) {
            return;
        }
        Property optionsProp = properties.get(OPTIONS_PARAM_KEY);
        if (optionsProp != null && optionsProp.value() instanceof Map<?, ?> options) {
            for (Map.Entry<?, ?> optionEntry : options.entrySet()) {
                if (optionEntry.getKey() instanceof String paramName && !paramName.isEmpty() &&
                        optionEntry.getValue() instanceof Map<?, ?> option) {
                    Property optionProp = Property.convertToProperty(option);
                    if (optionProp.value() != null) {
                        sourceBuilder.token()
                                .keyword(SyntaxKind.COMMA_TOKEN)
                                .name(paramName)
                                .whiteSpace()
                                .keyword(SyntaxKind.EQUAL_TOKEN)
                                .param(optionProp);
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
        ParameterNode lastParam = parameters.get(0);

        Node typeNode = null;
        String paramName = null;
        if (lastParam.kind() == SyntaxKind.REQUIRED_PARAM) {
            RequiredParameterNode requiredParam = (RequiredParameterNode) lastParam;
            typeNode = requiredParam.typeName();
            Optional<Token> optParamName = requiredParam.paramName();
            if (optParamName.isEmpty()) {
                return Optional.empty();
            }
            paramName = optParamName.get().text();
        } else if (lastParam.kind() == SyntaxKind.DEFAULTABLE_PARAM) {
            DefaultableParameterNode defaultableParam = (DefaultableParameterNode) lastParam;
            typeNode = defaultableParam.typeName();
            Optional<Token> optParamName = defaultableParam.paramName();
            if (optParamName.isEmpty()) {
                return Optional.empty();
            }
            paramName = optParamName.get().text();
        }

        if (typeNode == null) {
            return Optional.empty();
        }

        Optional<Symbol> symbol = semanticModel.symbol(typeNode);
        if (symbol.isPresent() && symbol.get().kind() == SymbolKind.TYPE) {
            TypeSymbol typeSymbol = TypeUtils.resolveTypeReference((TypeSymbol) symbol.get());
            if (typeSymbol.getName().orElse("").equals(CONTEXT_CLASS_NAME) &&
                    isWorkflowModule(typeSymbol.getModule())) {
                return Optional.of(paramName);
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
     * For local functions, returns just the function symbol name.
     * For imported module functions, returns the module-qualified name (modulePrefix:functionName).
     *
     * @param sourceBuilder The source builder
     * @param codedata      The codedata containing function and module information
     * @return The qualified activity function name
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

        // Get the module prefix (last part after the dot, e.g., "mymodule" from "org/pkg.mymodule")
        String modulePrefix = module.substring(module.lastIndexOf('.') + 1);
        sourceBuilder.acceptImport(org, module);
        return modulePrefix + ":" + functionSymbol;
    }
}
