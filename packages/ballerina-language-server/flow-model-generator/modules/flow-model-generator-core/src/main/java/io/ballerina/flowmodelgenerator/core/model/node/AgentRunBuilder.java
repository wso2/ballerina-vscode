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
import io.ballerina.flowmodelgenerator.core.AiUtils;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.utils.FlowNodeUtil;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.ParameterData;
import org.ballerinalang.langserver.common.utils.NameUtil;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Represents a function call node.
 *
 * @since 1.5.1
 */
public class AgentRunBuilder extends CallBuilder {

    private static final String BALLERINA = "ballerina";

    // Agent Call Properties
    public static final String QUERY = "query";
    public static final String SESSION_ID = "sessionId";
    public static final String CONTEXT = "context";

    public static final String LABEL = "Agent";
    public static final String DESCRIPTION = "Create or reuse an Agent.";
    static final Set<String> AGENT_CALL_PARAMS_TO_SHOW = Set.of(QUERY, SESSION_ID, CONTEXT);

    @Override
    protected NodeKind getFunctionNodeKind() {
        return NodeKind.AGENT_RUN;
    }

    @Override
    protected FunctionData.Kind getFunctionResultKind() {
        return FunctionData.Kind.FUNCTION;
    }

    @Override
    public void setConcreteConstData() {
        codedata().node(NodeKind.AGENT_RUN);
        metadata().description(DESCRIPTION);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        super.setConcreteTemplateData(context);
        // TODO: This is a temporary solution until we have a proper plan for handling all generic types.
        makeInferredTypePropertyOptional();
        overrideVariableName(context);
    }

    private void makeInferredTypePropertyOptional() {
        if (formBuilder == null) {
            return;
        }
        Map<String, Property> props = formBuilder.build();
        for (Map.Entry<String, Property> entry : props.entrySet()) {
            Property prop = entry.getValue();
            if (prop.codedata() != null &&
                    ParameterData.Kind.PARAM_FOR_TYPE_INFER.name().equals(prop.codedata().kind())) {
                props.put(entry.getKey(), AiUtils.copyAsOptionalAdvanced(prop));
            }
        }
    }

    private void overrideVariableName(TemplateContext context) {
        if (formBuilder == null) {
            return;
        }
        Map<String, Property> props = formBuilder.build();
        Property variableProp = props.get(Property.VARIABLE_KEY);
        if (variableProp == null) {
            return;
        }
        String uniqueVarName = NameUtil.generateVariableName("string", context.getAllVisibleSymbolNames());
        props.put(Property.VARIABLE_KEY, AiUtils.createUpdatedProperty(variableProp, uniqueVarName));
    }

    private void newVariableWithInferredTypeAndDefault(SourceBuilder sourceBuilder) {
        FlowNode flowNode = sourceBuilder.flowNode;
        Optional<Property> optionalType = sourceBuilder.getProperty(Property.TYPE_KEY);
        Optional<Property> variable = sourceBuilder.getProperty(Property.VARIABLE_KEY);

        if (optionalType.isEmpty() || variable.isEmpty()) {
            return;
        }

        Property type = optionalType.get();
        String typeName = type.value().toString();

        if (flowNode.codedata().inferredReturnType() != null) {
            Optional<Property> inferredParam = flowNode.properties().values().stream()
                    .filter(property -> property.codedata() != null && property.codedata().kind() != null &&
                            property.codedata().kind().equals(ParameterData.Kind.PARAM_FOR_TYPE_INFER.name()))
                    .findFirst();
            if (inferredParam.isPresent()) {
                String returnType = flowNode.codedata().inferredReturnType();
                Object inferredValue = inferredParam.get().value();
                // Default to "string" when the inferred type value is null or empty
                String inferredType = (inferredValue != null && !inferredValue.toString().isEmpty())
                        ? inferredValue.toString()
                        : "string";
                String inferredTypeDef = inferredParam.get()
                        .codedata().originalName();
                typeName = returnType.replace(inferredTypeDef, inferredType);
            }
        }

        sourceBuilder.token().expressionWithType(typeName, variable.get()).keyword(SyntaxKind.EQUAL_TOKEN);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        // Use custom variable declaration with inferred type handling and default to "string"
        newVariableWithInferredTypeAndDefault(sourceBuilder);

        FlowNode agentRunNode = sourceBuilder.flowNode;
        Map<Path, List<TextEdit>> allTextEdits = new HashMap<>();

        generateAgentCallSource(sourceBuilder, agentRunNode, allTextEdits);

        return allTextEdits;
    }

    private void generateAgentCallSource(SourceBuilder sourceBuilder, FlowNode agentRunNode,
                                         Map<Path, List<TextEdit>> allTextEdits) {
        Optional<Property> connection = agentRunNode.getProperty(Property.CONNECTION_KEY);
        if (connection.isEmpty()) {
            throw new IllegalStateException("Agent variable must be defined for an agent call node");
        }

        if (FlowNodeUtil.hasCheckKeyFlagSet(agentRunNode)) {
            sourceBuilder.token().keyword(SyntaxKind.CHECK_KEYWORD);
        }

        Set<String> excludeKeys = getExcludeKeys(agentRunNode);
        Map<Path, List<TextEdit>> callTextEdits = sourceBuilder.token()
                .name(connection.get().toSourceCode())
                .keyword(BALLERINA.equals(agentRunNode.codedata().org()) ?
                        SyntaxKind.DOT_TOKEN : SyntaxKind.RIGHT_ARROW_TOKEN)
                .name(agentRunNode.metadata().label())
                .stepOut()
                .functionParameters(agentRunNode, excludeKeys)
                .textEdit()
                .build();

        callTextEdits.forEach((path, textEdits) ->
                allTextEdits.merge(path, textEdits, (existing, incoming) -> {
                    List<TextEdit> merged = new ArrayList<>(existing);
                    merged.addAll(incoming);
                    return merged;
                }));
    }

    private Set<String> getExcludeKeys(FlowNode agentRunNode) {
        return agentRunNode.properties() != null
                ? agentRunNode.properties().keySet().stream()
                .filter(key -> !AGENT_CALL_PARAMS_TO_SHOW.contains(key))
                .collect(Collectors.toSet())
                : new HashSet<>();
    }
}
