/*
 * Copyright (c) 2025, WSO2 Inc. (http://wso2.com) All Rights Reserved.
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
package org.ballerinalang.langserver.completions.providers.context.util;

import io.ballerina.compiler.api.symbols.FunctionTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.syntax.tree.InterpolationNode;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.TemplateExpressionNode;
import io.ballerina.compiler.syntax.tree.Token;
import org.ballerinalang.langserver.common.utils.CommonUtil;
import org.ballerinalang.langserver.commons.BallerinaCompletionContext;
import org.ballerinalang.langserver.completions.util.SortingUtil;
import org.wso2.ballerinalang.compiler.util.Names;

import java.util.Optional;
import java.util.function.Predicate;

/**
 * Utility class for handling interpolation related operations.
 *
 * @since 1.0.0
 */
public class InterpolationUtil {

    /**
     * Finds an {@link InterpolationNode} which is a parent of the cursor node.
     *
     * @param cursorNode Node at cursor
     * @param node       Template or Natural expression node
     * @return Optional interpolation node
     */
    public static Optional<InterpolationNode> findInterpolationNode(NonTerminalNode cursorNode, NonTerminalNode node) {
        // We know that the template/natural expression node is definitely a parent of the node at the cursor
        while (cursorNode.kind() != node.kind()) {
            if (cursorNode.kind() == SyntaxKind.INTERPOLATION) {
                return Optional.of((InterpolationNode) cursorNode);
            }

            cursorNode = cursorNode.parent();
        }

        return Optional.empty();
    }

    /**
     * Check if cursor is within an interpolation.
     *
     * @param context BallerinaCompletionContext
     * @param node    Template or Natural expression node
     * @return true if cursor is within interpolation
     */
    public static boolean isWithinInterpolation(BallerinaCompletionContext context, NonTerminalNode node) {
        NonTerminalNode nodeAtCursor = context.getNodeAtCursor();
        Optional<InterpolationNode> interpolationNode = findInterpolationNode(nodeAtCursor, node);
        int cursor = context.getCursorPositionInTree();
        // Check if cursor is within the interpolation start and end tokens. Ex:
        // 1. `some text ${..<cursor>..} other text`
        if (interpolationNode.isEmpty()) {
            return false;
        }
        Token startToken = interpolationNode.get().interpolationStartToken();
        Token endToken = interpolationNode.get().interpolationEndToken();
        return !startToken.isMissing() && startToken.textRange().endOffset() <= cursor
                && (endToken.isMissing() || cursor <= endToken.textRange().startOffset());
    }

    /**
     * Check if cursor is within backticks.
     *
     * @param context BallerinaCompletionContext
     * @param node    Template expression node
     * @return true if cursor is within backticks
     */
    public static boolean isCursorWithInBackticks(BallerinaCompletionContext context, TemplateExpressionNode node) {
        return node.startBacktick().textRange().startOffset() < context.getCursorPositionInTree() &&
                context.getCursorPositionInTree() < node.endBacktick().textRange().endOffset();
    }

    /**
     * Get function and variable filter predicate.
     *
     * @return Predicate for filtering symbols
     */
    public static Predicate<Symbol> getFunctionAndVariableFilterPredicate() {
        return CommonUtil.getVariableFilterPredicate()
                .or(symbol -> symbol.kind() == SymbolKind.FUNCTION
                        && !symbol.getName().orElse("").equals(Names.ERROR.getValue()));
    }

    /**
     * Get resolved type for a type symbol.
     *
     * @param typeSymbol Type symbol to resolve
     * @return Resolved type symbol
     */
    public static TypeSymbol getResolvedType(TypeSymbol typeSymbol) {
        TypeSymbol resolvedType;
        if (typeSymbol.typeKind() == TypeDescKind.FUNCTION) {
            resolvedType = ((FunctionTypeSymbol) typeSymbol).returnTypeDescriptor().orElse(typeSymbol);
        } else {
            resolvedType = typeSymbol;
        }

        return CommonUtil.getRawType(resolvedType);
    }

    /**
     * Get sort text for resolved type based on interpolation parent.
     *
     * @param typeSymbol Type symbol
     * @param interpolationParent Parent syntax kind
     * @return Sort text string
     */
    public static String getSortTextForResolvedType(TypeSymbol typeSymbol, SyntaxKind interpolationParent) {
        TypeSymbol resolvedType = getResolvedType(typeSymbol);
        TypeDescKind typeKind = resolvedType.typeKind();

        // Note: The following logic can be simplified. Although, kept it as it is in order to improve the
        // readability and maintainability over the changes
        boolean booleanOrNumber = typeKind == TypeDescKind.BOOLEAN
                || typeKind == TypeDescKind.INT
                || typeKind == TypeDescKind.FLOAT
                || typeKind == TypeDescKind.DECIMAL;
        switch (interpolationParent) {
            case STRING_TEMPLATE_EXPRESSION:
                if (booleanOrNumber || typeKind == TypeDescKind.STRING) {
                    return SortingUtil.genSortText(1);
                }
                break;
            case XML_ATTRIBUTE:
                if (booleanOrNumber) {
                    return SortingUtil.genSortText(1);
                }
                break;
            case XML_ELEMENT:
                if (typeKind == TypeDescKind.XML || typeKind == TypeDescKind.XML_COMMENT
                        || typeKind == TypeDescKind.XML_ELEMENT || typeKind == TypeDescKind.XML_TEXT
                        || typeKind == TypeDescKind.XML_PROCESSING_INSTRUCTION) {
                    return SortingUtil.genSortText(1);
                }
                if (booleanOrNumber) {
                    return SortingUtil.genSortText(2);
                }
                break;
            default:
                break;
        }
        return SortingUtil.genSortText(3);
    }

    private InterpolationUtil() {
        // Private constructor to prevent instantiation
    }
}
