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
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.syntax.tree.AnnotationNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.QualifiedNameReferenceNode;
import io.ballerina.compiler.syntax.tree.RecordTypeDescriptorNode;
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
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.projects.Document;
import io.ballerina.tools.text.LineRange;
import io.ballerina.tools.text.TextRange;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.ANYDATA;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.EVENTS_PARAM_NAME;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.EVENTS_SUFFIX;

/**
 * Represents a workflow wait for event node.
 * This is a specialized wait operation for workflow events (check wait events.eventName).
 *
 * @since 2.0.0
 */
public class WaitEventBuilder extends WaitBuilder {

    public static final String LABEL = "Wait for Event";
    public static final String DESCRIPTION = "Wait for a workflow event to be received";

    public static final String EVENT_NAME_KEY = "eventName";
    public static final String EVENT_NAME_LABEL = "Event Name";
    public static final String EVENT_NAME_DOC = "Name of the event to wait for";

    public static final String EVENT_TYPE_KEY = "eventType";
    public static final String EVENT_TYPE_LABEL = "Event Data Type";
    public static final String EVENT_TYPE_DOC = "Type of the event data";

    public static final String WORKFLOW_MODULE = "workflow";
    public static final String PROCESS_ANNOTATION = "Process";
    private static final String TYPES_BAL = "types.bal";
    private static final String EVENT_RECEIVE_VAR_NAME = "Event Receive Variable Name";

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
                        .description("Variable name to receive the event data")
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

        // Build the wait statement: EventType eventReceiveVar = check wait events.eventName;
        sourceBuilder.token()
                .name(eventType)
                .whiteSpace()
                .name(variableName)
                .keyword(SyntaxKind.EQUAL_TOKEN)
                .keyword(SyntaxKind.CHECK_KEYWORD)
                .keyword(SyntaxKind.WAIT_KEYWORD)
                .name(EVENTS_PARAM_NAME + "." + eventName)
                .endOfStatement();
        sourceBuilder.textEdit();

        modifyEventsType(sourceBuilder, eventType, eventName);

