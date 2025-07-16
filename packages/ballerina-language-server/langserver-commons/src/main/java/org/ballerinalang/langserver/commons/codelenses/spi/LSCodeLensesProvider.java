/*
 * Copyright (c) 2020, WSO2 Inc. (http://wso2.com) All Rights Reserved.
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
package org.ballerinalang.langserver.commons.codelenses.spi;

import io.ballerina.compiler.syntax.tree.Node;
import org.ballerinalang.langserver.commons.DocumentServiceContext;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.eclipse.lsp4j.CodeLens;

/**
 * Represents the SPI interface for the Language Server Code Lenses Provider.
 *
 * @since 1.0.0
 */
public interface LSCodeLensesProvider {

    /**
     * Returns name of the code lenses provider.
     *
     * @return name
     */
    String getName();

    /**
     * Returns the code lens for a given node. If the node is not a valid node for the provider,
     * this method should return null.
     *
     * @param context Language Server Context
     * @param node    Node to get the code lens
     * @return {@link CodeLens} Code lens for the node, or null if not applicable
     */
    CodeLens getLens(DocumentServiceContext context, Node node);

    /**
     * Mark code lenses provider is enabled or not.
     *
     * @param serverContext {@link LanguageServerContext}
     * @return True when enabled, false otherwise
     */
    boolean isEnabled(LanguageServerContext serverContext);
}
