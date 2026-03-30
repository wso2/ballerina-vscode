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

import com.google.gson.Gson;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ParameterSymbol;
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.FunctionSignatureNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.ParameterNode;
import io.ballerina.compiler.syntax.tree.RecordTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.compiler.syntax.tree.Token;
import io.ballerina.compiler.syntax.tree.TypeDefinitionNode;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FormBuilder;
import io.ballerina.flowmodelgenerator.core.model.Member;
import io.ballerina.flowmodelgenerator.core.model.Metadata;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.model.TypeData;
import io.ballerina.flowmodelgenerator.core.utils.FileSystemUtils;
import io.ballerina.flowmodelgenerator.core.utils.TypeUtils;
import io.ballerina.flowmodelgenerator.core.utils.WorkflowUtil;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.FunctionDataBuilder;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.modelgenerator.commons.ParameterData;
import io.ballerina.projects.Document;
import io.ballerina.projects.Module;
import io.ballerina.tools.text.LineRange;
import io.ballerina.tools.text.TextRange;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.ANYDATA;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.AWAIT_METHOD_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.CONTEXT_CLASS_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.DEFAULT_DATA_PARAM_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.DATA_SUFFIX;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Represents a workflow wait for data node.
 * This is a specialized wait operation for workflow data (check wait data.dataName).
 *
 * @since 2.0.0
 */
public class WaitDataBuilder extends CallBuilder {
    private static final String LABEL = "Wait for Data";
    private static final String DESCRIPTION = "Wait for workflow data to be received";
    private static final String DATA_NAME_KEY = "dataName";
    private static final String DATA_NAME_LABEL = "Data Name";
    private static final String DATA_NAME_DOC = "Name of the data to wait for";
    private static final String DATA_TYPE_KEY = "dataType";
    private static final String DATA_TYPE_LABEL = "Data Type";
    private static final String DATA_TYPE_DOC = "Type of the data to be received on successful wait";
    private static final String DATA_RECEIVE_VAR_NAME = "Data Receive Variable Name";
    private static final String DATA_RECEIVE_VAR_DOC = "Variable name to receive the data";
    private static final String DATA_WAITS_KEY = "dataWaits";
    private static final String DATA_WAITS_LABEL = "Data Waits";
    private static final String DATA_WAITS_DOC = "Data to wait for (one or more)";
    public static final String FUTURES_PARAM = "futures";
    private static final Set<String> EXCLUDED_AWAIT_PARAMS = Set.of(FUTURES_PARAM, "T");

    private static final Gson gson = new Gson();

    @Override
    protected NodeKind getFunctionNodeKind() {
        return NodeKind.WAIT_DATA;
    }

    @Override
    protected FunctionData.Kind getFunctionResultKind() {
        return FunctionData.Kind.WAIT_DATA;
    }

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata().node(NodeKind.WAIT_DATA);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        properties().nestedProperty();
        properties()
                .endNestedProperty(Property.ValueType.REPEATABLE_PROPERTY, DATA_WAITS_KEY, DATA_WAITS_LABEL,
                        DATA_WAITS_DOC, getDataWaitSchema(), false, false);
        ModuleInfo workflowModuleInfo = new ModuleInfo(WORKFLOW_ORG, WORKFLOW_MODULE, WORKFLOW_MODULE, null);
        FunctionData callActivityData = new FunctionDataBuilder()
                .name(AWAIT_METHOD_NAME)
                .moduleInfo(workflowModuleInfo)
                .parentSymbolType(CONTEXT_CLASS_NAME)
                .functionResultKind(FunctionData.Kind.REMOTE)
                .project(PackageUtil.loadProject(context.workspaceManager(), context.filePath()))
                .userModuleInfo(moduleInfo)
                .workspaceManager(context.workspaceManager())
                .filePath(context.filePath())
                .build();

        LinkedHashMap<String, ParameterData> filteredParams = new LinkedHashMap<>(callActivityData.parameters());
        filteredParams.keySet().removeAll(EXCLUDED_AWAIT_PARAMS);
        callActivityData.setParameters(filteredParams);

