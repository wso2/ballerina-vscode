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

import java.util.Set;

/**
 * Classification of LSP requests into SYNTAX (immediate) or SEMANTIC (wait for snapshot) tiers.
 *
 * @since 1.7.0
 */
public enum RequestTier {
    SYNTAX,
    SEMANTIC;

    private static final Set<String> SYNTAX_METHODS = Set.of(
            "textDocument/documentSymbol",
            "textDocument/foldingRange",
            "textDocument/selectionRange",
            "textDocument/documentHighlight",
            "textDocument/onTypeFormatting"
    );

    /**
     * Classifies an LSP method into its corresponding request tier.
     *
     * @param method LSP method name
     * @return {@link RequestTier}
     */
    public static RequestTier classify(String method) {
        if (SYNTAX_METHODS.contains(method)) {
            return SYNTAX;
        }
        return SEMANTIC;
    }
}
