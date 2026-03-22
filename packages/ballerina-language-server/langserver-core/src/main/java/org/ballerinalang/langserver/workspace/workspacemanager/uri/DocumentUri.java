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

package org.ballerinalang.langserver.workspace.workspacemanager.uri;

import java.net.URI;
import javax.annotation.Nonnull;

/**
 * Represents document identity using supported URI schemes.
 *
 * @since 1.7.0
 */
public sealed interface DocumentUri permits DocumentUri.FileUri, DocumentUri.ExprUri, DocumentUri.AiUri {

    /**
     * Returns the URI identity.
     *
     * @return URI value
     */
    URI uri();

    private static URI validateScheme(@Nonnull URI uri, String scheme) {
        if (!scheme.equals(uri.getScheme())) {
            throw new IllegalArgumentException("Expected URI scheme '" + scheme + "' but found '"
                    + uri.getScheme() + "'");
        }
        return uri;
    }

    /**
     * Identity for {@code file://} documents.
     *
     * @param uri document URI
     */
    record FileUri(URI uri) implements DocumentUri {
        /**
         * Creates a file URI identity.
         *
         * @param uri file URI with {@code file} scheme
         */
        public FileUri {
            uri = validateScheme(uri, "file");
        }
    }

    /**
     * Identity for {@code expr://} documents.
     *
     * @param uri document URI
     */
    record ExprUri(URI uri) implements DocumentUri {
        /**
         * Creates an expr URI identity.
         *
         * @param uri expression URI with {@code expr} scheme
         */
        public ExprUri {
            uri = validateScheme(uri, "expr");
        }
    }

    /**
     * Identity for {@code ai://} documents.
     *
     * @param uri document URI
     */
    record AiUri(URI uri) implements DocumentUri {
        /**
         * Creates an AI URI identity.
         *
         * @param uri AI URI with {@code ai} scheme
         */
        public AiUri {
            uri = validateScheme(uri, "ai");
        }
    }
}