        return sourceBuilder.build();
    }

    private void modifyEventsType(SourceBuilder sourceBuilder, String eventType, String eventName) {
        try {
            sourceBuilder.workspaceManager.loadProject(sourceBuilder.filePath);
        } catch (Exception e) {
            return;
        }

        Document document = FileSystemUtils.getDocument(sourceBuilder.workspaceManager, sourceBuilder.filePath);
        SemanticModel semanticModel = FileSystemUtils.getSemanticModel(sourceBuilder.workspaceManager,
                sourceBuilder.filePath);

        // Find the enclosing workflow process function
        LineRange lineRange = sourceBuilder.flowNode.codedata().lineRange();
        if (lineRange == null) {
            return;
        }

        SyntaxTree syntaxTree = document.syntaxTree();
        int txtPos = document.textDocument().textPositionFrom(lineRange.startLine());
        TextRange range = TextRange.from(txtPos, 0);
        NonTerminalNode node = ((ModulePartNode) syntaxTree.rootNode()).findNode(range);

        // Find the enclosing function definition
        FunctionDefinitionNode functionNode = findEnclosingWorkflowFunction(node);
        if (functionNode == null) {
            return;
        }

        String funcName = functionNode.functionName().text();
        String eventsTypeName = funcName.substring(0, 1).toUpperCase() + funcName.substring(1)
                + EVENTS_SUFFIX;

        Optional<Symbol> existingSymbol = semanticModel.moduleSymbols().stream()
                .filter(symbol -> symbol.nameEquals(eventsTypeName))
                .findFirst();

        if (existingSymbol.isPresent() && existingSymbol.get().kind() == SymbolKind.TYPE_DEFINITION) {
            TypeDefinitionSymbol typeDefSymbol = (TypeDefinitionSymbol) existingSymbol.get();
            modifyExistingEventsType(sourceBuilder, typeDefSymbol, eventType, eventName);
        } else {
            createNewEventsType(sourceBuilder, eventsTypeName, eventType, eventName, functionNode);
        }
    }

    private void createNewEventsType(SourceBuilder sourceBuilder, String eventsTypeName,
                                     String eventType, String eventName,
                                     FunctionDefinitionNode functionNode) {
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

        // Add the events parameter to the workflow process function
        addEventsParameterToFunction(sourceBuilder, functionNode, eventsTypeName);
    }

    private void addEventsParameterToFunction(SourceBuilder sourceBuilder,
                                              FunctionDefinitionNode functionNode,
                                              String eventsTypeName) {
        // Get the position right before the closing parenthesis of the function signature
        Token closeParenToken = functionNode.functionSignature().closeParenToken();
        LineRange closeParenLineRange = closeParenToken.lineRange();

        // Build the events parameter text: , EventsTypeName events
        String eventsParam = ", " + eventsTypeName + " " + EVENTS_PARAM_NAME;

        Range insertRange = CommonUtils.toRange(
                io.ballerina.tools.text.LinePosition.from(
                        closeParenLineRange.startLine().line(),
                        closeParenLineRange.startLine().offset()));

        List<TextEdit> textEdits = sourceBuilder.getTextEditsMap().computeIfAbsent(sourceBuilder.filePath,
                k -> new ArrayList<>());
        textEdits.add(new TextEdit(insertRange, eventsParam));
    }

    private FunctionDefinitionNode findEnclosingWorkflowFunction(NonTerminalNode node) {
        Node parent = node;
        while (parent != null) {
            if (parent.kind() == SyntaxKind.FUNCTION_DEFINITION) {
                FunctionDefinitionNode functionNode = (FunctionDefinitionNode) parent;
                if (functionNode.metadata().isEmpty()) {
                    return null;
                }
                // Check if function has @workflow:Process annotation
                for (AnnotationNode annotation : functionNode.metadata().get().annotations()) {
                    if (annotation.annotReference().kind().equals(SyntaxKind.QUALIFIED_NAME_REFERENCE)) {
                        QualifiedNameReferenceNode annotRef = (QualifiedNameReferenceNode) annotation.annotReference();
                        if (annotRef.modulePrefix().text().equals(WORKFLOW_MODULE) &&
                                annotRef.identifier().text().equals(PROCESS_ANNOTATION)) {
                            return functionNode;
                        }
                    }
                }
                return null;
            }
            parent = parent.parent();
        }
        return null;
    }

    private void modifyExistingEventsType(SourceBuilder sourceBuilder, TypeDefinitionSymbol typeDefSymbol,
                                          String eventType, String eventName) {
        TypeSymbol typeDescriptor = typeDefSymbol.typeDescriptor();
        RecordTypeSymbol recordType = (RecordTypeSymbol) typeDescriptor;
        Map<String, RecordFieldSymbol> existingFields = recordType.fieldDescriptors();

        // Check if the field already exists
        if (existingFields.containsKey(eventName)) {
            throw new RuntimeException("Field already exists in the events type definition with name: " + eventName);
        }

        if (typeDefSymbol.getLocation().isEmpty()) {
            return;
        }

        LineRange typeLineRange = typeDefSymbol.getLocation().get().lineRange();

        try {
            Path typesFilePath = sourceBuilder.workspaceManager.projectRoot(sourceBuilder.filePath).resolve(TYPES_BAL);
            Document typesDoc = FileSystemUtils.getDocument(sourceBuilder.workspaceManager, typesFilePath);
            SyntaxTree typesSyntaxTree = typesDoc.syntaxTree();
            ModulePartNode typesRootNode = typesSyntaxTree.rootNode();

            // Find the type definition node using the location
            int txtPos = typesDoc.textDocument().textPositionFrom(typeLineRange.startLine());
            TextRange textRange = TextRange.from(txtPos, 0);
            NonTerminalNode typeDefNode = typesRootNode.findNode(textRange);
            if (typeDefNode == null || typeDefNode.kind() != SyntaxKind.TYPE_DEFINITION) {
                return;
            }

            // Get the type descriptor from the syntax node
            Node typeDescNode = ((TypeDefinitionNode) typeDefNode).typeDescriptor();
            if (typeDescNode.kind() != SyntaxKind.RECORD_TYPE_DESC) {
                return;
            }

            // Get the bodyStartDelimiter location ({|)
            Token bodyStartDelimiter = ((RecordTypeDescriptorNode) typeDescNode).bodyStartDelimiter();
            LineRange delimiterLineRange = bodyStartDelimiter.lineRange();

            int insertLine = delimiterLineRange.endLine().line() + 1;

            // Build the new field to add: future<EventType> eventName;
            String newField = String.format("\tfuture<%s> %s;%n", eventType, eventName);

            Range insertRange = CommonUtils.toRange(
                    io.ballerina.tools.text.LinePosition.from(insertLine, 0));

            List<TextEdit> textEdits = sourceBuilder.getTextEditsMap().computeIfAbsent(typesFilePath,
                    k -> new ArrayList<>());
            textEdits.add(new TextEdit(insertRange, newField));
        } catch (Exception e) {
            throw new RuntimeException("Failed to modify the events type definition");
        }
    }
}
