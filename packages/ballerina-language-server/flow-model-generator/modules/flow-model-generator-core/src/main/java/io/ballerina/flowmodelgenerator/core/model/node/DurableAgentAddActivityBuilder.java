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

import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Option;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.model.node.builtin.BuiltinActivityStrategy;
import io.ballerina.flowmodelgenerator.core.utils.WorkflowUtil;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.modelgenerator.commons.ParameterData;
import io.ballerina.projects.Package;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.ACTIVITY_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.AGENT_CONTEXT_CLASS_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.REGISTER_ACTIVITY_METHOD_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.REGISTER_ACTIVITY_DESCRIPTION;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.REGISTER_ACTIVITY_LABEL;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Registers a workflow activity as a durable agent tool. Generates
 * {@code check durableAgentContext.registerActivity(<activity>);}.
 *
 * <p>Built-in activities (Call REST API, Call SOAP API, Send Email) are registered as-is — no wrapper
 * function. Their form reuses the built-in strategy fields plus a connection selector; every value the
 * user fills is fixed at registration via {@code bindings} (the connection travels as a
 * {@code "connection:<name>"} marker), and everything left blank stays model-controlled:
 * {@code check durableAgentContext.registerActivity(activity:callRestAPI, name = ..., description = ...,
 * bindings = {connection: api, method: "GET"});}
 *
 * @since 1.8.0
 */
public class DurableAgentAddActivityBuilder extends CallBuilder {

    public static final String ACTIVITY_KEY = "activity";
    public static final String ACTIVITY_LABEL = "Activity";
    public static final String ACTIVITY_DOC = "The @workflow:Activity function to expose as an agent tool";

    public static final String TOOL_NAME_KEY = "name";
    public static final String TOOL_NAME_LABEL = "Tool Name";
    public static final String TOOL_NAME_DOC = "The tool name advertised to the model. Defaults to the function name";
    public static final String TOOL_DESCRIPTION_KEY = "description";
    public static final String TOOL_DESCRIPTION_LABEL = "Description";
    public static final String TOOL_DESCRIPTION_DOC =
            "Tells the model what this tool does and when to use it";

    public static final String REQUIRES_APPROVAL_KEY = "requiresApproval";
    public static final String REQUIRES_APPROVAL_LABEL = "Requires Approval";
    public static final String REQUIRES_APPROVAL_DOC =
            "Gate this tool: before the agent runs it, a review activity is created and the agent suspends "
            + "durably until a reviewer proceeds (optionally editing the arguments) or rejects.";

    private static final String NEW_CONNECTION_SENTINEL = "NEW_CONNECTION";
    private static final String ACTIVITY_MODULE_PREFIX = "activity";

    @Override
    protected NodeKind getFunctionNodeKind() {
        return NodeKind.DURABLE_AGENT_ADD_ACTIVITY;
    }

    @Override
    protected FunctionData.Kind getFunctionResultKind() {
        return FunctionData.Kind.FUNCTION;
    }

    @Override
    public void setConcreteConstData() {
        metadata().label(REGISTER_ACTIVITY_LABEL).description(REGISTER_ACTIVITY_DESCRIPTION);
        codedata()
                .node(NodeKind.DURABLE_AGENT_ADD_ACTIVITY)
                .org(WORKFLOW_ORG)
                .module(WORKFLOW_MODULE)
                .object(AGENT_CONTEXT_CLASS_NAME)
                .symbol(REGISTER_ACTIVITY_METHOD_NAME);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        setConcreteConstData();

        // Built-in activity selected from the agent's activity search: render the built-in
        // registration form (connection + strategy fields become bindings) instead of the
        // user-activity selector.
        BuiltinActivityStrategy strategy = resolveBuiltinStrategy(context.codedata());
        if (strategy != null) {
            buildBuiltinRegistrationTemplate(context, strategy);
            return;
        }

        // When the node comes from the activity search list, its codedata symbol is the chosen
        // activity function — pre-select it. (The palette entry's symbol is the method name.)
        String preSelected = "";
        String contextSymbol = context.codedata() == null ? null : context.codedata().symbol();
        if (contextSymbol != null && !contextSymbol.isEmpty()
                && !REGISTER_ACTIVITY_METHOD_NAME.equals(contextSymbol)) {
            preSelected = contextSymbol;
        }

        properties().custom()
                .metadata()
                    .label(ACTIVITY_LABEL)
                    .description(ACTIVITY_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.SINGLE_SELECT)
                    .options(getActivityFunctions(context))
                    .selected(true)
                    .stepOut()
                .codedata()
                    .kind(ParameterData.Kind.REQUIRED.name())
                    .stepOut()
                .value(preSelected)
                .editable(true)
                .stepOut()
                .addProperty(ACTIVITY_KEY);
        addRequiresApprovalProperty();
        properties().checkError(true);
    }

