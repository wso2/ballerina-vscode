/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
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

package org.ballerinalang.langserver.workspace.lspgateway;

import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

/**
 * Tests classification of LSP methods into RequestTiers.
 *
 * @since 1.7.0
 */
public class RequestTierTest {

    @DataProvider(name = "methodTierProvider")
    public Object[][] methodTierProvider() {
        return new Object[][]{
                {"textDocument/documentSymbol", RequestTier.SYNTAX},
                {"textDocument/foldingRange", RequestTier.SYNTAX},
                {"textDocument/selectionRange", RequestTier.SYNTAX},
                {"textDocument/documentHighlight", RequestTier.SYNTAX},
                {"textDocument/onTypeFormatting", RequestTier.SYNTAX},
                {"textDocument/hover", RequestTier.SEMANTIC},
                {"textDocument/completion", RequestTier.SEMANTIC},
                {"textDocument/definition", RequestTier.SEMANTIC},
                {"textDocument/references", RequestTier.SEMANTIC},
                {"textDocument/semanticTokens", RequestTier.SEMANTIC},
                {"textDocument/publishDiagnostics", RequestTier.SEMANTIC},
                {"unknown/method", RequestTier.SEMANTIC} // Default should be SEMANTIC for safety
        };
    }

    @Test(dataProvider = "methodTierProvider")
    public void classify_returnsCorrectTierForMethod(String method, RequestTier expectedTier) {
        Assert.assertEquals(RequestTier.classify(method), expectedTier);
    }
}
