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

package io.ballerina.flowmodelgenerator.core.model.node;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ArrayTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.flowmodelgenerator.core.AiUtils;
import io.ballerina.flowmodelgenerator.core.TypeParameterReplacer;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.FormBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.PropertyType;
import io.ballerina.flowmodelgenerator.core.utils.FileSystemUtils;
import io.ballerina.flowmodelgenerator.core.utils.FlowNodeUtil;
import io.ballerina.flowmodelgenerator.core.utils.ParamUtils;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.FunctionDataBuilder;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.modelgenerator.commons.ParameterData;
import io.ballerina.projects.Document;
import io.ballerina.projects.Document;
import io.ballerina.projects.Module;
import io.ballerina.projects.Package;
import io.ballerina.projects.PackageDescriptor;
import io.ballerina.projects.Project;
import io.ballerina.projects.ProjectException;
import io.ballerina.tools.text.LinePosition;
import org.ballerinalang.langserver.common.utils.CommonUtil;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;

import java.nio.file.Path;
import java.util.Optional;
import java.util.List;
import java.util.Map;

/**
 * Abstract base class for function-like builders (functions, methods, resource actions).
 *
 * @since 1.0.0
 */
public abstract class CallBuilder extends NodeBuilder {

    protected abstract NodeKind getFunctionNodeKind();

    protected abstract FunctionData.Kind getFunctionResultKind();

    @Override
    public void setConcreteConstData() {
        codedata().node(getFunctionNodeKind());
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        Codedata codedata = context.codedata();

        Document document = null;
        Package resolvedPackage;
        if (isLocalFunction(context.workspaceManager(), context.filePath(), codedata)) {
            resolvedPackage = context.workspaceManager().project(context.filePath()).get().currentPackage();
            Module defaultModule = resolvedPackage.getDefaultModule();
            document = defaultModule.document(resolvedPackage.project().documentId(context.filePath()));
        } else {
            resolvedPackage = PackageUtil.getModulePackage(codedata.org(), codedata.packageName(),
                    codedata.version()).orElse(null);
        }
        FunctionDataBuilder functionDataBuilder = new FunctionDataBuilder()
                .name(codedata.symbol())
                .moduleInfo(new ModuleInfo(codedata.org(), codedata.packageName(), codedata.module(),
                        codedata.version()))
                .lsClientLogger(context.lsClientLogger())
                .functionResultKind(getFunctionResultKind())
                .project(PackageUtil.loadProject(context.workspaceManager(), context.filePath()))
                .userModuleInfo(moduleInfo)
                .resolvedPackage(resolvedPackage)
                .document(document);

        NodeKind functionNodeKind = getFunctionNodeKind();
        if (functionNodeKind != NodeKind.FUNCTION_CALL) {
            functionDataBuilder.parentSymbolType(codedata.object());
        }

        // Set the semantic model if the function is local
        boolean isLocalFunction = isLocalFunction(context.workspaceManager(), context.filePath(), codedata);
        if (isLocalFunction) {
            WorkspaceManager workspaceManager = context.workspaceManager();
            PackageUtil.loadProject(context.workspaceManager(), context.filePath());
            context.workspaceManager().module(context.filePath())
                    .map(module -> ModuleInfo.from(module.descriptor()))
                    .ifPresent(functionDataBuilder::userModuleInfo);
            SemanticModel semanticModel = workspaceManager.semanticModel(context.filePath()).orElseThrow();
            functionDataBuilder.semanticModel(semanticModel);
        }
        FunctionData functionData = functionDataBuilder.build();

        metadata()
                .label(functionData.name())
                .icon(CommonUtils.generateIcon(functionData.org(), functionData.packageName(),
                        functionData.version()))
                .description(functionData.description());
        codedata()
                .node(functionNodeKind)
                .org(codedata.org())
                .module(codedata.module())
                .packageName(codedata.packageName())
                .object(codedata.object())
                .version(codedata.version())
                .symbol(codedata.symbol())
                .lineRange(codedata.lineRange())
                .sourceCode(codedata.sourceCode())
                .inferredReturnType(functionData.inferredReturnType() ? functionData.returnType() : null);

        if (functionNodeKind != NodeKind.FUNCTION_CALL && functionNodeKind != NodeKind.AGENT &&
                functionNodeKind != NodeKind.CLASS_INIT) {
            properties().custom()
                    .metadata()
                    .label(Property.CONNECTION_LABEL)
                    .description(Property.CONNECTION_DOC)
                    .stepOut()
                    .type(Property.ValueType.EXPRESSION, isLocalFunction ? codedata.object() :
                            CommonUtils.getClassType(codedata.module(), codedata.object()))
                    .value(codedata.parentSymbol())
                    .hidden()
                    .stepOut()
                    .addProperty(Property.CONNECTION_KEY);
        }
        setParameterProperties(functionData);

        if (CommonUtils.hasReturn(functionData.returnType())) {
            setReturnTypeProperties(functionData, context, Property.RESULT_NAME, Property.RESULT_DOC, false);
        }

        if (functionData.returnError()) {
            properties().checkError(true);
        }
    }

