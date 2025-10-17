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

package io.ballerina.flowmodelgenerator.core.expressioneditor;

import io.ballerina.compiler.syntax.tree.FieldAccessExpressionNode;
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
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;

/**
 * Visitor class for expression semantic tokens. This is a stateless visitor that analyzes expressions
 *
 * @since 1.3.0
 */
public class ExpressionSemanticTokensVisitor extends NodeVisitor {

    private final Set<SemanticToken> semanticTokens;
    private boolean inFunctionCallArgument = false;

    public ExpressionSemanticTokensVisitor() {
        this.semanticTokens = new TreeSet<>(SemanticToken.semanticTokenComparator);
    }

    /**
     * Collects semantic tokens while traversing the syntax tree and returns the processed list of semantic tokens.
     *
     * @param node Root expression node
     * @return {@link SemanticTokens}
     */
    public SemanticTokens getSemanticTokens(Node node) {
        List<Integer> data = new ArrayList<>();
        node.accept(this);
        SemanticToken previousToken = null;
        for (SemanticToken semanticToken : this.semanticTokens) {
            previousToken = semanticToken.processSemanticToken(data, previousToken);
        }
        return new SemanticTokens(data);
    }

    @Override
    public void visit(SimpleNameReferenceNode simpleNameReferenceNode) {
        // Mark as VARIABLE only if not inside function call arguments
        if (!inFunctionCallArgument) {
            addSemanticToken(simpleNameReferenceNode, ExpressionTokenTypes.VARIABLE.getId());
        }
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
        SemanticToken semanticToken = new SemanticToken(startLine.line(), startLine.offset());
        if (!semanticTokens.contains(semanticToken)) {
            // For Token nodes, use text().length(); for other nodes, use textRange().length()
            int length;
            if (node instanceof Token token) {
                String text = token.text().trim();
                length = text.isEmpty() ? token.text().length() : text.length();
            } else {
                int textRangeLength = node.textRange().length();
                // If textRange().length() returns 0, fall back to toSourceCode().length()
                length = textRangeLength > 0 ? textRangeLength : node.toSourceCode().length();
            }
            semanticToken.setProperties(length, type, 0); // No modifiers for expressions
            semanticTokens.add(semanticToken);
        }
    }

    /**
     * Represents semantic token data for a node.
     */
    static class SemanticToken implements Comparable<SemanticToken> {

        private final int line;
        private final int column;
        private int length;
        private int type;
        private int modifiers;

        private SemanticToken(int line, int column) {
            this.line = line;
            this.column = column;
        }

        private int getLine() {
            return line;
        }

        private int getColumn() {
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