    // A FLAG that, when true, emits `requiresApproval = true` so the tool is gated by a review activity.
    private void addRequiresApprovalProperty() {
        properties().custom()
                .metadata()
                    .label(REQUIRES_APPROVAL_LABEL)
                    .description(REQUIRES_APPROVAL_DOC)
                    .stepOut()
                .type().fieldType(Property.ValueType.FLAG).ballerinaType("boolean").selected(true).stepOut()
                .value("false")
                .editable(true)
                .optional(true)
                .advanced(true)
                .stepOut()
                .addProperty(REQUIRES_APPROVAL_KEY);
    }

    /**
     * Form for registering a built-in activity as an agent tool. The connection selector and the
     * strategy's own fields (method/path for REST, the email fields, …) act as bindings: whatever the
     * user fills is fixed at registration, whatever stays blank remains model-controlled. Tool name and
     * description shape what the model sees.
     */
    private void buildBuiltinRegistrationTemplate(TemplateContext context, BuiltinActivityStrategy strategy) {
        metadata().label(strategy.getLabel()).description(strategy.getDescription());
        codedata()
                .node(NodeKind.DURABLE_AGENT_ADD_ACTIVITY)
                .org(WORKFLOW_ORG)
                .module(ACTIVITY_MODULE)
                .object(AGENT_CONTEXT_CLASS_NAME)
                .symbol(strategy.activityFunctionSymbol());

        addStringProperty(TOOL_NAME_KEY, TOOL_NAME_LABEL, TOOL_NAME_DOC, strategy.activityFunctionSymbol(), true);
        properties().custom()
                .metadata()
                    .label(TOOL_DESCRIPTION_LABEL)
                    .description(TOOL_DESCRIPTION_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.DOC_TEXT)
                    .ballerinaType("string")
                    .selected(true)
                    .stepOut()
                .value("")
                .placeholder(strategy.getDescription())
                .editable(true)
                .optional(true)
                .stepOut()
                .addProperty(TOOL_DESCRIPTION_KEY);

        properties().connectionSelector(NEW_CONNECTION_SENTINEL,
                strategy.searchNodesKind(), strategy.connectors());
        strategy.setFormProperties(this, context);
        addRequiresApprovalProperty();
        properties().checkError(true);
    }

    private void addStringProperty(String key, String label, String doc, String placeholder, boolean optional) {
        properties().custom()
                .metadata()
                    .label(label)
                    .description(doc)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.TEXT)
                    .ballerinaType("string")
                    .selected(true)
                    .stepOut()
                .value("")
                .placeholder(placeholder)
                .editable(true)
                .optional(optional)
                .stepOut()
                .addProperty(key);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        BuiltinActivityStrategy strategy = resolveBuiltinStrategy(sourceBuilder.flowNode.codedata());
        if (strategy != null) {
            return toSourceBuiltinRegistration(sourceBuilder, strategy);
        }

        // Object model: the capability lives on the declaration's `activities` list.
        if (WorkflowUtil.isDurableAgentObjectTarget(sourceBuilder)) {
            if (WorkflowUtil.isCapabilityDeleteRequest(sourceBuilder)) {
                return WorkflowUtil.removeAgentCapabilityEntry(sourceBuilder);
            }
            String activityRef = sourceBuilder.getProperty(ACTIVITY_KEY)
                    .map(p -> p.value() == null ? "" : p.value().toString().trim()).orElse("");
            if (activityRef.isBlank()) {
                throw new IllegalStateException("An activity function must be selected");
            }
            String toolName = sourceBuilder.getProperty(TOOL_NAME_KEY)
                    .map(p -> p.value() == null ? "" : p.value().toString().trim()).orElse("");
            String toolDescription = sourceBuilder.getProperty(TOOL_DESCRIPTION_KEY)
                    .map(p -> p.value() == null ? "" : p.value().toString().trim()).orElse("");
            boolean requiresApproval = isRequiresApproval(sourceBuilder);
            String entry;
            if (toolName.isBlank() && toolDescription.isBlank() && !requiresApproval) {
                entry = activityRef;
            } else {
                StringBuilder mapping = new StringBuilder("{activity: ").append(activityRef);
                if (!toolName.isBlank()) {
                    mapping.append(", name: ").append(WorkflowUtil.quoteIfPlain(toolName));
                }
                if (!toolDescription.isBlank()) {
                    mapping.append(", description: ").append(WorkflowUtil.quoteIfPlain(toolDescription));
                }
                if (requiresApproval) {
                    mapping.append(", requiresApproval: true");
                }
                entry = mapping.append("}").toString();
            }
            return WorkflowUtil.upsertAgentCapabilityEntry(sourceBuilder, "activities", entry);
        }

        String ctxParamName = WorkflowUtil.resolveAgentContextParamName(sourceBuilder);
        Optional<Property> activityProperty = sourceBuilder.getProperty(ACTIVITY_KEY);
        String activity = activityProperty.map(p -> p.value() == null ? "" : p.value().toString()).orElse("");
        if (activity.isBlank()) {
            throw new IllegalStateException("An activity function must be selected");
        }

