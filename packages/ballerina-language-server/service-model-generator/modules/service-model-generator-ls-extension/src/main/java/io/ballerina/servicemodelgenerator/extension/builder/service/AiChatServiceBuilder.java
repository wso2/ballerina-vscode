/*
 *  Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com)
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

import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
import io.ballerina.servicemodelgenerator.extension.util.ListenerUtil;
import io.ballerina.servicemodelgenerator.extension.util.Utils;
import org.eclipse.lsp4j.TextEdit;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.AI;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.BALLERINA;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.HTTP;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.NEW_LINE;
import static io.ballerina.servicemodelgenerator.extension.util.ListenerUtil.getDefaultListenerDeclarationStmt;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.populateRequiredFunctionsForServiceType;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.importExists;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.populateRequiredFuncsDesignApproachAndServiceType;

/**
 * Builder class for AI chat service.
 *
 * @since 1.2.0
 */
public final class AiChatServiceBuilder extends AbstractServiceBuilder {

    private static final String AGENT_NAME_PROPERTY = "agentName";

    @Override
    public Optional<Service> getModelTemplate(GetModelContext context) {
        return super.getModelTemplate(context).map(service -> {
            Map<String, Value> properties = service.getProperties();
            Value agentNameProperty = new Value.ValueBuilder()
                    .metadata("Agent Name", "The name of the agent variable")
                    .build();
            properties.put(AGENT_NAME_PROPERTY, agentNameProperty);
            return service;
        });
    }

    @Override
    public Map<String, List<TextEdit>> addModel(AddModelContext context) throws Exception {
        List<TextEdit> edits = new ArrayList<>();
        Service service = context.service();

        String agentName = getAgentNameFromService(service);
        String agentVarName = agentName + "Agent";
        String modelVarName = "_" + agentName + "Model";

        addDefaultListenerEdit(context, edits);

        populateRequiredFuncsDesignApproachAndServiceType(service);
        populateRequiredFunctionsForServiceType(service);

        StringBuilder serviceBuilder = new StringBuilder(NEW_LINE);
        buildServiceNodeStr(service, serviceBuilder);
        buildServiceNodeBody(getServiceMembers(agentVarName, modelVarName, service.getOrgName()), serviceBuilder);

        ModulePartNode rootNode = context.document().syntaxTree().rootNode();
        edits.add(new TextEdit(Utils.toRange(rootNode.lineRange().endLine()), serviceBuilder.toString()));

        addRequiredImports(service, rootNode, edits);

        return Map.of(context.filePath(), edits);
    }

    private String getAgentNameFromService(Service service) {
        Value agentNameValue = service.getProperty(AGENT_NAME_PROPERTY);
        return agentNameValue != null && agentNameValue.isEnabledWithValue()
                ? agentNameValue.getValue()
                : "chat";
    }

    private void addDefaultListenerEdit(AddModelContext context, List<TextEdit> edits) {
        ListenerUtil.DefaultListener defaultListener = ListenerUtil.getDefaultListener(context);
        if (Objects.nonNull(defaultListener)) {
            String stmt = getDefaultListenerDeclarationStmt(defaultListener);
            edits.add(new TextEdit(Utils.toRange(defaultListener.linePosition()), stmt));
        }
    }

    private List<String> getServiceMembers(String agentVarName, String modelVarName, String orgName) {
        return List.of(
                getServiceFields(agentVarName),
                getServiceInitFunction(agentVarName, modelVarName),
                getAgentChatFunction(agentVarName, orgName)
        );
    }

    private void addRequiredImports(Service service, ModulePartNode rootNode, List<TextEdit> edits) {
        Set<String> importStmts = new LinkedHashSet<>();

        if (!importExists(rootNode, BALLERINA, HTTP)) {
            importStmts.add(Utils.getImportStmt(BALLERINA, HTTP));
        }
        if (!importExists(rootNode, service.getOrgName(), AI)) {
            importStmts.add(Utils.getImportStmt(service.getOrgName(), AI));
        }

        if (!importStmts.isEmpty()) {
            String importsStmts = String.join(NEW_LINE, importStmts);
            edits.addFirst(new TextEdit(Utils.toRange(rootNode.lineRange().startLine()), importsStmts));
        }
    }

    private static String getServiceFields(String agentVarName) {
        return "    private final ai:Agent " + agentVarName + ";";
    }

    private static String getServiceInitFunction(String agentVarName, String modelVarName) {
        return String.format(
                "    function init() returns error? { %s" +
                        "        self.%s = check new (%s" +
                        "            systemPrompt = {role: string ``, instructions: string ``}, model = %s" +
                        ", tools = []%s" +
                        "        );%s" +
                        "    }",
                NEW_LINE, agentVarName, NEW_LINE, modelVarName, NEW_LINE, NEW_LINE
        );
    }

    private static String getAgentChatFunction(String agentVarName, String orgName) {
        String methodCall = BALLERINA.equals(orgName)
                ? String.format("self.%s.run(request.message, request.sessionId)", agentVarName)
                : String.format("self.%s->run(request.message, request.sessionId)", agentVarName);
        return String.format(
                "    resource function post chat(@http:Payload ai:ChatReqMessage request) " +
                        "returns ai:ChatRespMessage|error {%s" +
                        "        string stringResult = check %s;%s" +
                        "        return {message: stringResult};%s" +
                        "    }",
                NEW_LINE, methodCall, NEW_LINE, NEW_LINE
        );
    }

    @Override
    public String kind() {
        return AI;
    }
}
