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

package org.ballerinalang.langserver.version;

import io.ballerina.compiler.syntax.tree.ExpressionFunctionBodyNode;
import io.ballerina.compiler.syntax.tree.FunctionBodyNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.commons.BallerinaCompilerApi;

/**
 * Compiler API implementation for Ballerina 2201.13.0.
 *
 * @since 1.0.0
 */
@JavaSPIService("org.ballerinalang.langserver.commons.BallerinaCompilerApi")
public class BallerinaU13CompilerApi extends BallerinaCompilerApi {

    @Override
    public String getVersion() {
        return "2201.13.0";
    }

    @Override
    public boolean isNaturalExpressionBody(ExpressionFunctionBodyNode expressionFunctionBodyNode) {
        return expressionFunctionBodyNode.expression().kind() == SyntaxKind.NATURAL_EXPRESSION;
    }

    @Override
    public boolean isNaturalExpressionBodiedFunction(FunctionDefinitionNode functionDefNode) {
        FunctionBodyNode functionBody = functionDefNode.functionBody();
        return functionBody.kind() == SyntaxKind.EXPRESSION_FUNCTION_BODY
                && ((ExpressionFunctionBodyNode) functionBody).expression().kind() == SyntaxKind.NATURAL_EXPRESSION;
    }
}
