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
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Option;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.utils.WorkflowUtil;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.modelgenerator.commons.ParameterMemberTypeData;
import io.ballerina.projects.Package;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Represents a workflow send event operation node (sendEvent).
 * This is a specialized function call for workflow event operations.
 *
 * @since 2.0.0
 */
public class SendEventBuilder extends NodeBuilder {
    public static final String LABEL = "Send Event";
    public static final String DESCRIPTION = "Send an event to an existing workflow instance";
    public static final String WORKFLOW_NAME_KEY = "workflowName";
    public static final String WORKFLOW_NAME_LABEL = "Workflow Name";
    public static final String WORKFLOW_NAME_DOC = "The workflow function to send the event to";
    public static final String EVENT_NAME_KEY = "eventName";
    public static final String EVENT_NAME_LABEL = "Event Name";
    public static final String EVENT_NAME_DOC = "The name of the event to send";
    public static final String EVENT_DATA_KEY = "eventData";
    public static final String EVENT_DATA_LABEL = "Event Data";
    public static final String EVENT_DATA_DOC = "The event data to send";
    private static final String SEND_EVENT_METHOD = "sendEvent";
    private static final String MAP_ANYDATA_TYPE = "map<anydata>";

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata()
                .node(NodeKind.SEND_EVENT)
                .org(WORKFLOW_ORG)
                .module(WORKFLOW_MODULE);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        List<Option> workflowOptions = getAvailableWorkflowFunctions(context);

        properties().custom()
                .metadata()
                    .label(WORKFLOW_NAME_LABEL)
                    .description(WORKFLOW_NAME_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.SINGLE_SELECT)
                    .options(workflowOptions)
                    .selected(true)
                    .stepOut()
                .value("")
                .editable(true)
                .stepOut()
                .addProperty(WORKFLOW_NAME_KEY);

        properties().custom()
                .metadata()
                    .label(EVENT_NAME_LABEL)
                    .description(EVENT_NAME_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.SINGLE_SELECT)
                    .options(List.of())
                    .selected(true)
                    .stepOut()
                .value("")
                .editable(false)
                .stepOut()
                .addProperty(EVENT_NAME_KEY);

        List<ParameterMemberTypeData> typeMembers = List.of(
                new ParameterMemberTypeData(MAP_ANYDATA_TYPE, "RECORD_TYPE", null, null)
        );

        properties().custom()
                .metadata()
                    .label(EVENT_DATA_LABEL)
                    .description(EVENT_DATA_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.RECORD_MAP_EXPRESSION)
                    .ballerinaType(MAP_ANYDATA_TYPE)
                    .typeMembers(typeMembers)
                    .selected(false)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.EXPRESSION)
                    .ballerinaType(MAP_ANYDATA_TYPE)
                    .selected(false)
                    .stepOut()
                .value("")
                .editable(true)
                .stepOut()
                .addProperty(EVENT_DATA_KEY);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        Optional<Property> workflowNameProp = sourceBuilder.getProperty(WORKFLOW_NAME_KEY);
        String workflowName = workflowNameProp.map(p -> p.value().toString()).orElse("");

        Optional<Property> eventNameProp = sourceBuilder.getProperty(EVENT_NAME_KEY);
        String eventName = eventNameProp.map(p -> p.value().toString()).orElse("");

        Optional<Property> eventDataProp = sourceBuilder.getProperty(EVENT_DATA_KEY);
        String eventData = eventDataProp.map(p -> p.value().toString()).orElse("{}");

        // Generate: check workflow:sendEvent(workflowFunction, eventData, "eventName");
        sourceBuilder.token()
                .keyword(SyntaxKind.CHECK_KEYWORD)
                .name(WORKFLOW_MODULE)
                .keyword(SyntaxKind.COLON_TOKEN)
                .name(SEND_EVENT_METHOD)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN)
                .name(workflowName)
                .keyword(SyntaxKind.COMMA_TOKEN)
                .whiteSpace()
                .name(eventData)
                .keyword(SyntaxKind.COMMA_TOKEN)
                .whiteSpace()
                .name("\"" + eventName + "\"")
                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                .endOfStatement()
                .stepOut();

        return sourceBuilder
                .textEdit()
                .acceptImport(WORKFLOW_ORG, WORKFLOW_MODULE)
                .build();
    }

    /**
     * Gets the available workflow process functions from the current project.
     *
     * @param context The template context
     * @return List of options containing workflow function names
     */
    private List<Option> getAvailableWorkflowFunctions(TemplateContext context) {
        List<Option> options = new ArrayList<>();
        try {
            Package currentPackage = PackageUtil.loadProject(context.workspaceManager(), context.filePath())
                    .currentPackage();
            PackageUtil.getCompilation(currentPackage);
            currentPackage.modules().forEach(module -> {
                module.getCompilation().getSemanticModel().moduleSymbols().stream()
                        .filter(symbol -> symbol.kind() == SymbolKind.FUNCTION)
                        .map(symbol -> (FunctionSymbol) symbol)
                        .filter(WorkflowUtil::isWorkflowFunction)
                        .forEach(funcSymbol -> {
                            String funcName = funcSymbol.getName().orElse("");
                            if (!funcName.isEmpty()) {
                                options.add(new Option(funcName, funcName));
                            }
                        });
            });
        } catch (Exception e) {
            // Return empty options if project loading fails
        }
        return options;
    }
}
