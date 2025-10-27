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

package io.ballerina.flowmodelgenerator.core.expressioneditor.semantictokens;

import io.ballerina.compiler.syntax.tree.FieldAccessExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionArgumentNode;
import io.ballerina.compiler.syntax.tree.FunctionCallExpressionNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NodeVisitor;
import io.ballerina.compiler.syntax.tree.OptionalFieldAccessExpressionNode;
import io.ballerina.compiler.syntax.tree.SimpleNameReferenceNode;
import io.ballerina.compiler.syntax.tree.Token;
import io.ballerina.tools.text.LinePosition;
import org.eclipse.lsp4j.SemanticTokens;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Visitor class for generating semantic tokens from expression nodes in the syntax tree.
 *
 * @since 1.3.0
 */
public class SemanticTokenVisitor extends NodeVisitor {

    private final List<SemanticToken> semanticTokens;
    private final Set<Long> seenPositions;
    private final Set<String> validSymbolNames;

    public SemanticTokenVisitor(Set<String> validSymbolNames) {
        this.semanticTokens = new ArrayList<>();
        this.seenPositions = new HashSet<>();
        this.validSymbolNames = validSymbolNames;
    }

    /**
     * Collects semantic tokens while traversing the syntax tree and returns the processed list of semantic tokens.
     *
     * @param node Root expression node
     * @return {@link SemanticTokens}
     */
    public SemanticTokens getSemanticTokens(Node node) {
        node.accept(this);

        // Sort tokens by position (line, then column)
        semanticTokens.sort(SemanticToken.semanticTokenComparator);

        // Pre-allocate with exact capacity needed (5 integers per token)
        List<Integer> data = new ArrayList<>(semanticTokens.size() * 5);
        SemanticToken previousToken = null;
        for (SemanticToken semanticToken : semanticTokens) {
            previousToken = semanticToken.processSemanticToken(data, previousToken);
        }
        return new SemanticTokens(data);
    }

    @Override
    public void visit(SimpleNameReferenceNode simpleNameReferenceNode) {
        // Get the symbol name from the node
        String symbolName = simpleNameReferenceNode.name().text();

        // Check if the symbol name exists in the valid symbol names set
        if (!validSymbolNames.contains(symbolName)) {
            return;
        }

        addSemanticToken(simpleNameReferenceNode, ExpressionTokenTypes.VARIABLE.getId());
    }

    @Override
    public void visit(FieldAccessExpressionNode fieldAccessExpressionNode) {
        // Mark the field name as PROPERTY
        addSemanticToken(fieldAccessExpressionNode.fieldName(), ExpressionTokenTypes.PROPERTY.getId());
        // Visit the expression part (left side)
        fieldAccessExpressionNode.expression().accept(this);
    }

    @Override
    public void visit(OptionalFieldAccessExpressionNode optionalFieldAccessExpressionNode) {
        // Mark the field name as PROPERTY (same as regular field access)
        addSemanticToken(optionalFieldAccessExpressionNode.fieldName(), ExpressionTokenTypes.PROPERTY.getId());
        // Visit the expression part (left side)
        optionalFieldAccessExpressionNode.expression().accept(this);
    }

    @Override
    public void visit(FunctionCallExpressionNode functionCallExpressionNode) {
        // Process arguments - they should all be marked as PARAMETER
        functionCallExpressionNode.arguments().forEach(arg -> {
            addSemanticToken(arg, ExpressionTokenTypes.PARAMETER.getId());
        });
    }

    /**
     * Adds a semantic token instance into the semanticTokens set for the given node.
     *
     * @param node Current node
     * @param type Semantic token type's index
     */
    private void addSemanticToken(Node node, int type) {
        LinePosition startLine = node.lineRange().startLine();
        int line = startLine.line();
        int column = startLine.offset();

        // Efficient O(1) duplicate check using position hash (line << 32 | column)
        long positionKey = ((long) line << 32) | column;
        if (!seenPositions.add(positionKey)) {
            return; // Already processed this position
        }

        // Calculate token length using pattern matching
        int length;
        if (node instanceof Token token) {
            length = token.text().length();
        } else if (node instanceof FunctionArgumentNode) { // Use the entire length for function arguments
            length = node.textRange().length();
            for (Token leadingInvalidToken : node.leadingInvalidTokens()) {
                length += leadingInvalidToken.text().length();
            }
            for (Token trailingInvalidToken : node.trailingInvalidTokens()) {
                length += trailingInvalidToken.text().length();
            }
        } else {
            int textRangeLength = node.textRange().length();
            length = textRangeLength > 0 ? textRangeLength : node.toSourceCode().length();
        }

        // Create and add new semantic token
        SemanticToken semanticToken = new SemanticToken(line, column);
        semanticToken.setProperties(length, type, 0);
        semanticTokens.add(semanticToken);
    }

    /**
     * Represents semantic token data for a node.
     */
    static class SemanticToken implements Comparable<SemanticToken> {

        final int line;
        final int column;
        private int length;
        private int type;
        private int modifiers;

        private SemanticToken(int line, int column) {
            this.line = line;
            this.column = column;
        }

        int getLine() {
            return line;
        }

        int getColumn() {
            return column;
        }

        private int getLength() {
            return length;
        }

        private int getType() {
            return type;
        }

        private int getModifiers() {
            return modifiers;
        }

        public void setProperties(int length, int type, int modifiers) {
            this.length = length;
            this.type = type;
            this.modifiers = modifiers;
        }

        public SemanticToken processSemanticToken(List<Integer> data, SemanticToken previousToken) {
            int line = this.getLine();
            int column = this.getColumn();
            int prevTokenLine = line;
            int prevTokenColumn = column;

            if (previousToken != null) {
                if (line == previousToken.getLine()) {
                    column -= previousToken.getColumn();
                }
                line -= previousToken.getLine();
            }
            data.add(line);
            data.add(column);
            data.add(this.getLength());
            data.add(this.getType());
            data.add(this.getModifiers());
            return new SemanticToken(prevTokenLine, prevTokenColumn);
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) {
                return true;
            }
            if (obj == null || getClass() != obj.getClass()) {
                return false;
            }
            SemanticToken semanticToken = (SemanticToken) obj;
            return line == semanticToken.line && column == semanticToken.column;
        }

        @Override
        public int hashCode() {
            return Objects.hash(line, column);
        }

        @Override
        public int compareTo(SemanticToken semanticToken) {
            if (this.line == semanticToken.line) {
                return this.column - semanticToken.column;
            }
            return this.line - semanticToken.line;
        }

        public static Comparator<SemanticToken> semanticTokenComparator = SemanticToken::compareTo;
    }
}
