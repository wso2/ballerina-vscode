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

import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.ParameterData;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.CALL_HUMAN_TASK_METHOD_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.CONTEXT_CLASS_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.HUMAN_TASK_DESCRIPTION;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.HUMAN_TASK_LABEL;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Represents a workflow human task node. Generates a {@code ctx->awaitHumanTask(...)} call
 * that blocks until a human completes the task or the optional timeout elapses.
 *
 * <p>Generated source example:
 * <pre>{@code
 * ApprovalDecision result = check ctx->awaitHumanTask("approveExpense", ["FINANCE_APPROVER"],
 *         payload = {"amount": 1200},
 *         title = "Approve order",
 *         timeout = {hours: 24});
 * }</pre>
 *
 * @since 1.9.0
 */
public class HumanTaskBuilder extends CallBuilder {

    public static final String LABEL = HUMAN_TASK_LABEL;
    public static final String DESCRIPTION = HUMAN_TASK_DESCRIPTION;
    // A human task typically completes with an approve/reject decision, so the completion type
    // defaults to boolean (the user can still pick any concrete type).
    public static final String DEFAULT_RETURN_TYPE = "boolean";
    // The human task result type is the data a human submits to complete the task, so it is labelled
    // as the task's "completion type" rather than a generic databinding/return type.
    public static final String COMPLETION_TYPE_LABEL = "Completion Type";
    public static final String COMPLETION_TYPE_DESCRIPTION =
            "The type of the data returned when the human task is completed";

    @Override
    protected NodeKind getFunctionNodeKind() {
        return NodeKind.HUMAN_TASK;
    }

    @Override
    protected FunctionData.Kind getFunctionResultKind() {
        return FunctionData.Kind.REMOTE;
    }

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata()
                .node(NodeKind.HUMAN_TASK)
                .org(WORKFLOW_ORG)
                .module(WORKFLOW_MODULE)
                .object(CONTEXT_CLASS_NAME)
                .symbol(CALL_HUMAN_TASK_METHOD_NAME);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata()
                .node(NodeKind.HUMAN_TASK)
                .org(WORKFLOW_ORG)
                .module(WORKFLOW_MODULE)
                .object(CONTEXT_CLASS_NAME)
                .symbol(CALL_HUMAN_TASK_METHOD_NAME);

        // Build the fixed awaitHumanTask form from canonical static field definitions. These are
        // single-type, correctly-typed fields (e.g. userRoles is an expression of type string|string[])
        // whose type shows in the form. The compiler-derived params were multi-type with no selected
        // entry, so a union like string|string[] collapsed to a bare TEXT/string field with no type info.
        setFallbackHumanTaskProperties();

        relabelHumanTaskFormProperties(properties().build());

        properties().data(Property.RESULT_NAME, context.getAllVisibleSymbolNames(),
                Property.RESULT_NAME, Property.RESULT_DOC, false);

