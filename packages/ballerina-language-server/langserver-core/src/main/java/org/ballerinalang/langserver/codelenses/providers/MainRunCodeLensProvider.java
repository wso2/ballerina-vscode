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
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.codelenses.CodeLensUtil;
import org.ballerinalang.langserver.commons.DocumentServiceContext;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.eclipse.lsp4j.CodeLens;
import org.eclipse.lsp4j.Command;

import java.util.Collections;
import java.util.List;

/**
 * Code lens provider for main function.
 *
 * @since 1.0.1
 */
@JavaSPIService("org.ballerinalang.langserver.commons.codelenses.spi.LSCodeLensesProvider")
public class MainRunCodeLensProvider extends AbstractCodeLensesProvider {

    public MainRunCodeLensProvider() {
        super("main.run.CodeLenses");
    }

    @Override
    public boolean isEnabled(LanguageServerContext serverContext) {
        return true;
    }

    @Override
    public boolean validate(Node node) {
        if (node instanceof FunctionDefinitionNode functionDefinitionNode) {
            return AUTOMATION_FUNCTION.equals(functionDefinitionNode.functionName().text());
        }
        return false;
    }

    @Override
    public CodeLens getLens(DocumentServiceContext context, Node node) {
        List<Object> args = Collections.singletonList(context.fileUri());
        Command command = new Command(CodeLensUtil.RUN_CODELENS, "ballerina.run", args);
        return CodeLensUtil.getCodeLens(command, node);
    }
}

