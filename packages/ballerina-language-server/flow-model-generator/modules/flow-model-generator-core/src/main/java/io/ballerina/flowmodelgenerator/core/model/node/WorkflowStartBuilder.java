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
import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.FunctionTypeSymbol;
import io.ballerina.compiler.api.symbols.ParameterSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.utils.FlowNodeUtil;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.projects.Project;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Represents a workflow start node that generates workflow:createInstance calls.
 * This node is used to start a workflow process function.
 *
 * @since 2.0.0
 */
public class WorkflowStartBuilder extends NodeBuilder {

    public static final String LABEL = "Start Workflow";
    public static final String DESCRIPTION = "Start a workflow process instance";

    public static final String INPUT_KEY = "input";
    public static final String INPUT_LABEL = "Input";
    public static final String INPUT_DOC = "Input data for the workflow";
    private static final String CREATE_INSTANCE_METHOD = "createInstance";

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata()
                .node(NodeKind.WORKFLOW_START)
                .org(WORKFLOW_ORG)
                .module(WORKFLOW_MODULE);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        Codedata codedata = context.codedata();

        // Set metadata from codedata if available (from search result)
        if (codedata != null && codedata.symbol() != null) {
            metadata().label(codedata.symbol()).description(DESCRIPTION);
            codedata()
                    .node(NodeKind.WORKFLOW_START)
                    .org(codedata.org())
                    .module(codedata.module())
                    .symbol(codedata.symbol())
                    .version(codedata.version());
        }

        // Get the input parameter type from the workflow function's second parameter
        TypeSymbol inputType = getWorkflowInputType(context, codedata);

        // Input property with the actual type from the workflow function
        properties().custom()
                .metadata()
                    .label(INPUT_LABEL)
                    .description(INPUT_DOC)
                    .stepOut()
                .typeWithExpression(inputType, moduleInfo)
                .placeholder("")
                .value("")
                .editable(true)
                .stepOut()
                .addProperty(INPUT_KEY);

        // Variable property for result
        properties().custom()
                .metadata()
                    .label("Workflow ID Variable Name")
                    .description("Variable name to receive the started workflow ID.")
                    .stepOut()
                .type(Property.ValueType.IDENTIFIER)
                .value("workflowId")
                .editable(true)
                .stepOut()
                .addProperty(Property.VARIABLE_KEY);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        FlowNode flowNode = sourceBuilder.flowNode;

        // Get variable name property
        Optional<Property> variableProp = sourceBuilder.getProperty(Property.VARIABLE_KEY);
        String variableName = variableProp
                .map(p -> p.value().toString())
                .orElse("workflowId");

        // Generate: string workflowId = check workflow:createInstance(workflowFunction, input);
        sourceBuilder.token()
                .keyword(SyntaxKind.STRING_KEYWORD)
                .name(variableName)
                .whiteSpace()
                .keyword(SyntaxKind.EQUAL_TOKEN)
                .keyword(SyntaxKind.CHECK_KEYWORD);

        // Get workflow function from codedata.symbol()
        String workflowFunction = flowNode.codedata().symbol();
        if (workflowFunction == null) {
            workflowFunction = "";
        }

        // Get input property
        Optional<Property> inputProp = sourceBuilder.getProperty(INPUT_KEY);
        String input = inputProp
                .map(p -> p.value().toString())
                .orElse("{}");

        // Build: workflow:createInstance(workflowFunction, input)
        sourceBuilder.token()
                .name(WORKFLOW_MODULE)
                .keyword(SyntaxKind.COLON_TOKEN)
                .name(CREATE_INSTANCE_METHOD)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN)
                .name(workflowFunction)
                .keyword(SyntaxKind.COMMA_TOKEN)
                .whiteSpace()
                .name(input)
                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                .endOfStatement();

        return sourceBuilder
                .textEdit()
                .acceptImport(WORKFLOW_ORG, WORKFLOW_MODULE)
                .build();
    }

    /**
     * Gets the input parameter type from the workflow process function.
     * The input parameter is the one whose type is a subtype of anydata.
     *
     * @param context  The template context
     * @param codedata The codedata containing the workflow function symbol
     * @return The type of the input parameter, or null if not found
     */
    private TypeSymbol getWorkflowInputType(TemplateContext context, Codedata codedata) {
        if (codedata == null || codedata.symbol() == null) {
            return null;
        }

        Project project = PackageUtil.loadProject(context.workspaceManager(), context.filePath());

        // Search for the workflow function in the project modules
        for (io.ballerina.projects.Module module : project.currentPackage().modules()) {
            SemanticModel semanticModel = module.getCompilation().getSemanticModel();

            // Find the function symbol matching the workflow function name
            Optional<Symbol> functionSymbol = semanticModel.moduleSymbols().stream()
                    .filter(symbol -> symbol.kind() == SymbolKind.FUNCTION)
                    .filter(symbol -> symbol.getName().orElse("").equals(codedata.symbol()))
                    .findFirst();

            if (functionSymbol.isPresent() && functionSymbol.get() instanceof FunctionSymbol funcSymbol) {
                FunctionTypeSymbol functionType = funcSymbol.typeDescriptor();
                Optional<List<ParameterSymbol>> params = functionType.params();

                if (params.isPresent()) {
                    // Find the parameter whose type is a subtype of anydata
                    for (ParameterSymbol param : params.get()) {
                        if (param.typeDescriptor().subtypeOf(semanticModel.types().ANYDATA)) {
                            return param.typeDescriptor();
                        }
                    }
                }
            }
        }

        return null;
    }
}
