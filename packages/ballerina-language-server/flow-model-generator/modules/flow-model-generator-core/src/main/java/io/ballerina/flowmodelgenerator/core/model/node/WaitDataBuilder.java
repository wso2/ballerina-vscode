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
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.syntax.tree.DefaultableParameterNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.FunctionSignatureNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.ParameterNode;
import io.ballerina.compiler.syntax.tree.RecordTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.RequiredParameterNode;
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
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.CONTEXT_CLASS_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.DEFAULT_EVENTS_PARAM_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.EVENTS_SUFFIX;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Represents a workflow wait for data node.
 * This is a specialized wait operation for workflow data (check wait events.dataName).
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
    private static final String DATA_ENTRIES_KEY = "dataEntries";
    private static final String DATA_ENTRIES_LABEL = "Data Entries";
    private static final String DATA_ENTRIES_DOC = "Data entries to wait for (one or more)";
    private static final String AWAIT_METHOD = "await";
    private static final Set<String> EXCLUDED_AWAIT_PARAMS = Set.of("futures", "T");

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
                .endNestedProperty(Property.ValueType.REPEATABLE_PROPERTY, DATA_ENTRIES_KEY, DATA_ENTRIES_LABEL,
                        DATA_ENTRIES_DOC, getDataEntrySchema(), false, false);
        ModuleInfo workflowModuleInfo = new ModuleInfo(WORKFLOW_ORG, WORKFLOW_MODULE, WORKFLOW_MODULE, null);
        FunctionData callActivityData = new FunctionDataBuilder()
                .name(AWAIT_METHOD)
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

    public static Property getDataEntrySchema() {
        return DataEntrySchemaHolder.DATA_ENTRY_SCHEMA;
    }

    private static void setDataEntryProperties(FormBuilder<?> formBuilder) {
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

        formBuilder.endNestedProperty(Property.ValueType.FIXED_PROPERTY, "", DATA_ENTRIES_LABEL, DATA_ENTRIES_DOC);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        List<DataEntry> entries = parseDataEntries(sourceBuilder);
        if (entries.isEmpty()) {
            throw new IllegalStateException("At least one data entry is required");
        }

        addNewDataFieldsToWorkflow(sourceBuilder, entries);

        // Build wait statements: DataType dataReceiveVar = check wait events.dataName;
        for (DataEntry entry : entries) {
            sourceBuilder.token()
                    .name(entry.dataType)
                    .whiteSpace()
                    .name(entry.variableName)
                    .keyword(SyntaxKind.EQUAL_TOKEN)
                    .keyword(SyntaxKind.CHECK_KEYWORD)
                    .keyword(SyntaxKind.WAIT_KEYWORD)
                    .name(DEFAULT_EVENTS_PARAM_NAME + "." + entry.dataName)
                    .endOfStatement();
        }
        sourceBuilder.textEdit();

        return sourceBuilder.build();
    }

    private List<DataEntry> parseDataEntries(SourceBuilder sourceBuilder) {
        Optional<Property> dataEntriesProperty = sourceBuilder.getProperty(DATA_ENTRIES_KEY);
        if (dataEntriesProperty.isEmpty() || !(dataEntriesProperty.get().value() instanceof Map<?, ?> entryMap)) {
            throw new IllegalStateException("Wait data node is missing required data entries");
        }

        List<DataEntry> entries = new ArrayList<>();
        for (Object obj : entryMap.values()) {
            Property entryProperty = gson.fromJson(gson.toJsonTree(obj), Property.class);
            if (!(entryProperty.value() instanceof Map<?, ?> entryData)) {
                continue;
            }
            Map<String, Property> entryProperties = gson.fromJson(gson.toJsonTree(entryData),
                    FormBuilder.NODE_PROPERTIES_TYPE);

            String variableName = entryProperties.get(Property.VARIABLE_KEY).value().toString();
            String dataType = entryProperties.get(DATA_TYPE_KEY).value().toString();
            String dataName = entryProperties.get(DATA_NAME_KEY).value().toString();
            if (variableName.isBlank() || dataType.isBlank() || dataName.isBlank()) {
                throw new IllegalStateException(
                        "WaitDataBuilder requires non-blank variableName/dataType/dataName");
            }
            entries.add(new DataEntry(variableName, dataType, dataName));
        }
        return entries;
    }

    private void addNewDataFieldsToWorkflow(SourceBuilder sourceBuilder, List<DataEntry> entries) {
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

        Optional<TypeSymbol> eventsTypeSymbol = getEventsParameterTypeSymbol(functionNode, semanticModel);
        if (eventsTypeSymbol.isPresent()) {
            modifyExistingEventsType(sourceBuilder, eventsTypeSymbol.get(), entries);
        } else {
            // No events parameter - create new type and add parameter
            String funcName = functionNode.functionName().text();
            String baseTypeName = funcName.substring(0, 1).toUpperCase(Locale.ROOT) + funcName.substring(1)
                    + EVENTS_SUFFIX;
            String eventsTypeName = generateUniqueEventsTypeName(baseTypeName, semanticModel);
            createNewEventsType(sourceBuilder, eventsTypeName, entries);
            addEventsParameterToFunction(sourceBuilder, functionNode, eventsTypeName);
        }
    }

    /**
     * Gets the events parameter from the function if it exists.
     * The events parameter is expected to be the third parameter in a workflow function.
     *
     * @param functionNode The function definition node
     * @param semanticModel The semantic model
     * @return Optional containing the events parameter node if present
     */
    private Optional<TypeSymbol> getEventsParameterTypeSymbol(FunctionDefinitionNode functionNode,
                                                              SemanticModel semanticModel) {
        SeparatedNodeList<ParameterNode> parameters = functionNode.functionSignature().parameters();
        if (parameters.isEmpty()) {
            return Optional.empty();
        }
        ParameterNode lastParam = parameters.get(parameters.size() - 1);

        Node typeNode = null;
        if (lastParam.kind() == SyntaxKind.REQUIRED_PARAM) {
            typeNode = ((RequiredParameterNode) lastParam).typeName();
        } else if (lastParam.kind() == SyntaxKind.DEFAULTABLE_PARAM) {
            typeNode = ((DefaultableParameterNode) lastParam).typeName();
        }

        if (typeNode == null) {
            return Optional.empty();
        }

        Optional<Symbol> symbol = semanticModel.symbol(typeNode);
        if (symbol.isPresent() && symbol.get().kind() == SymbolKind.TYPE) {
            TypeSymbol typeSymbol = TypeUtils.resolveTypeReference((TypeSymbol) symbol.get());
            if (isValidEventsType(typeSymbol)) {
                return Optional.of(typeSymbol);
            }
        }

        return Optional.empty();
    }

    /**
     * Generates a unique events type name by checking existing symbols.
     *
     * @param baseName      The base name for the events type (e.g., "FuncNameEvents")
     * @param semanticModel The semantic model
     * @return A unique type name
     */
    private String generateUniqueEventsTypeName(String baseName, SemanticModel semanticModel) {
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

    private void createNewEventsType(SourceBuilder sourceBuilder, String eventsTypeName,
                                     List<DataEntry> entries) {
        // Create a new events type with fields for all data entries
        List<Member> members = new ArrayList<>();
        for (DataEntry entry : entries) {
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

        TypeData eventsTypeData = new TypeData(
                eventsTypeName,
                true,
                new Metadata(eventsTypeName, "Events record for workflow function",
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
        sourceBuilder.acceptTypeGeneration(eventsTypeData);
    }

    private void addEventsParameterToFunction(SourceBuilder sourceBuilder,
                                              FunctionDefinitionNode functionNode,
                                              String eventsTypeName) {
        FunctionSignatureNode signatureNode = functionNode.functionSignature();
        LineRange closeParenLineRange = signatureNode.closeParenToken().lineRange();
        Range insertRange = CommonUtils.toRange(closeParenLineRange.startLine());
        boolean hasExistingParams = !signatureNode.parameters().isEmpty();
        if (hasExistingParams) {
            sourceBuilder.token().keyword(SyntaxKind.COMMA_TOKEN).whiteSpace();
        }

        sourceBuilder.token()
                .name(eventsTypeName)
                .whiteSpace()
                .name(DEFAULT_EVENTS_PARAM_NAME)
                .skipFormatting().stepOut().textEdit(null, sourceBuilder.filePath, insertRange);
    }

    private void modifyExistingEventsType(SourceBuilder sourceBuilder, TypeSymbol eventsTypeSymbol,
                                          List<DataEntry> entries) {
        RecordTypeSymbol recordType = (RecordTypeSymbol) eventsTypeSymbol;
        Map<String, RecordFieldSymbol> existingFields = recordType.fieldDescriptors();

        // Check if any field already exists
        for (DataEntry entry : entries) {
            if (existingFields.containsKey(entry.dataName)) {
                throw new RuntimeException(
                        "Field already exists in the events type definition with name: " + entry.dataName);
            }
        }

        if (recordType.getLocation().isEmpty()) {
            throw new IllegalStateException("WaitDataBuilder cannot update events type: missing type location");
        }

        LineRange typeLineRange = recordType.getLocation().get().lineRange();

        Path typesFilePath = sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath)
                .resolve(typeLineRange.fileName());
        Document typesDoc = FileSystemUtils.getDocument(sourceBuilder.workspaceManager, typesFilePath);
        if (typesDoc == null) {
            throw new IllegalStateException("WaitDataBuilder cannot load events type document: " + typesFilePath);
        }
        SyntaxTree typesSyntaxTree = typesDoc.syntaxTree();
        ModulePartNode typesRootNode = typesSyntaxTree.rootNode();

        // Find the type definition node using the location
        int txtPos = typesDoc.textDocument().textPositionFrom(typeLineRange.startLine());
        TextRange textRange = TextRange.from(txtPos, 0);
        NonTerminalNode typeDefNode = typesRootNode.findNode(textRange);
        if (typeDefNode == null || typeDefNode.kind() != SyntaxKind.TYPE_DEFINITION) {
            throw new IllegalStateException("WaitDataBuilder could not locate target type definition");
        }

        Node typeDescNode = ((TypeDefinitionNode) typeDefNode).typeDescriptor();
        if (typeDescNode.kind() != SyntaxKind.RECORD_TYPE_DESC) {
            throw new IllegalStateException("WaitDataBuilder target type is not a record");
        }

        // Get the bodyStartDelimiter location ({|)
        Token bodyStartDelimiter = ((RecordTypeDescriptorNode) typeDescNode).bodyStartDelimiter();
        LineRange delimiterLineRange = bodyStartDelimiter.lineRange();
        Range insertRange = CommonUtils.toRange(delimiterLineRange.endLine());

        for (DataEntry entry : entries) {
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

    private record DataEntry(String variableName, String dataType, String dataName) { }

    private static class DataEntrySchemaHolder {

        private static final Property DATA_ENTRY_SCHEMA = initDataEntrySchema();

        private static Property initDataEntrySchema() {
            FormBuilder<?> formBuilder = new FormBuilder<>(null, null, null, null);
            setDataEntryProperties(formBuilder);
            Map<String, Property> nodeProperties = formBuilder.build();
            return nodeProperties.get("");
        }
    }

    private boolean isValidEventsType(TypeSymbol typeSymbol) {
        typeSymbol = TypeUtils.resolveTypeReference(typeSymbol);
        TypeDescKind kind = typeSymbol.typeKind();

        // Must be a record type
        if (kind != TypeDescKind.RECORD) {
            return false;
        }

        // Check that it's a RecordTypeSymbol and all fields are future types
        Map<String, RecordFieldSymbol> fields = ((RecordTypeSymbol) typeSymbol).fieldDescriptors();
        if (fields.isEmpty()) {
            // Empty record is not a valid events record
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
