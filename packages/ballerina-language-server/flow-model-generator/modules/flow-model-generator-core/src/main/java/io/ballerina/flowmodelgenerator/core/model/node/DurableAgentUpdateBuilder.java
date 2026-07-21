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
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Option;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.utils.WorkflowUtil;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.modelgenerator.commons.ParameterData;
import io.ballerina.projects.Package;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.UPDATE_AGENT_DESCRIPTION;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.UPDATE_AGENT_ASYNC_FUNCTION_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.UPDATE_AGENT_FUNCTION_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.UPDATE_AGENT_LABEL;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Sends a request to a running durable agent and receives its answer for that turn (a synchronous
 * request-response backed by a workflow update). Generates
 * {@code string reply = check workflow:updateAgent(<agentFn>, <agentId>, <eventName>, <data>);}.
 *
 * @since 1.8.0
 */
public class DurableAgentUpdateBuilder extends FunctionCall {

    public static final String AGENT_KEY = "agent";
    public static final String AGENT_LABEL = "Durable Agentic Workflow";
    public static final String AGENT_DOC = "The durable agent function to send the request to";
    public static final String AGENT_ID_KEY = "agentId";
    public static final String AGENT_ID_LABEL = "Agent Id";
    public static final String AGENT_ID_DOC = "The running agent's workflow ID (obtained from `run`)";
    public static final String EVENT_NAME_KEY = "eventName";
    public static final String EVENT_NAME_LABEL = "Event Name";
    public static final String EVENT_NAME_DOC =
            "The event field declared in the agent's signature (\"chat\" for conversational agents)";
    public static final String DATA_KEY = "data";
    public static final String DATA_LABEL = "Request";
    public static final String DATA_DOC = "The request payload sent to the agent";

    public static final String WAIT_KEY = "waitForAnswer";
    public static final String WAIT_LABEL = "Wait for Answer";
    public static final String WAIT_DOC = "Wait for the agent's answer (blocking). Uncheck to send without "
            + "waiting: the request is durably accepted and an update ID is returned - fetch the answer later "
            + "with workflow:getAgentUpdateResult. Prefer non-blocking for turns that may take long, e.g. "
            + "human-task approvals.";

    private static final String STRING_TYPE = "string";
    private static final String ANYDATA_TYPE = "anydata";
    private static final String DEFAULT_EVENT = "\"chat\"";
    private static final String DEFAULT_RESULT_VAR = "agentReply";
    private static final String DEFAULT_RESULT_TYPE = "string";
    private static final String DEFAULT_UPDATE_ID_VAR = "updateId";