    public static void buildInferredTypeProperty(NodeBuilder nodeBuilder, ParameterData paramData, String value) {
        String unescapedParamName = ParamUtils.removeLeadingSingleQuote(paramData.name());
        String label = paramData.label();
        // NOTE: This is added to improve user experience for persist client calls until the ideal user
        // experience is designed and implemented.
        // Issue: https://github.com/wso2/product-ballerina-integrator/issues/2042
        // If the inferredType is a record type, add it as the value of the property if the value is not provided
        if (value == null && paramData.typeSymbol() != null
                && CommonUtil.getRawType(paramData.typeSymbol()).typeKind().equals(TypeDescKind.RECORD)) {
            // The value is same as the default value for inferred type parameter
            value = paramData.defaultValue();
        }
        nodeBuilder.properties().custom()
                .metadata()
                    .label(label == null || label.isEmpty() ? unescapedParamName : label)
                    .description(paramData.description())
                    .stepOut()
                .codedata()
                    .kind(paramData.kind().name())
                    .originalName(paramData.name())
                    .stepOut()
                .value(value)
                .placeholder(paramData.placeholder())
                .defaultValue(paramData.defaultValue())
                .type(Property.ValueType.TYPE, paramData.type())
                .imports(paramData.importStatements())
                .editable()
                .stepOut()
                .addProperty(unescapedParamName);
    }

    protected void setParameterProperties(FunctionData function) {
        boolean hasOnlyRestParams = function.parameters().size() == 1;

        for (ParameterData paramResult : function.parameters().values()) {
            if (paramResult.kind() == ParameterData.Kind.PARAM_FOR_TYPE_INFER) {
                buildInferredTypeProperty(this, paramResult, null);
                continue;
            }

            if (paramResult.kind().equals(ParameterData.Kind.INCLUDED_RECORD)) {
                continue;
            }

            String unescapedParamName = ParamUtils.removeLeadingSingleQuote(paramResult.name());
            Property.Builder<FormBuilder<NodeBuilder>> customPropBuilder = properties().custom();
            String label = paramResult.label();
            customPropBuilder
                    .metadata()
                        .label(label == null || label.isEmpty() ? unescapedParamName : label)
                        .description(paramResult.description())
                        .stepOut()
                    .codedata()
                        .kind(paramResult.kind().name())
                        .originalName(paramResult.name())
                        .stepOut()
                    .placeholder(paramResult.placeholder())
                    .defaultValue(paramResult.defaultValue())
                    .imports(paramResult.importStatements())
                    .editable()
                    .defaultable(paramResult.optional());

            switch (paramResult.kind()) {
                case INCLUDED_RECORD_REST -> {
                    if (hasOnlyRestParams) {
                        customPropBuilder.defaultable(false);
                    }
                    unescapedParamName = "additionalValues";
                    customPropBuilder.type(Property.ValueType.MAPPING_EXPRESSION_SET, paramResult.type());
                }
                case REST_PARAMETER -> {
                    if (hasOnlyRestParams) {
                        customPropBuilder.defaultable(false);
                    }
                    customPropBuilder.type(Property.ValueType.EXPRESSION_SET, paramResult.type());
                }
                default -> {
                    // Add PROMPT field type for ai:Prompt parameters
                    // TODO: Need an extension pattern to extract the following implementation out of the CallBuilder
                    String typeSignature = CommonUtils.getTypeSignature(paramResult.typeSymbol(), moduleInfo);
                    if (AiUtils.AI_PROMPT_TYPE.equals(typeSignature)) {
                        customPropBuilder.type()
                                .fieldType(Property.ValueType.PROMPT)
                                .ballerinaType(AiUtils.AI_PROMPT_TYPE)
                                .selected(true)
                                .stepOut();
                    }
                    customPropBuilder.typeWithExpression(paramResult.typeSymbol(), moduleInfo,
                            paramResult.defaultValue());
                }
            }

            customPropBuilder
                    .stepOut()
                    .addProperty(FlowNodeUtil.getPropertyKey(unescapedParamName));
        }
    }

    protected void setReturnTypeProperties(FunctionData functionData, TemplateContext context, String label, String doc,
                                           boolean hidden) {
        properties()
                .type(functionData.returnType(), false, functionData.importStatements(), hidden,
                        Property.RESULT_TYPE_LABEL)
                .data(functionData.returnType(), context.getAllVisibleSymbolNames(), label, doc);
    }

    protected void setExpressionProperty(Codedata codedata) {
        properties().custom()
                .metadata()
                    .label(Property.CONNECTION_LABEL)
                    .description(Property.CONNECTION_DOC)
                    .stepOut()
                .type(Property.ValueType.EXPRESSION, CommonUtils.getClassType(codedata.module(), codedata.object()))
                .value(codedata.parentSymbol())
                .hidden()
                .stepOut()
                .addProperty(Property.CONNECTION_KEY);
    }

