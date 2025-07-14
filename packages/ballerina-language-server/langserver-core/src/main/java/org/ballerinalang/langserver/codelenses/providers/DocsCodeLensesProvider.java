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
package org.ballerinalang.langserver.codelenses.providers;

import io.ballerina.compiler.syntax.tree.ClassDefinitionNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.TypeDefinitionNode;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.command.executors.AddDocumentationExecutor;
import org.ballerinalang.langserver.common.constants.CommandConstants;
import org.ballerinalang.langserver.common.utils.PositionUtil;
import org.ballerinalang.langserver.commons.DocumentServiceContext;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.ballerinalang.langserver.commons.command.CommandArgument;
import org.ballerinalang.langserver.config.LSClientConfigHolder;
import org.eclipse.lsp4j.CodeLens;
import org.eclipse.lsp4j.Command;
import org.eclipse.lsp4j.Range;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Code lenses provider for adding all documentation for top level items.
 *
 * @since 1.0.0
 */
@JavaSPIService("org.ballerinalang.langserver.commons.codelenses.spi.LSCodeLensesProvider")
public class DocsCodeLensesProvider extends AbstractCodeLensesProvider {

    private static final String AUTOMATION_FUNCTION = "main";

    public DocsCodeLensesProvider() {
        super("docs.CodeLenses");
    }

    @Override
    public boolean isEnabled(LanguageServerContext serverContext) {
        return LSClientConfigHolder.getInstance(serverContext).getConfig().getCodeLens().getDocs().isEnabled();
    }

    @Override
    public boolean validate(Node node) {
        if (node == null) {
            return false;
        }
        return switch (node.kind()) {
            case FUNCTION_DEFINITION -> {
                FunctionDefinitionNode funcDef = (FunctionDefinitionNode) node;
                String nodeName = funcDef.functionName().text();
                boolean isPublic = funcDef.qualifierList().stream()
                        .anyMatch(qualifier -> qualifier.kind() == SyntaxKind.PUBLIC_KEYWORD);
                yield isPublic && !AUTOMATION_FUNCTION.equals(nodeName);
            }
            case TYPE_DEFINITION -> {
                TypeDefinitionNode typeDef = (TypeDefinitionNode) node;
                yield typeDef.visibilityQualifier()
                        .map(s -> s.kind() == SyntaxKind.PUBLIC_KEYWORD)
                        .orElse(false);
            }
            case CLASS_DEFINITION -> {
                ClassDefinitionNode classDef = (ClassDefinitionNode) node;
                yield classDef.visibilityQualifier()
                        .map(s -> s.kind() == SyntaxKind.PUBLIC_KEYWORD)
                        .orElse(false);
            }
            default -> false;
        };
    }

    @Override
    public CodeLens getLens(DocumentServiceContext context, Node node) {
        Range nodeRange = PositionUtil.toRange(node.lineRange());
        String documentUri = context.fileUri();
        CommandArgument docUriArg = CommandArgument.from(CommandConstants.ARG_KEY_DOC_URI, documentUri);
        CommandArgument lineStart = CommandArgument.from(CommandConstants.ARG_KEY_NODE_RANGE,
                nodeRange);
        List<Object> args = new ArrayList<>(Arrays.asList(docUriArg, lineStart));
        Command command = new Command(CommandConstants.ADD_DOCUMENTATION_TITLE,
                AddDocumentationExecutor.COMMAND, args);
        return new CodeLens(nodeRange, command, null);
    }
}