    @Override
    public void setConcreteConstData() {
        metadata().label(UPDATE_AGENT_LABEL).description(UPDATE_AGENT_DESCRIPTION);
        codedata()
                .node(NodeKind.DURABLE_AGENT_UPDATE)
                .org(WORKFLOW_ORG)
                .module(WORKFLOW_MODULE)
                .symbol(UPDATE_AGENT_FUNCTION_NAME);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        setConcreteConstData();

        properties().custom()
                .metadata()
                    .label(AGENT_LABEL)
                    .description(AGENT_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.SINGLE_SELECT)
                    .options(getDurableAgentFunctions(context))
                    .selected(true)
                    .stepOut()
                .codedata()
                    .kind(ParameterData.Kind.REQUIRED.name())
                    .stepOut()
                .value("")
                .editable(true)
                .stepOut()
                .addProperty(AGENT_KEY);

        properties().custom()
                .metadata()
                    .label(AGENT_ID_LABEL)
                    .description(AGENT_ID_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.EXPRESSION)
                    .ballerinaType(STRING_TYPE)
                    .selected(true)
                    .stepOut()
                .codedata()
                    .kind(ParameterData.Kind.REQUIRED.name())
                    .stepOut()
                .value("")
                .editable(true)
                .stepOut()
                .addProperty(AGENT_ID_KEY);

        properties().custom()
                .metadata()
                    .label(EVENT_NAME_LABEL)
                    .description(EVENT_NAME_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.EXPRESSION)
                    .ballerinaType(STRING_TYPE)
                    .selected(true)
                    .stepOut()
                .codedata()
                    .kind(ParameterData.Kind.REQUIRED.name())
                    .stepOut()
                .value(DEFAULT_EVENT)
                .editable(true)
                .stepOut()
                .addProperty(EVENT_NAME_KEY);

        properties().custom()
                .metadata()
                    .label(DATA_LABEL)
                    .description(DATA_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.EXPRESSION)
                    .ballerinaType(ANYDATA_TYPE)
                    .selected(true)
                    .stepOut()
                .codedata()
                    .kind(ParameterData.Kind.REQUIRED.name())
                    .stepOut()
                .value("")
                .editable(true)
                .stepOut()
                .addProperty(DATA_KEY);

        properties().custom()
                .metadata()
                    .label(WAIT_LABEL)
                    .description(WAIT_DOC)
                    .stepOut()
                .type().fieldType(Property.ValueType.FLAG).ballerinaType("boolean").selected(true).stepOut()
                .value("true")
                .editable(true)
                .optional(true)
                .stepOut()
                .addProperty(WAIT_KEY);

        // The agent's answer for the turn; updateAgent is dependently typed on the variable type.
        properties().custom()
                .metadata()
                    .label("Result Type")
                    .description("The expected type of the agent's answer")
                    .stepOut()
                .type().fieldType(Property.ValueType.TYPE).ballerinaType(DEFAULT_RESULT_TYPE).selected(true).stepOut()
                .value(DEFAULT_RESULT_TYPE)
                .editable(true)
                .stepOut()
                .addProperty(Property.TYPE_KEY);
        properties().data(Property.RESULT_NAME, context.getAllVisibleSymbolNames(),
                Property.RESULT_NAME, Property.RESULT_DOC, false);
        properties().checkError(true);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        String agent = requireValue(sourceBuilder, AGENT_KEY, "A durable agent function must be selected");
        String agentId = requireValue(sourceBuilder, AGENT_ID_KEY, "The agent ID is required");
        String eventName = requireValue(sourceBuilder, EVENT_NAME_KEY, "The event name is required");
        String data = requireValue(sourceBuilder, DATA_KEY, "The request payload is required");

        // Non-blocking mode sends the request and binds the update ID instead of the answer;
        // the answer is fetched later via workflow:getAgentUpdateResult.
        boolean waitForAnswer = sourceBuilder.getProperty(WAIT_KEY)
                .map(p -> p.value() == null || !"false".equals(p.value().toString()))
                .orElse(true);

        String resultType = waitForAnswer
                ? sourceBuilder.getProperty(Property.TYPE_KEY)
                        .map(p -> p.value() == null || p.value().toString().isEmpty()
                                ? DEFAULT_RESULT_TYPE : p.value().toString())
                        .orElse(DEFAULT_RESULT_TYPE)
                : STRING_TYPE;
        String variableName = sourceBuilder.getProperty(Property.VARIABLE_KEY)
                .map(p -> p.value() == null || p.value().toString().isEmpty()
                        ? (waitForAnswer ? DEFAULT_RESULT_VAR : DEFAULT_UPDATE_ID_VAR) : p.value().toString())
                .orElse(waitForAnswer ? DEFAULT_RESULT_VAR : DEFAULT_UPDATE_ID_VAR);

        sourceBuilder.token()
                .name(resultType)
                .whiteSpace()
                .name(variableName)
                .whiteSpace()
                .keyword(SyntaxKind.EQUAL_TOKEN)
                .keyword(SyntaxKind.CHECK_KEYWORD)
                .name(WORKFLOW_MODULE)
                .keyword(SyntaxKind.COLON_TOKEN)
                .name(waitForAnswer ? UPDATE_AGENT_FUNCTION_NAME : UPDATE_AGENT_ASYNC_FUNCTION_NAME)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN)
                .name(String.join(", ", List.of(agent, agentId, eventName, data)))
                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                .endOfStatement();

        return sourceBuilder
                .textEdit()
                .acceptImport(WORKFLOW_ORG, WORKFLOW_MODULE)
                .build();
    }

    private static String requireValue(SourceBuilder sourceBuilder, String key, String message) {
        return sourceBuilder.getProperty(key)
                .filter(p -> p.value() != null && !p.value().toString().isEmpty())
                .map(Property::toSourceCode)
                .orElseThrow(() -> new IllegalStateException(message));
    }

    private List<Option> getDurableAgentFunctions(TemplateContext context) {
        List<Option> options = new ArrayList<>();
        Package currentPackage = PackageUtil.loadProject(context.workspaceManager(), context.filePath())
                .currentPackage();
        PackageUtil.getCompilation(currentPackage);
        currentPackage.modules().forEach(module ->
                module.getCompilation().getSemanticModel().moduleSymbols().stream()
                        .filter(symbol -> symbol.kind() == SymbolKind.FUNCTION)
                        .map(symbol -> (FunctionSymbol) symbol)
                        .filter(WorkflowUtil::isDurableAgentFunction)
                        .forEach(funcSymbol -> funcSymbol.getName().ifPresent(name ->
                                options.add(new Option(name, name)))));
        return options;
    }
}