    private static boolean isLangLibFunction(Codedata codedata) {
        return codedata != null
                && CommonUtil.BALLERINA_ORG_NAME.equals(codedata.org())
                && codedata.module() != null
                && codedata.module().startsWith("lang.");
    }

    protected static String resolveLangLibReturnType(WorkspaceManager workspaceManager, Path filePath,
                                                     FlowNode flowNode) {
        if (!isLangLibFunction(flowNode.codedata())) {
            return null;
        }

        Optional<Property> typeProperty = flowNode.getProperty(Property.TYPE_KEY);
        if (typeProperty.isEmpty()) {
            return null;
        }

        String typeName = typeProperty.get().value().toString();

        // Find the first (longest) placeholder present in the return type
        String matchedPlaceholder = null;
        for (String placeholder : TypeParameterReplacer.getSortedPlaceholderValues()) {
            if (typeName.contains(placeholder)) {
                matchedPlaceholder = placeholder;
                break;
            }
        }
        if (matchedPlaceholder == null) {
            return null;
        }

        // Find a REQUIRED parameter whose ballerinaType template matches the placeholder structure
        Map<String, Property> properties = flowNode.properties();
        if (properties == null) {
            return null;
        }

        final String placeholder = matchedPlaceholder;
        for (Property prop : properties.values()) {
            if (prop.codedata() == null || prop.codedata().kind() == null) {
                continue;
            }
            if (!prop.codedata().kind().equals(ParameterData.Kind.REQUIRED.name())) {
                continue;
            }
            if (prop.value() == null || prop.value().toString().isBlank()) {
                continue;
            }
            if (prop.types() == null) {
                continue;
            }

            for (PropertyType pt : prop.types()) {
                String template = pt.ballerinaType();
                if (template == null) {
                    continue;
                }
                String varName = prop.value().toString().trim();
                String resolved = resolveConcreteType(workspaceManager, filePath, flowNode,
                        varName, template, placeholder);
                if (resolved != null) {
                    return typeName.replace(placeholder, resolved);
                }
            }
        }
        return null;
    }

    private static String resolveConcreteType(WorkspaceManager workspaceManager, Path filePath,
                                              FlowNode flowNode, String varName,
                                              String template, String placeholder) {
        try {
            workspaceManager.loadProject(filePath);
            SemanticModel semanticModel = FileSystemUtils.getSemanticModel(workspaceManager, filePath);
            Document document = FileSystemUtils.getDocument(workspaceManager, filePath);

            LinePosition position = flowNode.codedata().lineRange().startLine();

            List<Symbol> visibleSymbols = semanticModel.visibleSymbols(document, position);
            Optional<Symbol> matchingSymbol = visibleSymbols.stream()
                    .filter(s -> s.getName().map(name -> name.equals(varName)).orElse(false))
                    .findFirst();

            if (matchingSymbol.isEmpty() || !(matchingSymbol.get() instanceof VariableSymbol variableSymbol)) {
                return null;
            }

            TypeSymbol typeSymbol = variableSymbol.typeDescriptor();
            if (typeSymbol.typeKind() == TypeDescKind.TYPE_REFERENCE) {
                typeSymbol = ((TypeReferenceTypeSymbol) typeSymbol).typeDescriptor();
            }

            ModuleInfo moduleInfo = ModuleInfo.from(document.module().descriptor());

            // Case 1: template IS the placeholder — use the actual type directly
            if (template.equals(placeholder)) {
                return CommonUtils.getTypeSignature(semanticModel, typeSymbol, true, moduleInfo);
            }

            // Case 2: template is placeholder + [] — extract the array element type
            if (template.equals(placeholder + "[]")) {
                if (typeSymbol.typeKind() != TypeDescKind.ARRAY) {
                    return null;
                }
                TypeSymbol elementType = ((ArrayTypeSymbol) typeSymbol).memberTypeDescriptor();
                return CommonUtils.getTypeSignature(semanticModel, elementType, true, moduleInfo);
            }

            return null;
        } catch (WorkspaceDocumentException | EventSyncException | ProjectException e) {
            return null;
        }
    }

    protected static boolean isLocalFunction(WorkspaceManager workspaceManager, Path filePath, Codedata codedata) {
        if (codedata.org() == null || codedata.module() == null) {
            return false;
        }
        try {
            Project project = workspaceManager.loadProject(filePath);
            PackageDescriptor descriptor = project.currentPackage().descriptor();
            String packageOrg = descriptor.org().value();
            String packageName = descriptor.name().value();

            return packageOrg.equals(codedata.org())
                    && packageName.equals(codedata.module());
        } catch (WorkspaceDocumentException | EventSyncException e) {
            return false;
        }
    }
}