        String args = activity;
        if (isRequiresApproval(sourceBuilder)) {
            args += ", requiresApproval = true";
        }
        sourceBuilder.token()
                .keyword(SyntaxKind.CHECK_KEYWORD)
                .name(ctxParamName)
                .keyword(SyntaxKind.DOT_TOKEN)
                .name(REGISTER_ACTIVITY_METHOD_NAME)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN)
                .name(args)
                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                .endOfStatement();

        return sourceBuilder
                .textEdit()
                .acceptImport(WORKFLOW_ORG, WORKFLOW_MODULE)
                .build();
    }

    /**
     * Generates the as-is registration of a built-in activity: filled form values become
     * {@code bindings} (fixed arguments the model never sees), the connection is referenced by its
     * module-level variable name, and the built-in function itself is passed unwrapped.
     */
    private Map<Path, List<TextEdit>> toSourceBuiltinRegistration(SourceBuilder sourceBuilder,
                                                                  BuiltinActivityStrategy strategy) {
        String ctxParamName = WorkflowUtil.resolveAgentContextParamName(sourceBuilder);

        String connection = sourceBuilder.getProperty(Property.CONNECTION_KEY)
                .map(p -> p.value() == null ? "" : p.value().toString())
                .orElse("");
        if (connection.isEmpty() || NEW_CONNECTION_SENTINEL.equals(connection)) {
            throw new IllegalStateException("A connection is required for the built-in activity. "
                    + "Pick a module-level final client from the Connection dropdown.");
        }

        List<String> bindingFields = new ArrayList<>();
        bindingFields.add(Property.CONNECTION_KEY + ": " + connection);
        bindingFields.addAll(strategy.getCallActivityArgs(sourceBuilder));

        StringBuilder callArgs = new StringBuilder();
        callArgs.append(ACTIVITY_MODULE_PREFIX).append(":").append(strategy.activityFunctionSymbol());
        String toolName = stringPropertyValue(sourceBuilder, TOOL_NAME_KEY);
        if (!toolName.isEmpty()) {
            callArgs.append(", ").append(TOOL_NAME_KEY).append(" = ").append(quoted(toolName));
        }
        String toolDescription = stringPropertyValue(sourceBuilder, TOOL_DESCRIPTION_KEY);
        if (!toolDescription.isEmpty()) {
            callArgs.append(", ").append(TOOL_DESCRIPTION_KEY).append(" = ").append(quoted(toolDescription));
        }
        callArgs.append(", bindings = {").append(String.join(", ", bindingFields)).append("}");
        if (isRequiresApproval(sourceBuilder)) {
            callArgs.append(", requiresApproval = true");
        }

        sourceBuilder.token()
                .keyword(SyntaxKind.CHECK_KEYWORD)
                .name(ctxParamName)
                .keyword(SyntaxKind.DOT_TOKEN)
                .name(REGISTER_ACTIVITY_METHOD_NAME)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN)
                .name(callArgs.toString())
                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                .endOfStatement();

        sourceBuilder.textEdit()
                .acceptImport(WORKFLOW_ORG, WORKFLOW_MODULE)
                .acceptImport(WORKFLOW_ORG, ACTIVITY_MODULE);
        for (BuiltinActivityStrategy.Import imp : strategy.getRequiredImports(sourceBuilder)) {
            sourceBuilder.acceptImport(imp.org(), imp.module());
        }
        return sourceBuilder.build();
    }

    private static BuiltinActivityStrategy resolveBuiltinStrategy(Codedata codedata) {
        if (codedata == null || !ACTIVITY_MODULE.equals(codedata.module())) {
            return null;
        }
        return ActivityCallBuilder.BUILTIN_STRATEGY_MAP.get(codedata.symbol());
    }

    private static boolean isRequiresApproval(SourceBuilder sourceBuilder) {
        return sourceBuilder.getProperty(REQUIRES_APPROVAL_KEY)
                .map(p -> p.value() != null && "true".equals(p.value().toString()))
                .orElse(false);
    }

    private static String stringPropertyValue(SourceBuilder sourceBuilder, String key) {
        return sourceBuilder.getProperty(key)
                .map(p -> p.value() == null ? "" : p.value().toString().trim())
                .orElse("");
    }

    private static String quoted(String value) {
        if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
            return value;
        }
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private List<Option> getActivityFunctions(TemplateContext context) {
        List<Option> options = new ArrayList<>();
        Package currentPackage = PackageUtil.loadProject(context.workspaceManager(), context.filePath())
                .currentPackage();
        PackageUtil.getCompilation(currentPackage);
        // A module whose compilation fails (e.g. an unresolvable dependency) is skipped so the
        // selector still lists the activities from the modules that do resolve.
        currentPackage.modules().forEach(module -> {
            try {
                module.getCompilation().getSemanticModel().moduleSymbols().stream()
                        .filter(symbol -> symbol.kind() == SymbolKind.FUNCTION)
                        .map(symbol -> (FunctionSymbol) symbol)
                        .filter(WorkflowUtil::isActivityFunction)
                        .forEach(funcSymbol -> funcSymbol.getName().ifPresent(name ->
                                options.add(new Option(name, name))));
            } catch (RuntimeException e) {
                // Skip unresolvable module.
            }
        });
        return options;
    }
}
