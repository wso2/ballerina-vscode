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

import io.ballerina.flowmodelgenerator.core.expressioneditor.DocumentContext;
import io.ballerina.flowmodelgenerator.core.expressioneditor.ExpressionEditorContext;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.tools.text.TextDocument;
import io.ballerina.tools.text.TextEdit;
import io.ballerina.tools.text.TextRange;
import org.eclipse.lsp4j.CompletionContext;
import org.eclipse.lsp4j.CompletionItem;
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
public class DataMapperCompletionRequest extends
        DebouncedExpressionEditorRequest<Either<List<CompletionItem>, CompletionList>> {

    private final CompletionContext completionContext;
    private final TextDocumentService textDocumentService;

    public DataMapperCompletionRequest(ExpressionEditorContext context, CompletionContext completionContext,
                                       TextDocumentService textDocumentService) {
        super(context);
        this.completionContext = completionContext;
        this.textDocumentService = textDocumentService;
    }

    @Override
    public Either<List<CompletionItem>, CompletionList> getResponse(ExpressionEditorContext context) {
        LinePosition cursorStart = context.startLine();
        DocumentContext documentContext = context.documentContext();
        TextDocument textDocument = documentContext.document().textDocument();
        int textPosition = textDocument.textPositionFrom(cursorStart);

        List<TextEdit> textEdits = new ArrayList<>();
        ExpressionEditorContext.Info info = context.info();
        String expression = info.expression();
        textEdits.add(TextEdit.from(TextRange.from(textPosition, 0), expression));
        context.applyTextEdits(textEdits);

        TextDocumentIdentifier identifier = new TextDocumentIdentifier(context.fileUri());
        CompletionParams params = new CompletionParams(identifier,
                new Position(cursorStart.line() + info.lineOffset(), cursorStart.offset() + info.offset()),
                completionContext);

        // Get completions from language server
        CompletableFuture<Either<List<CompletionItem>, CompletionList>> completableFuture =
                textDocumentService.completion(params);

        return completableFuture.join();
    }

    @Override
    public String getKey() {
        return "dataMapperCompletions";
    }

    @Override
    public long getDelay() {
        return 150;
    }
}