        Module module = context.workspaceManager().module(context.filePath()).orElse(null);
        setParameterProperties(callActivityData, module);
    }

    public static Property getDataWaitSchema() {
        return DataWaitSchemaHolder.DATA_ENTRY_SCHEMA;
    }

    private static void setDataWaitProperties(FormBuilder<?> formBuilder) {
        formBuilder.nestedProperty();

        // Data receive variable name
        formBuilder.custom()
                .metadata()
                    .label(DATA_RECEIVE_VAR_NAME)
                    .description(DATA_RECEIVE_VAR_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.IDENTIFIER)
                    .scope(Property.LOCAL_SCOPE)
                    .selected(true)
                    .stepOut()
                .value("")
                .editable(true);
        formBuilder.addProperty(Property.VARIABLE_KEY);

        // Data type
        formBuilder.custom()
                .metadata()
                    .label(DATA_TYPE_LABEL)
                    .description(DATA_TYPE_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.TYPE)
                    .ballerinaType(ANYDATA)
                    .selected(true)
                    .stepOut()
                .value("")
                .editable(true);
        formBuilder.addProperty(DATA_TYPE_KEY);

        // Data name
        formBuilder.custom()
                .metadata()
                    .label(DATA_NAME_LABEL)
                    .description(DATA_NAME_DOC)
                    .stepOut()
                .type()
                    .fieldType(Property.ValueType.IDENTIFIER)
                    .selected(true)
                    .stepOut()
                .value("")
                .editable(true);
        formBuilder.addProperty(DATA_NAME_KEY);

        formBuilder.endNestedProperty(Property.ValueType.FIXED_PROPERTY, "", DATA_WAITS_LABEL, DATA_WAITS_DOC);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        List<DataWait> entries = parseDataWaits(sourceBuilder);
        if (entries.isEmpty()) {
            throw new IllegalStateException("At least one data entry is required");
        }

        String dataParamName = addDataFieldsAndGetParam(sourceBuilder, entries);

        if (entries.size() > 1 || hasNonEmptyAwaitParams(sourceBuilder)) {
            generateAwaitCall(sourceBuilder, entries, dataParamName);
        } else {
            // Simple: type var = check wait data.dataName;
            DataWait entry = entries.getFirst();
            sourceBuilder.token()
                    .name(entry.dataType)
                    .whiteSpace()
                    .name(entry.variableName)
                    .keyword(SyntaxKind.EQUAL_TOKEN)
                    .keyword(SyntaxKind.CHECK_KEYWORD)
                    .keyword(SyntaxKind.WAIT_KEYWORD)
                    .name(dataParamName + "." + entry.dataName)
                    .endOfStatement();
        }
        sourceBuilder.textEdit();

        return sourceBuilder.build();
    }

    private void generateAwaitCall(SourceBuilder sourceBuilder, List<DataWait> entries, String dataParamName) {
        String ctxParamName = ActivityCallBuilder.resolveContextParamName(sourceBuilder);
        // Tuple type: [type1, type2]
        sourceBuilder.token().keyword(SyntaxKind.OPEN_BRACKET_TOKEN);
        for (int i = 0; i < entries.size(); i++) {
            if (i > 0) {
                sourceBuilder.token().keyword(SyntaxKind.COMMA_TOKEN);
            }
            sourceBuilder.token().name(entries.get(i).dataType);
        }
        sourceBuilder.token().keyword(SyntaxKind.CLOSE_BRACKET_TOKEN);

        // Tuple binding pattern: [var1, var2]
        sourceBuilder.token().keyword(SyntaxKind.OPEN_BRACKET_TOKEN);
        for (int i = 0; i < entries.size(); i++) {
            if (i > 0) {
                sourceBuilder.token().keyword(SyntaxKind.COMMA_TOKEN);
            }
            sourceBuilder.token().name(entries.get(i).variableName);
        }
        sourceBuilder.token().keyword(SyntaxKind.CLOSE_BRACKET_TOKEN);

        // = check ctx->await(
        sourceBuilder.token()
                .keyword(SyntaxKind.EQUAL_TOKEN)
                .keyword(SyntaxKind.CHECK_KEYWORD)
                .name(ctxParamName)
                .keyword(SyntaxKind.RIGHT_ARROW_TOKEN)
                .name(AWAIT_METHOD_NAME)
                .keyword(SyntaxKind.OPEN_PAREN_TOKEN);

        // Futures array: [data.d1, data.d2]
        sourceBuilder.token().keyword(SyntaxKind.OPEN_BRACKET_TOKEN);
        for (int i = 0; i < entries.size(); i++) {
            if (i > 0) {
                sourceBuilder.token().keyword(SyntaxKind.COMMA_TOKEN);
            }
            sourceBuilder.token().name(dataParamName + "." + entries.get(i).dataName);
        }
        sourceBuilder.token().keyword(SyntaxKind.CLOSE_BRACKET_TOKEN);

        // Named args (minCount, timeout) if provided
        appendAwaitNamedArgs(sourceBuilder);

        sourceBuilder.token()
                .keyword(SyntaxKind.CLOSE_PAREN_TOKEN)
                .endOfStatement();
    }

    private boolean hasNonEmptyAwaitParams(SourceBuilder sourceBuilder) {
        Map<String, Property> properties = sourceBuilder.flowNode.properties();
        if (properties == null) {
            return false;
        }
        for (Map.Entry<String, Property> entry : properties.entrySet()) {
            if (entry.getKey().equals(DATA_WAITS_KEY)) {
                continue;
            }
            Property prop = entry.getValue();
            if (prop.value() != null && !prop.value().toString().isEmpty()) {
                return true;
            }
        }
        return false;
    }

    private void appendAwaitNamedArgs(SourceBuilder sourceBuilder) {
        Map<String, Property> properties = sourceBuilder.flowNode.properties();
        if (properties == null) {
            return;
        }
        for (Map.Entry<String, Property> entry : properties.entrySet()) {
            if (entry.getKey().equals(DATA_WAITS_KEY)) {
                continue;
            }
            Property prop = entry.getValue();
            if (prop.value() == null || prop.value().toString().isEmpty()) {
                continue;
            }
            sourceBuilder.token()
                    .keyword(SyntaxKind.COMMA_TOKEN)
                    .name(prop.codedata().originalName())
                    .whiteSpace()
                    .keyword(SyntaxKind.EQUAL_TOKEN)
                    .expression(prop);
        }
    }

    private List<DataWait> parseDataWaits(SourceBuilder sourceBuilder) {
        Optional<Property> dataWaitsProperty = sourceBuilder.getProperty(DATA_WAITS_KEY);
        if (dataWaitsProperty.isEmpty() || !(dataWaitsProperty.get().value() instanceof Map<?, ?> entryMap)) {
            throw new IllegalStateException("Wait data node is missing required data entries");
        }

        List<DataWait> entries = new ArrayList<>();
        for (Object obj : entryMap.values()) {
            Property entryProperty = gson.fromJson(gson.toJsonTree(obj), Property.class);
            if (!(entryProperty.value() instanceof Map<?, ?> entryData)) {
                continue;
            }
            Map<String, Property> entryProperties = gson.fromJson(gson.toJsonTree(entryData),
                    FormBuilder.NODE_PROPERTIES_TYPE);

            Property variableProp = entryProperties.get(Property.VARIABLE_KEY);
            Property dataTypeProp = entryProperties.get(DATA_TYPE_KEY);
            Property dataNameProp = entryProperties.get(DATA_NAME_KEY);
            if (variableProp == null || dataTypeProp == null || dataNameProp == null) {
                continue;
            }
            String variableName = variableProp.value().toString();
            String dataType = dataTypeProp.value().toString();
            String dataName = dataNameProp.value().toString();
            if (variableName.isBlank() || dataType.isBlank() || dataName.isBlank()) {
                continue;
            }
            entries.add(new DataWait(variableName, dataType, dataName));
        }
        return entries;
    }

    private String addDataFieldsAndGetParam(SourceBuilder sourceBuilder, List<DataWait> entries) {
        try {
            sourceBuilder.workspaceManager.loadProject(sourceBuilder.filePath);
        } catch (WorkspaceDocumentException | EventSyncException e) {
            throw new IllegalStateException("WaitDataBuilder failed to load project", e);
        }

        SemanticModel semanticModel = FileSystemUtils.getSemanticModel(sourceBuilder.workspaceManager,
                sourceBuilder.filePath);

        FunctionDefinitionNode functionNode = WorkflowUtil.findEnclosingWorkflowFunction(sourceBuilder);
        if (functionNode == null) {
            throw new IllegalStateException("WaitDataBuilder must be used inside a workflow function");
        }

        Optional<ParameterSymbol> dataParamSymbol = getDataParameterTypeSymbol(functionNode, semanticModel);
        if (dataParamSymbol.isPresent()) {
            ParameterSymbol parameterSymbol = dataParamSymbol.get();
            modifyExistingDataType(sourceBuilder, parameterSymbol.typeDescriptor(), entries);
            return parameterSymbol.getName().orElseThrow(
                    () -> new IllegalStateException("Data parameter must have a name"));
        } else {
            // No data parameter - create new type and add parameter
            String funcName = functionNode.functionName().text();
            String baseTypeName = funcName.substring(0, 1).toUpperCase(Locale.ROOT) + funcName.substring(1)
                    + DATA_SUFFIX;
            String dataTypeName = generateUniqueDataTypeName(baseTypeName, semanticModel);
            createNewDataType(sourceBuilder, dataTypeName, entries);
            addDataParameterToFunction(sourceBuilder, functionNode, dataTypeName);
            return DEFAULT_DATA_PARAM_NAME;
        }
    }

    /**
     * Gets the data parameter from the function if it exists.
     * The data parameter is expected to be the third parameter in a workflow function.
     *
     * @param functionNode The function definition node
     * @param semanticModel The semantic model
     * @return Optional containing the data parameter node if present
     */
    private Optional<ParameterSymbol> getDataParameterTypeSymbol(FunctionDefinitionNode functionNode,
                                                                 SemanticModel semanticModel) {
        SeparatedNodeList<ParameterNode> parameters = functionNode.functionSignature().parameters();
        if (parameters.isEmpty()) {
            return Optional.empty();
        }

        Optional<Symbol> symbol = semanticModel.symbol(parameters.get(parameters.size() - 1));
        if (symbol.isPresent() && symbol.get().kind() == SymbolKind.PARAMETER) {
            ParameterSymbol paramSymbol = (ParameterSymbol) symbol.get();
            if (isValidDataType(TypeUtils.resolveTypeReference(paramSymbol.typeDescriptor()))) {
                return Optional.of(paramSymbol);
            }
        }

        return Optional.empty();
    }

    /**
     * Generates a unique data type name by checking existing symbols.
     *
     * @param baseName      The base name for the data type (e.g., "FuncNameData")
     * @param semanticModel The semantic model
     * @return A unique type name
     */
    private String generateUniqueDataTypeName(String baseName, SemanticModel semanticModel) {
        Set<String> existingNames = semanticModel.moduleSymbols().stream()
                .flatMap(symbol -> symbol.getName().stream())
                .collect(Collectors.toSet());
        if (!existingNames.contains(baseName)) {
            return baseName;
        }

        // If base name exists, append incrementing suffix
        int counter = 1;
        String newName = baseName + counter;
        while (existingNames.contains(newName)) {
            counter++;
            newName = baseName + counter;
        }
        return newName;
    }

    private void createNewDataType(SourceBuilder sourceBuilder, String dataTypeName,
                                   List<DataWait> entries) {
        // Create a new data type with fields for all data entries
        List<Member> members = new ArrayList<>();
        for (DataWait entry : entries) {
            String fieldType = SyntaxKind.FUTURE_KEYWORD.stringValue() + SyntaxKind.LT_TOKEN.stringValue()
                    + entry.dataType + SyntaxKind.GT_TOKEN.stringValue();
            members.add(new Member.MemberBuilder()
                    .kind(Member.MemberKind.FIELD)
                    .type(fieldType)
                    .name(entry.dataName)
                    .optional(false)
                    .readonly(false)
                    .build());
        }

        TypeData dataTypeData = new TypeData(
                dataTypeName,
                true,
                new Metadata(dataTypeName, "Data record for workflow function",
                        null, null, null, null),
                new Codedata.Builder<>(null).node(NodeKind.RECORD).build(),
                Map.of(),
                members,
                null,
                null,
                null,
                null,
                false
        );
        sourceBuilder.acceptTypeGeneration(dataTypeData);
    }

    private void addDataParameterToFunction(SourceBuilder sourceBuilder,
                                            FunctionDefinitionNode functionNode,
                                            String dataTypeName) {
        FunctionSignatureNode signatureNode = functionNode.functionSignature();
        LineRange closeParenLineRange = signatureNode.closeParenToken().lineRange();
        Range insertRange = CommonUtils.toRange(closeParenLineRange.startLine());
        if (!signatureNode.parameters().isEmpty()) {
            sourceBuilder.token().keyword(SyntaxKind.COMMA_TOKEN).whiteSpace();
        }

        sourceBuilder.token()
                .name(dataTypeName)
                .whiteSpace()
                .name(DEFAULT_DATA_PARAM_NAME)
                .skipFormatting().stepOut().textEdit(null, sourceBuilder.filePath, insertRange);
    }

    private void modifyExistingDataType(SourceBuilder sourceBuilder, TypeSymbol dataTypeSymbol,
                                        List<DataWait> entries) {
        RecordTypeSymbol recordType = (RecordTypeSymbol) TypeUtils.resolveTypeReference(dataTypeSymbol);
        Map<String, RecordFieldSymbol> existingFields = recordType.fieldDescriptors();

        // Check if any field already exists
        for (DataWait entry : entries) {
            if (existingFields.containsKey(entry.dataName)) {
                throw new RuntimeException(
                        "Field already exists in the data type definition with name: " + entry.dataName);
            }
        }

        if (recordType.getLocation().isEmpty()) {
            throw new IllegalStateException("WaitDataBuilder cannot update data type: missing type location");
        }

        LineRange typeLineRange = recordType.getLocation().get().lineRange();

        Path typesFilePath = sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath)
                .resolve(typeLineRange.fileName());
        Document typesDoc = FileSystemUtils.getDocument(sourceBuilder.workspaceManager, typesFilePath);
        if (typesDoc == null) {
            throw new IllegalStateException("WaitDataBuilder cannot load data type document: " + typesFilePath);
        }
        SyntaxTree typesSyntaxTree = typesDoc.syntaxTree();
        ModulePartNode typesRootNode = typesSyntaxTree.rootNode();

        // Find the type definition node using the location
        int txtPos = typesDoc.textDocument().textPositionFrom(typeLineRange.startLine());
        TextRange textRange = TextRange.from(txtPos, 0);
        NonTerminalNode typeDefNode = typesRootNode.findNode(textRange);

        Node typeDescNode;
        if  (typeDefNode == null) {
            throw new IllegalStateException("WaitDataBuilder could not locate target type definition");
        } else if (typeDefNode.kind() == SyntaxKind.TYPE_DEFINITION) {
            typeDescNode = ((TypeDefinitionNode) typeDefNode).typeDescriptor();
        } else if (typeDefNode.kind() == SyntaxKind.RECORD_TYPE_DESC) {
            typeDescNode = typeDefNode;
        } else {
            throw new IllegalStateException("WaitDataBuilder data type is not a record");
        }

        if (typeDescNode.kind() != SyntaxKind.RECORD_TYPE_DESC) {
            throw new IllegalStateException("WaitDataBuilder target type is not a record");
        }

        // Get the bodyStartDelimiter location ({|)
        Token bodyStartDelimiter = ((RecordTypeDescriptorNode) typeDescNode).bodyStartDelimiter();
        LineRange delimiterLineRange = bodyStartDelimiter.lineRange();
        Range insertRange = CommonUtils.toRange(delimiterLineRange.endLine());

        for (DataWait entry : entries) {
            sourceBuilder.token()
                    .name(SyntaxKind.FUTURE_KEYWORD.stringValue())
                    .name(SyntaxKind.LT_TOKEN.stringValue())
                    .name(entry.dataType)
                    .name(SyntaxKind.GT_TOKEN.stringValue())
                    .whiteSpace()
                    .name(entry.dataName)
                    .endOfStatement();
        }
        sourceBuilder.token()
                .skipFormatting().stepOut().textEdit(null, typesFilePath, insertRange);
    }

    private record DataWait(String variableName, String dataType, String dataName) { }

    private static class DataWaitSchemaHolder {

        private static final Property DATA_ENTRY_SCHEMA = initDataWaitSchema();

        private static Property initDataWaitSchema() {
            FormBuilder<?> formBuilder = new FormBuilder<>(null, null, null, null);
            setDataWaitProperties(formBuilder);
            Map<String, Property> nodeProperties = formBuilder.build();
            return nodeProperties.get("");
        }
    }

    private boolean isValidDataType(TypeSymbol typeSymbol) {
        typeSymbol = TypeUtils.resolveTypeReference(typeSymbol);
        TypeDescKind kind = typeSymbol.typeKind();

        // Must be a record type
        if (kind != TypeDescKind.RECORD) {
            return false;
        }

        // Check that it's a RecordTypeSymbol and all fields are future types
        Map<String, RecordFieldSymbol> fields = ((RecordTypeSymbol) typeSymbol).fieldDescriptors();
        if (fields.isEmpty()) {
            // Empty record is not a valid data record
            return false;
        }

        for (RecordFieldSymbol field : fields.values()) {
            TypeSymbol fieldType = TypeUtils.resolveTypeReference(field.typeDescriptor());
            if (fieldType.typeKind() != TypeDescKind.FUTURE) {
                return false;
            }
        }

        return true;
    }
}
