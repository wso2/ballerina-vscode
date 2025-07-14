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

package org.ballerinalang.langserver.codelenses.providers;

import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.QualifiedNameReferenceNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.common.utils.PositionUtil;
import org.ballerinalang.langserver.commons.DocumentServiceContext;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.eclipse.lsp4j.CodeLens;
import org.eclipse.lsp4j.Command;
import org.eclipse.lsp4j.Range;

import java.util.Collections;
import java.util.List;

/**
 * Code lens provider for test functions debug.
 *
 * @since 1.0.1
 */
@JavaSPIService("org.ballerinalang.langserver.commons.codelenses.spi.LSCodeLensesProvider")
public class TestDebugCodeLensProvider extends AbstractCodeLensesProvider {

    public TestDebugCodeLensProvider() {
        super("test.debug.CodeLenses");
    }

    @Override
    public boolean isEnabled(LanguageServerContext serverContext) {
        return true;
    }

    @Override
    public boolean validate(Node node) {
        if (!(node instanceof FunctionDefinitionNode functionDefinitionNode)) {
            return false;
        }
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

    @Override
    public CodeLens getLens(DocumentServiceContext context, Node node) {
        List<Object> args = Collections.singletonList(((FunctionDefinitionNode) node).functionName().text());
        Command command = new Command("Debug", "ballerina.test.debug", args);
        Range range = PositionUtil.toRange(node.lineRange());
        return new CodeLens(range, command, null);
    }
}
