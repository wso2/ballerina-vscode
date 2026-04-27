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
import io.ballerina.compiler.syntax.tree.ParameterNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.utils.FileSystemUtils;
import io.ballerina.flowmodelgenerator.core.utils.TypeUtils;
import io.ballerina.flowmodelgenerator.core.utils.WorkflowUtil;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.tools.text.LineRange;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.DEFAULT_INPUT_PARAM_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Represents the properties of a workflow process function definition node.
 *
 * @since 1.8.0
 */
public class WorkflowBuilder extends FunctionDefinitionBuilder {

    public static final String LABEL = "Workflow Process Function";
    public static final String DESCRIPTION = "Define a workflow process function";

    public static final String INPUT_KEY = "inputType";
    public static final String INPUT_LABEL = "Input Type";
    public static final String INPUT_DOC = "Type of the input data to the workflow";
    public static final String ANYDATA_TYPE = "anydata";

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata()
                .node(NodeKind.WORKFLOW)
                .org(WORKFLOW_ORG)
                .module(WORKFLOW_MODULE);
    }

    public static void setInputTypeProperty(NodeBuilder nodeBuilder, String inputType) {
        nodeBuilder.properties().custom()
                .metadata()
                    .label(INPUT_LABEL)
                    .description(INPUT_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.TYPE)
                    .ballerinaType(ANYDATA_TYPE)
                .stepOut()
                .value(inputType)
                .editable(true)
                .optional(true)
                .stepOut()
                .addProperty(INPUT_KEY);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        ModuleInfo workflowModuleInfo = new ModuleInfo(WORKFLOW_ORG, WORKFLOW_MODULE, WORKFLOW_MODULE, null);
        PackageUtil.pullModuleAndNotify(context.lsClientLogger(), workflowModuleInfo);
        // Add function name
        properties().functionNameTemplate("workflow", context.getAllVisibleSymbolNames());
        setMandatoryProperties(this, "error?", "", "");
        // Add input property with WORKFLOW_INPUT_TYPE
        setInputTypeProperty(this, "");
    }

    public static void setMandatoryProperties(NodeBuilder nodeBuilder, String returnType, String description,
                                              String returnDescription) {
        nodeBuilder.properties()
                .functionDescription(description)
                .returnType(returnType, null, true)
                .returnDescription(returnDescription)
                .isPublic(false, false, true, false);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        Optional<Property> optDescription = sourceBuilder.getProperty(Property.FUNCTION_NAME_DESCRIPTION_KEY);
        String description = optDescription.map(property -> property.value().toString()).orElse("");
        Optional<Property> funcNameProperty = sourceBuilder.getProperty(Property.FUNCTION_NAME_KEY);
        if (funcNameProperty.isEmpty()) {
            throw new IllegalStateException("Function name is not present");
        }
        String funcName = funcNameProperty.get().value().toString();

        if (!description.isEmpty()) {
            sourceBuilder.token().descriptionDoc(description);
        }

        sourceBuilder.token()
                .name("@workflow:Workflow")
                .newLine();

        Optional<Property> visibilityProperty = sourceBuilder.getProperty(Property.IS_PUBLIC_KEY);
        if (visibilityProperty.isPresent() && Boolean.parseBoolean(visibilityProperty.get().value().toString())) {
            sourceBuilder.token().keyword(SyntaxKind.PUBLIC_KEYWORD);
        }

        sourceBuilder.token()
                .keyword(SyntaxKind.FUNCTION_KEYWORD)
                .name(funcName)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN);

        LineRange lineRange = sourceBuilder.flowNode.codedata().lineRange();
        boolean isNew = Boolean.TRUE.equals(sourceBuilder.flowNode.codedata().isNew());
        Optional<Property> inputProperty = sourceBuilder.getProperty(INPUT_KEY);
        String inputTypeName = inputProperty.map(p -> p.value().toString()).orElse("");
        boolean hasPrevParam = false;
        // New workflow nodes may still carry a line range from the insertion context (for example, diagram creation
        // from main.bal). Treat `isNew` as the source of truth so new workflow declarations are generated fully in
        // functions.bal with imports and an empty body.
        if (!isNew && lineRange != null) {
            FunctionDefinitionNode existingFn = WorkflowUtil.findEnclosingWorkflowFunction(sourceBuilder);
            if (existingFn != null) {
                SemanticModel semanticModel = FileSystemUtils.getSemanticModel(
                        sourceBuilder.workspaceManager, sourceBuilder.filePath);
                ModuleInfo moduleInfo = ModuleInfo.from(FileSystemUtils.getDocument(
                        sourceBuilder.workspaceManager, sourceBuilder.filePath).module().descriptor());
                for (ParameterNode parameter : existingFn.functionSignature().parameters()) {
                    Optional<Symbol> symbol = semanticModel.symbol(parameter);
                    if (symbol.isEmpty() || symbol.get().kind() != SymbolKind.PARAMETER) {
                        continue;
                    }
                    ParameterSymbol paramSymbol = (ParameterSymbol) symbol.get();
                    boolean isInput = !WorkflowUtil.isWorkflowContextParameter(paramSymbol) &&
                            !WorkflowUtil.isValidDataType(TypeUtils.resolveTypeReference(paramSymbol.typeDescriptor()));
                    if (isInput && inputTypeName.isEmpty()) {
                        continue;
                    }
                    if (hasPrevParam) {
                        sourceBuilder.token().keyword(SyntaxKind.COMMA_TOKEN);
                    }
                    Optional<String> paramName = paramSymbol.getName();
                    if (isInput) {
                        generateParameter(sourceBuilder, inputTypeName, paramName.orElse(DEFAULT_INPUT_PARAM_NAME));
                        hasPrevParam = true;
                    } else {
                        if (paramName.isPresent()) {
                            String typeName = CommonUtils.getTypeSignature(semanticModel,
                                    paramSymbol.typeDescriptor(), false, moduleInfo);
                            generateParameter(sourceBuilder, typeName, paramName.get());
                            hasPrevParam = true;
                        }
                    }
                }
            }
        } else if (!inputTypeName.isEmpty()) {
            // New workflow — emit the input param from the property using the default name.
            generateParameter(sourceBuilder, inputTypeName, DEFAULT_INPUT_PARAM_NAME);
        }

        sourceBuilder.token().keyword(SyntaxKind.CLOSE_PAREN_TOKEN);

        // Return type
        Optional<Property> returnType = sourceBuilder.getProperty(Property.TYPE_KEY);
        if (returnType.isPresent()) {
            String typeName = returnType.get().value().toString();
            if (!typeName.isEmpty()) {
                sourceBuilder.token()
                        .keyword(SyntaxKind.RETURNS_KEYWORD)
                        .name(typeName);
            }
        }

        if (isNew || lineRange == null) {
            sourceBuilder
                    .token()
                        .openBrace()
                        .closeBrace()
                        .stepOut()
                    .textEdit(SourceBuilder.SourceKind.DECLARATION)
                    .acceptImport();
        } else {
            sourceBuilder
                    .token().skipFormatting().stepOut()
                    .textEdit();
        }

        return sourceBuilder.build();
    }

    public static void generateParameter(SourceBuilder sourceBuilder, String typeName, String paramName) {
        sourceBuilder.token()
                .name(typeName)
                .whiteSpace()
                .name(paramName);
    }
}
