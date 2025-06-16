/*
 * Copyright (c) 2021, WSO2 Inc. (http://wso2.com) All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
package org.ballerinalang.langserver.completions.providers.context;

import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.syntax.tree.InterpolationNode;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.QualifiedNameReferenceNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.TemplateExpressionNode;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.common.utils.SymbolUtil;
import org.ballerinalang.langserver.commons.BallerinaCompletionContext;
import org.ballerinalang.langserver.commons.completion.LSCompletionItem;
import org.ballerinalang.langserver.completions.SymbolCompletionItem;
import org.ballerinalang.langserver.completions.providers.AbstractCompletionProvider;
import org.ballerinalang.langserver.completions.providers.context.util.InterpolationUtil;
import org.ballerinalang.langserver.completions.providers.context.util.RegexpCompletionProvider;
import org.ballerinalang.langserver.completions.util.QNameRefCompletionUtil;
import org.ballerinalang.langserver.completions.util.SortingUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Completion provider for {@link TemplateExpressionNode}.
 *
 * @since 1.0.0
 */
@JavaSPIService("org.ballerinalang.langserver.commons.completion.spi.BallerinaCompletionProvider")
public class TemplateExpressionNodeContext extends AbstractCompletionProvider<TemplateExpressionNode> {

    public TemplateExpressionNodeContext() {
        super(TemplateExpressionNode.class);
    }

    @Override
    public List<LSCompletionItem> getCompletions(BallerinaCompletionContext context, TemplateExpressionNode node) {
        NonTerminalNode nodeAtCursor = context.getNodeAtCursor();
        List<LSCompletionItem> completionItems = new ArrayList<>();

        if (node.kind() == SyntaxKind.REGEX_TEMPLATE_EXPRESSION) {
            if (InterpolationUtil.isCursorWithInBackticks(context, node)) {
                completionItems.addAll(RegexpCompletionProvider.getRegexCompletions(nodeAtCursor, context));
            }
        }

        Optional<InterpolationNode> interpolationNode = InterpolationUtil.findInterpolationNode(nodeAtCursor, node);
        if (interpolationNode.isEmpty() || !InterpolationUtil.isWithinInterpolation(context, node)) {
            return completionItems;
        }
        // If the node at cursor is an interpolation, show expression suggestions
        if (QNameRefCompletionUtil.onQualifiedNameIdentifier(context, nodeAtCursor)) {
            QualifiedNameReferenceNode qNameRef = (QualifiedNameReferenceNode) nodeAtCursor;
            List<Symbol> moduleContent = QNameRefCompletionUtil.getModuleContent(
                    context, qNameRef, InterpolationUtil.getFunctionAndVariableFilterPredicate()
            );
            completionItems.addAll(this.getCompletionItemList(moduleContent, context));
        } else {
            completionItems.addAll(this.expressionCompletions(context));
        }
        SyntaxKind interpolationParent = interpolationNode.get().parent().kind();
        this.sort(context, node, completionItems, interpolationParent);

        return completionItems;
    }

    @Override
    public void sort(BallerinaCompletionContext context, TemplateExpressionNode node,
                     List<LSCompletionItem> completionItems, Object... interpolationParent) {
        if (interpolationParent.length == 0 || !(interpolationParent[0] instanceof SyntaxKind)) {
            throw new RuntimeException("Invalid sorting meta data provided");
        }
        /*
        Sorting order will give the highest priority to the symbols.
        Symbols which has a resolving type of boolean, int, float, decimal and string will get the highest priority.
         */
        for (LSCompletionItem lsCItem : completionItems) {
            String sortText;
            if (lsCItem.getType() != LSCompletionItem.CompletionItemType.SYMBOL
                    || ((SymbolCompletionItem) lsCItem).getSymbol().isEmpty()) {
                sortText = SortingUtil.genSortText(SortingUtil.toRank(context, lsCItem, 1));
            } else {
                Symbol symbol = ((SymbolCompletionItem) lsCItem).getSymbol().get();
                Optional<TypeSymbol> typeSymbol = SymbolUtil.getTypeDescriptor(symbol);
                if (typeSymbol.isEmpty()) {
                    // Added for safety, and should not hit this point
                    sortText = SortingUtil.genSortText(SortingUtil.toRank(context, lsCItem, 1));
                } else {
                    /*
                    Here the sort text is three-fold.
                    First we will assign the highest priority (Symbols over the others such as keywords),
                    then we sort with the resolved type,
                    Then we again append the sorting among the symbols (ex: functions over variable).
                     */
                    sortText = SortingUtil.genSortText(1)
                            + InterpolationUtil.getSortTextForResolvedType(typeSymbol.get(),
                            (SyntaxKind) interpolationParent[0])
                            + SortingUtil.genSortText(SortingUtil.toRank(context, lsCItem));
                }
            }

            lsCItem.getCompletionItem().setSortText(sortText);
        }
    }

    @Override
    public boolean onPreValidation(BallerinaCompletionContext context, TemplateExpressionNode node) {
        return node.textRange().startOffset() <= context.getCursorPositionInTree()
                && context.getCursorPositionInTree() <= node.textRange().endOffset();
    }
}
