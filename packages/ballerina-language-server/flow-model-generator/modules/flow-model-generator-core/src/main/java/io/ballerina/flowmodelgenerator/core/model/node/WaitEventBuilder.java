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
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.syntax.tree.DefaultableParameterNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
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
import io.ballerina.projects.Document;
import io.ballerina.tools.text.LineRange;
import io.ballerina.tools.text.TextRange;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.ANYDATA;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.DEFAULT_EVENTS_PARAM_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.EVENTS_SUFFIX;

/**
 * Represents a workflow wait for event node.
 * This is a specialized wait operation for workflow events (check wait events.eventName).
 *
 * @since 2.0.0
 */
public class WaitEventBuilder extends WaitBuilder {
    private static final String LABEL = "Wait for Event";
    private static final String DESCRIPTION = "Wait for a workflow event to be received";
    private static final String EVENT_NAME_KEY = "eventName";
    private static final String EVENT_NAME_LABEL = "Event Name";
    private static final String EVENT_NAME_DOC = "Name of the event to wait for";
    private static final String EVENT_TYPE_KEY = "eventType";
    private static final String EVENT_TYPE_LABEL = "Event Data Type";
    private static final String EVENT_TYPE_DOC = "Type of the event data to be received on successful wait";
    private static final String EVENT_RECEIVE_VAR_NAME = "Event Receive Variable Name";
    private static final String EVENT_RECEIVE_VAR_DOC = "Variable name to receive the event data";
    private static final String TYPES_BAL = "types.bal";

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata().node(NodeKind.WAIT_EVENT);
    }

    @Override
    public void setConcreteTemplateData(TemplateContext context) {
        // Event receive variable name
        properties()
                .custom()
                    .metadata()
                        .label(EVENT_RECEIVE_VAR_NAME)
                        .description(EVENT_RECEIVE_VAR_DOC)
                        .stepOut()
                    .type()
                        .fieldType(Property.ValueType.IDENTIFIER)
                        .scope(Property.LOCAL_SCOPE)
                        .selected(true)
                        .stepOut()
                    .value("")
                    .editable(true)
                    .stepOut()
                .addProperty(Property.VARIABLE_KEY);

        // Event type
        properties()
                .custom()
                    .metadata()
                        .label(EVENT_TYPE_LABEL)
                        .description(EVENT_TYPE_DOC)
                        .stepOut()
                    .type()
                        .fieldType(Property.ValueType.TYPE)
                        .ballerinaType(ANYDATA)
                        .selected(true)
                        .stepOut()
                    .value("")
                    .editable(true)
                    .stepOut()
                .addProperty(EVENT_TYPE_KEY);

        // Event name
        properties()
                .custom()
                    .metadata()
                        .label(EVENT_NAME_LABEL)
                        .description(EVENT_NAME_DOC)
                        .stepOut()
                    .type()
                        .fieldType(Property.ValueType.IDENTIFIER)
                        .selected(true)
                        .stepOut()
                    .value("")
                    .editable(true)
                    .stepOut()
                .addProperty(EVENT_NAME_KEY);
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        Optional<Property> variableProperty = sourceBuilder.getProperty(Property.VARIABLE_KEY);
        Optional<Property> eventTypeProperty = sourceBuilder.getProperty(EVENT_TYPE_KEY);
        Optional<Property> eventNameProperty = sourceBuilder.getProperty(EVENT_NAME_KEY);

        if (variableProperty.isEmpty() || eventTypeProperty.isEmpty() || eventNameProperty.isEmpty()) {
            throw new IllegalStateException("Wait event node is missing required properties");
        }

        String variableName = variableProperty.get().value().toString();
        String eventType = eventTypeProperty.get().value().toString();
        String eventName = eventNameProperty.get().value().toString();
        if (variableName.isBlank() || eventType.isBlank() || eventName.isBlank()) {
            throw new IllegalStateException("WaitEventBuilder requires non-blank variableName/eventType/eventName");
        }

        addNewEventToWorkflow(sourceBuilder, eventType, eventName);

        // Build the wait statement: EventType eventReceiveVar = check wait events.eventName;
        sourceBuilder.token()
                .name(eventType)
                .whiteSpace()
                .name(variableName)
                .keyword(SyntaxKind.EQUAL_TOKEN)
                .keyword(SyntaxKind.CHECK_KEYWORD)
                .keyword(SyntaxKind.WAIT_KEYWORD)
                .name(DEFAULT_EVENTS_PARAM_NAME + "." + eventName)
                .endOfStatement();
        sourceBuilder.textEdit();

        return sourceBuilder.build();
    }

    private void addNewEventToWorkflow(SourceBuilder sourceBuilder, String eventType, String eventName) {
        try {
            sourceBuilder.workspaceManager.loadProject(sourceBuilder.filePath);
        } catch (WorkspaceDocumentException | EventSyncException e) {
            throw new IllegalStateException("WaitEventBuilder failed to load project", e);
        }

        SemanticModel semanticModel = FileSystemUtils.getSemanticModel(sourceBuilder.workspaceManager,
                sourceBuilder.filePath);

        FunctionDefinitionNode functionNode = WorkflowUtil.findEnclosingWorkflowFunction(sourceBuilder);
        if (functionNode == null) {
            throw new IllegalStateException("WaitEventBuilder must be used inside a workflow process function");
        }

        Optional<TypeSymbol> eventsTypeSymbol = getEventsParameterTypeSymbol(functionNode, semanticModel);
        if (eventsTypeSymbol.isPresent()) {
            modifyExistingEventsType(sourceBuilder, eventsTypeSymbol.get(), eventType, eventName);
        } else {
            // No events parameter - create new type and add parameter
            String funcName = functionNode.functionName().text();
            String baseTypeName = funcName.substring(0, 1).toUpperCase(Locale.ROOT) + funcName.substring(1)
                    + EVENTS_SUFFIX;
            String eventsTypeName = generateUniqueEventsTypeName(baseTypeName, semanticModel);
            createNewEventsType(sourceBuilder, eventsTypeName, eventType, eventName);
            addEventsParameterToFunction(sourceBuilder, functionNode, eventsTypeName);
        }
    }

    /**
     * Gets the events parameter from the function if it exists.
     * The events parameter is expected to be the third parameter in a workflow process function.
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
                                     String eventType, String eventName) {
        // Create a new events type with the field
        String eventFieldType = SyntaxKind.FUTURE_KEYWORD.stringValue() + SyntaxKind.LT_TOKEN.stringValue()
                + eventType + SyntaxKind.GT_TOKEN.stringValue();
        List<Member> members = new ArrayList<>();
        members.add(new Member.MemberBuilder()
                .kind(Member.MemberKind.FIELD)
                .type(eventFieldType)
                .name(eventName)
                .optional(false)
                .readonly(false)
                .build());

        TypeData eventsTypeData = new TypeData(
                eventsTypeName,
                true,
                new Metadata(eventsTypeName, "Events record for workflow process function",
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
        LineRange closeParenLineRange = functionNode.functionSignature().closeParenToken().lineRange();
        Range insertRange = CommonUtils.toRange(closeParenLineRange.startLine());
        // Build the events parameter text: , EventsTypeName events
        sourceBuilder.token()
                .keyword(SyntaxKind.COMMA_TOKEN)
                .name(eventsTypeName)
                .whiteSpace()
                .name(DEFAULT_EVENTS_PARAM_NAME)
                .skipFormatting().stepOut().textEdit(null, sourceBuilder.filePath, insertRange);
    }

    private void modifyExistingEventsType(SourceBuilder sourceBuilder, TypeSymbol eventsTypeSymbol,
                                          String eventType, String eventName) {
        RecordTypeSymbol recordType = (RecordTypeSymbol) eventsTypeSymbol;
        Map<String, RecordFieldSymbol> existingFields = recordType.fieldDescriptors();

        // Check if the field already exists
        if (existingFields.containsKey(eventName)) {
            throw new RuntimeException("Field already exists in the events type definition with name: " + eventName);
        }

        if (recordType.getLocation().isEmpty()) {
            return;
        }

        LineRange typeLineRange = recordType.getLocation().get().lineRange();

        Path typesFilePath = sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath)
                .resolve(typeLineRange.fileName());
        Document typesDoc = FileSystemUtils.getDocument(sourceBuilder.workspaceManager, typesFilePath);
        if (typesDoc == null) {
            return;
        }
        SyntaxTree typesSyntaxTree = typesDoc.syntaxTree();
        ModulePartNode typesRootNode = typesSyntaxTree.rootNode();

        // Find the type definition node using the location
        int txtPos = typesDoc.textDocument().textPositionFrom(typeLineRange.startLine());
        TextRange textRange = TextRange.from(txtPos, 0);
        NonTerminalNode typeDefNode = typesRootNode.findNode(textRange);
        if (typeDefNode == null || typeDefNode.kind() != SyntaxKind.TYPE_DEFINITION) {
            return;
        }

        Node typeDescNode = ((TypeDefinitionNode) typeDefNode).typeDescriptor();
        if (typeDescNode.kind() != SyntaxKind.RECORD_TYPE_DESC) {
            return;
        }

        // Get the bodyStartDelimiter location ({|)
        Token bodyStartDelimiter = ((RecordTypeDescriptorNode) typeDescNode).bodyStartDelimiter();
        LineRange delimiterLineRange = bodyStartDelimiter.lineRange();
        Range insertRange = CommonUtils.toRange(delimiterLineRange.endLine());

        sourceBuilder.token()
                .name(SyntaxKind.FUTURE_KEYWORD.stringValue())
                .name(SyntaxKind.LT_TOKEN.stringValue())
                .name(eventType)
                .name(SyntaxKind.GT_TOKEN.stringValue())
                .whiteSpace()
                .name(eventName)
                .endOfStatement()
                .skipFormatting().stepOut().textEdit(null, typesFilePath, insertRange);
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
