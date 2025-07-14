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

import io.ballerina.compiler.syntax.tree.ModuleMemberDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import org.ballerinalang.langserver.commons.DocumentServiceContext;
import org.ballerinalang.langserver.commons.codelenses.spi.LSCodeLensesProvider;
import org.eclipse.lsp4j.CodeLens;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Provides code lenses related common functionalities.
 *
 * @since 1.0.0
 */
public final class CodeLensUtil {

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

            // Validate the node with all the providers
            for (LSCodeLensesProvider provider : providers) {
                if (provider.validate(member)) {
                    lenses.addAll(provider.getLenses(codeLensContext));
                }
            }
        }

        return lenses;
    }
}
