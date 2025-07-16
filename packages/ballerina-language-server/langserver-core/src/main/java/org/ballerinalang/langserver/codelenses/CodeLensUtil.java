/*
 * Copyright (c) 2019, WSO2 Inc. (http://wso2.com) All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.ballerinalang.langserver.codelenses;

import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.ModuleMemberDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.QualifiedNameReferenceNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import org.ballerinalang.langserver.common.utils.PositionUtil;
import org.ballerinalang.langserver.commons.DocumentServiceContext;
import org.ballerinalang.langserver.commons.codelenses.spi.LSCodeLensesProvider;
import org.eclipse.lsp4j.CodeLens;
import org.eclipse.lsp4j.Command;
import org.eclipse.lsp4j.Range;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Provides code lenses related common functionalities.
 *
 * @since 1.0.0
 */
public final class CodeLensUtil {

    public static final String RUN_CODELENS = "Run";
    public static final String DEBUG_CODELENS = "Debug";
    public static final String VISUALIZE_CODELENS = "Visualize";
    public static final String TRY_IT_CODELENS = "Try it";

    private CodeLensUtil() {
    }

    /**
     * Compile and get code lenses.
     *
     * @param codeLensContext LSContext
     * @return a list of code lenses
     */
    public static List<CodeLens> getCodeLenses(DocumentServiceContext codeLensContext) {
        List<CodeLens> lenses = new ArrayList<>();
        Optional<SyntaxTree> syntaxTree = codeLensContext.currentSyntaxTree();
        if (syntaxTree.isEmpty()) {
            return lenses;
        }

        // Check if the root node is a module part node
        if (!syntaxTree.get().containsModulePart()) {
            return lenses;
        }

        // Get all the code lenses providers
        List<LSCodeLensesProvider> providers =
                LSCodeLensesProviderHolder.getInstance(codeLensContext.languageServercontext()).getProviders();

        // Get the module member nodes
        // Note: The implementation is based on the assumption that all code lenses are attached to module-level
        // types. If we need to support other scopes, A syntax tree visitor is needed instead of simply traversing
        // the module members.
        ModulePartNode modulePartNode = syntaxTree.get().rootNode();
        NodeList<ModuleMemberDeclarationNode> members = modulePartNode.members();

        // Traverse through the module members and collect code lenses
        for (ModuleMemberDeclarationNode member : members) {
            codeLensContext.checkCancelled();

            if (member instanceof ServiceDeclarationNode serviceDeclarationNode) {
                for (Node serviceMember : serviceDeclarationNode.members()) {
                    traverseCodeLensProviders(codeLensContext, serviceMember, providers, lenses);
                }
            }

            // Validate the node with all the providers
            traverseCodeLensProviders(codeLensContext, member, providers, lenses);
        }

        return lenses;
    }

    /**
     * Returns a code lens.
     *
     * @param command a command to be executed.
     * @param node    a syntax tree node.
     * @return a code lens.
     */
    public static CodeLens getCodeLens(Command command, Node node) {
        Range range = PositionUtil.toRange(node.lineRange());
        return new CodeLens(range, command, null);
    }

    /**
     * Returns true if the provided function is a test function, false otherwise.
     *
     * @param functionDefinitionNode a function definition node.
     * @return true if the provided function is a test function, false otherwise.
     */
    public static boolean isTestFunction(FunctionDefinitionNode functionDefinitionNode) {
        return functionDefinitionNode.metadata().map(metadataNode ->
                metadataNode.annotations().stream().anyMatch(annotationNode -> {
                    Node annotReference = annotationNode.annotReference();
                    if (annotReference.kind() == SyntaxKind.QUALIFIED_NAME_REFERENCE) {
                        QualifiedNameReferenceNode qualifiedNameRef = (QualifiedNameReferenceNode) annotReference;
                        return "test".equals(qualifiedNameRef.modulePrefix().text()) &&
                                "Config".equals(qualifiedNameRef.identifier().text());
                    }
                    return false;
                })
        ).orElse(false);
    }

    /**
     * Checks if the given node represents a valid executable function.
     * A node is considered valid if it is a service declaration or a function named "main".
     *
     * @param node the syntax node to check
     * @return true if the node is a service declaration or a "main" function, false otherwise
     */
    public static boolean isValidExecutableFunction(Node node) {
        return node.kind() == SyntaxKind.SERVICE_DECLARATION ||
                (node instanceof FunctionDefinitionNode functionDefinitionNode &&
                        "main".equals(functionDefinitionNode.functionName().text()));
    }

    /**
     * Iterates through the provided list of {@link LSCodeLensesProvider} instances and checks if each provider is
     * applicable to the given syntax tree node. If applicable, retrieves the corresponding {@link CodeLens} and adds it
     * to the provided list of code lenses.
     *
     * @param codeLensContext the context containing document and language server information
     * @param member          the syntax tree node for which code lenses are being evaluated
     * @param providers       the list of code lens providers to be checked
     * @param lenses          the list to which applicable code lenses will be added
     */
    private static void traverseCodeLensProviders(DocumentServiceContext codeLensContext, Node member,
                                                  List<LSCodeLensesProvider> providers, List<CodeLens> lenses) {
        for (LSCodeLensesProvider provider : providers) {
            CodeLens lens = provider.getLens(codeLensContext, member);
            if (lens != null) {
                lenses.add(lens);
            }
        }
    }
}