        properties().checkError(true);
    }

    private void setFallbackHumanTaskProperties() {
        // No source values available in the template path; pass an empty value map.
        addFallbackHumanTaskParameters(this, Map.of());

        // Inferred databinding type — bare type selector when the module signature is unavailable.
        properties().custom()
                .metadata()
                    .label(COMPLETION_TYPE_LABEL)
                    .description(COMPLETION_TYPE_DESCRIPTION)
                    .stepOut()
                .type().fieldType(Property.ValueType.TYPE).ballerinaType(DEFAULT_RETURN_TYPE).selected(true).stepOut()
                .codedata().kind(ParameterData.Kind.PARAM_FOR_TYPE_INFER.name()).originalName(DATABINDING_TYPE_KEY)
                    .stepOut()
                .value(DEFAULT_RETURN_TYPE)
                .editable(true)
                .stepOut()
                .addProperty(DATABINDING_TYPE_KEY);
    }

    /**
     * Builds the {@code awaitHumanTask} form parameters (taskName, userRoles, payload, title, description,
     * timeout) into {@code nodeBuilder}, in their canonical order. Shared by the node-template fallback
     * ({@link #setFallbackHumanTaskProperties}, with an empty value map) and {@code CodeAnalyzer}'s source
     * re-read path (with values parsed from the call arguments), so both render an identical form. A
     * {@code null} value yields a field with no preset value; callers normalize empty strings to {@code null}.
     *
     * @param nodeBuilder the builder to attach the properties to
     * @param values      param-name to source value; absent/{@code null} entries produce an empty field
     */
    public static void addFallbackHumanTaskParameters(NodeBuilder nodeBuilder, Map<String, String> values) {
        nodeBuilder.properties().custom()
                .metadata()
                    .label("Task Name")
                    .description("Identifies the task type")
                    .stepOut()
                .type().fieldType(Property.ValueType.TEXT).ballerinaType("string").selected(true).stepOut()
                .type().fieldType(Property.ValueType.EXPRESSION).ballerinaType("string").selected(false).stepOut()
                .codedata().kind(ParameterData.Kind.REQUIRED.name()).originalName("taskName").stepOut()
                .value(values.get("taskName"))
                .editable(true)
                .stepOut()
                .addProperty("taskName");

        nodeBuilder.properties().custom()
                .metadata()
                    .label("User Roles")
                    .description("One or more roles permitted to complete this task")
                    .stepOut()
                .type().fieldType(Property.ValueType.EXPRESSION).ballerinaType("string|string[]").selected(true)
                    .stepOut()
                .codedata().kind(ParameterData.Kind.REQUIRED.name()).originalName("userRoles").stepOut()
                .value(values.get("userRoles"))
                .editable(true)
                .stepOut()
                .addProperty("userRoles");

        nodeBuilder.properties().custom()
                .metadata()
                    .label("Payload")
                    .description("Read-only JSON object shown alongside the form")
                    .stepOut()
                .type().fieldType(Property.ValueType.EXPRESSION).ballerinaType("map<json>").selected(true).stepOut()
                .codedata().kind(ParameterData.Kind.DEFAULTABLE.name()).originalName("payload").stepOut()
                .value(values.get("payload"))
                .editable(true)
                .optional(true)
                .stepOut()
                .addProperty("payload");

        nodeBuilder.properties().custom()
                .metadata()
                    .label("Title")
                    .description("Short summary shown in the inbox")
                    .stepOut()
                .type().fieldType(Property.ValueType.TEXT).ballerinaType("string?").selected(true).stepOut()
                .type().fieldType(Property.ValueType.EXPRESSION).ballerinaType("string?").selected(false).stepOut()
                .codedata().kind(ParameterData.Kind.DEFAULTABLE.name()).originalName("title").stepOut()
                .value(values.get("title"))
                .editable(true)
                .optional(true)
                .stepOut()
                .addProperty("title");

        nodeBuilder.properties().custom()
                .metadata()
                    .label("Description")
                    .description("Additional context shown alongside the form")
                    .stepOut()
                .type().fieldType(Property.ValueType.TEXT).ballerinaType("string?").selected(true).stepOut()
                .type().fieldType(Property.ValueType.EXPRESSION).ballerinaType("string?").selected(false).stepOut()
                .codedata().kind(ParameterData.Kind.DEFAULTABLE.name()).originalName("description").stepOut()
                .value(values.get("description"))
                .editable(true)
                .optional(true)
                .stepOut()
                .addProperty("description");

        nodeBuilder.properties().custom()
                .metadata()
                    .label("Timeout")
                    .description("Maximum time to wait; omit to wait indefinitely")
                    .stepOut()
                .type().fieldType(Property.ValueType.EXPRESSION).ballerinaType("time:Duration?").selected(true)
                    .stepOut()
                .codedata().kind(ParameterData.Kind.DEFAULTABLE.name()).originalName("timeout").stepOut()
                .value(values.get("timeout"))
                .editable(true)
                .optional(true)
                .stepOut()
                .addProperty("timeout");
    }

    /**
     * Applies friendly form labels and descriptions to the {@code awaitHumanTask} properties without
     * discarding their compiler-derived type metadata (type symbols, imports, record-field selectors).
     * Shared by the template ({@link #setConcreteTemplateData}) and the source re-read path in
     * {@code CodeAnalyzer}, so both render an identical, type-aware form.
     *
     * @param properties the live property map to relabel in place
     */
    public static void relabelHumanTaskFormProperties(Map<String, Property> properties) {
        relabel(properties, "taskName", "Task Name", "Identifies the task type");
        relabel(properties, "userRoles", "User Roles", "One or more roles permitted to complete this task");
        relabel(properties, "payload", "Payload", "Read-only JSON object shown alongside the form");
        relabel(properties, "title", "Title", "Short summary shown in the inbox");
        relabel(properties, "description", "Description", "Additional context shown alongside the form");
        relabel(properties, "timeout", "Timeout", "Maximum time to wait; omit to wait indefinitely");
        // The inferred result type is the human task's completion type; re-label it from the generic
        // "Databinding Type" set by CallBuilder.normalizeDatabindingTypeProperty. Must run after
        // normalization so the DATABINDING_TYPE_KEY property exists.
        relabel(properties, DATABINDING_TYPE_KEY, COMPLETION_TYPE_LABEL, COMPLETION_TYPE_DESCRIPTION);
    }

    private static void relabel(Map<String, Property> properties, String key, String label, String description) {
        Property existing = properties.get(key);
        if (existing == null) {
            return;
        }
        properties.put(key, Property.Builder.copyFrom(existing)
                .metadata().label(label).description(description).stepOut()
                .build());
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        Optional<Property> typeProp = sourceBuilder.getProperty(DATABINDING_TYPE_KEY);
        Optional<Property> variableProp = sourceBuilder.getProperty(Property.VARIABLE_KEY);
        Optional<Property> checkErrorProp = sourceBuilder.getProperty(Property.CHECK_ERROR_KEY);

        String resultType = normalizeResultType(typeProp
                .map(p -> p.value() != null ? p.value().toString() : DEFAULT_RETURN_TYPE)
                .orElse(DEFAULT_RETURN_TYPE));
        String variableName = variableProp
                .map(p -> p.value() != null ? p.value().toString() : "result")
                .orElse("result");
        boolean useCheck = checkErrorProp
                .map(p -> p.value() == null || !"false".equals(p.value().toString()))
                .orElse(true);

        // Required positional args
        String taskName = sourceBuilder.getProperty("taskName")
                .map(p -> p.value() != null ? p.value().toString() : "\"\"")
                .orElse("\"\"");
        String userRoles = sourceBuilder.getProperty("userRoles")
                .map(p -> p.value() != null ? p.value().toString() : "\"admin\"")
                .orElse("\"admin\"");

        // Optional named args (only when the user provided a value)
        List<String> callArgs = new ArrayList<>();
        callArgs.add(taskName);
        callArgs.add(userRoles);
        addNamedArg(sourceBuilder, callArgs, "payload");
        addNamedArg(sourceBuilder, callArgs, "title");
        addNamedArg(sourceBuilder, callArgs, "description");
        addNamedArg(sourceBuilder, callArgs, "timeout");

        String ctxParamName = ActivityCallBuilder.resolveContextParamName(sourceBuilder);

        sourceBuilder.token()
                .name(useCheck ? resultType : resultType + "|error")
                .whiteSpace()
                .name(variableName)
                .whiteSpace()
                .keyword(SyntaxKind.EQUAL_TOKEN);

        if (useCheck) {
            sourceBuilder.token().keyword(SyntaxKind.CHECK_KEYWORD);
        }

        sourceBuilder.token()
                .name(ctxParamName)
                .keyword(SyntaxKind.RIGHT_ARROW_TOKEN)
                .name(CALL_HUMAN_TASK_METHOD_NAME)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN)
                .name(String.join(", ", callArgs))
                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                .endOfStatement();

        return sourceBuilder
                .textEdit()
                .acceptImport(WORKFLOW_ORG, WORKFLOW_MODULE)
                .build();
    }

    private static void addNamedArg(SourceBuilder sourceBuilder, List<String> args, String key) {
        sourceBuilder.getProperty(key).ifPresent(p -> {
            if (p.value() != null && !p.value().toString().isEmpty()) {
                args.add(key + " = " + p.value().toString());
            }
        });
    }

    /**
     * Strips any trailing {@code |error} from the stored result type so that the unchecked branch of
     * {@link #toSource} (which appends {@code |error}) does not produce a duplicated — and on each
     * round-trip, accumulating — {@code ...|error|error} union. When a human task binds to a generic
     * {@code T|error} variable, the inferred-type derivation keeps the {@code |error}; the result type
     * field is meant to hold only the success type {@code T}.
     */
    private static String normalizeResultType(String resultType) {
        String normalized = resultType.strip();
        while (normalized.endsWith("|error")) {
            normalized = normalized.substring(0, normalized.length() - "|error".length()).strip();
        }
        return normalized.isEmpty() ? DEFAULT_RETURN_TYPE : normalized;
    }
}
