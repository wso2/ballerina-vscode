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

package io.ballerina.flowmodelgenerator.core.expressioneditor.services;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.flowmodelgenerator.core.expressioneditor.ExpressionEditorContext;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.tools.text.LineRange;
import org.ballerinalang.langserver.common.utils.CommonUtil;
import org.ballerinalang.langserver.common.utils.PositionUtil;
import org.eclipse.lsp4j.CompletionContext;
import org.eclipse.lsp4j.CompletionItem;
import org.eclipse.lsp4j.CompletionItemKind;
import org.eclipse.lsp4j.CompletionList;
import org.eclipse.lsp4j.CompletionParams;
import org.eclipse.lsp4j.Position;
import org.eclipse.lsp4j.TextDocumentIdentifier;
import org.eclipse.lsp4j.jsonrpc.messages.Either;
import org.eclipse.lsp4j.services.TextDocumentService;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Represents a request for code completion in the expression editor. This class extends
 * DebouncedExpressionEditorRequest to handle completion requests with debouncing functionality.
 *
 * @since 1.0.0
 */
public class CompletionRequest extends DebouncedExpressionEditorRequest<Either<List<CompletionItem>, CompletionList>> {

    private final CompletionContext completionContext;
    private final TextDocumentService textDocumentService;
    private static final String RESERVED_VARIABLE_NAME = "__reserved__";
    private static final Gson GSON = new Gson();

    public CompletionRequest(ExpressionEditorContext context, CompletionContext completionContext,
                             TextDocumentService textDocumentService) {
        super(context);
        this.completionContext = completionContext;
        this.textDocumentService = textDocumentService;
    }

    @Override
    public Either<List<CompletionItem>, CompletionList> getResponse(ExpressionEditorContext context) {
        String valueType = context.getProperty().valueType();
        if (Property.ValueType.DATA_MAPPING_EXPRESSION.name().equals(valueType)) {
            JsonElement lineRangeJson = context.info().codedata().get("lineRange");
            LineRange lineRange = GSON.fromJson(lineRangeJson, LineRange.class);
            if (lineRange == null) {
                return Either.forLeft(new ArrayList<>());
            }
            NonTerminalNode node = CommonUtil.findNode(PositionUtil.toRange(lineRange),
                    context.documentContext().document().syntaxTree());
            if (!(node instanceof FunctionDefinitionNode functionDefinitionNode)) {
                return Either.forLeft(new ArrayList<>());
            }
            context.generateFunctionDefinition(functionDefinitionNode.functionSignature().toString());
        } else {
            context.generateStatement();
        }

        Position position = context.getCursorPosition();
        TextDocumentIdentifier identifier = new TextDocumentIdentifier(context.fileUri());
        CompletionParams params = new CompletionParams(identifier, position, completionContext);

        // Get completions from language server
        CompletableFuture<Either<List<CompletionItem>, CompletionList>> completableFuture =
                textDocumentService.completion(params);
        Either<List<CompletionItem>, CompletionList> completions = completableFuture.join();

        // Filter the completions if it is a lvexpr
        // TODO: Extend the implementation to a different class
        if (Property.ValueType.LV_EXPRESSION.name().equals(valueType)) {
            List<CompletionItem> completionsList;
            if (completions.getLeft() != null) {
                completionsList = completions.getLeft();
            } else if (completions.getRight() != null && completions.getRight().getItems() != null) {
                completionsList = completions.getRight().getItems();
            } else {
                completionsList = new ArrayList<>();
            }
            completionsList.removeIf(item -> !item.getKind().equals(CompletionItemKind.Variable) &&
                    !item.getKind().equals(CompletionItemKind.Field));
        }

        // TODO: Remove this once https://github.com/ballerina-platform/ballerina-lang/issues/43706 is fixed
        if (completions.getLeft() != null) {
            completions.getLeft().removeIf(item -> RESERVED_VARIABLE_NAME.equals(item.getLabel()));
        } else if (completions.getRight() != null && completions.getRight().getItems() != null) {
            completions.getRight().getItems().removeIf(item -> RESERVED_VARIABLE_NAME.equals(item.getLabel()));
        }

        return completions;
    }

    @Override
    public String getKey() {
        return "completions";
    }

    @Override
    public long getDelay() {
        return 150;
    }
}
