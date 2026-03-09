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

package org.ballerinalang.langserver.workspace.documentstore;

import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Ephemeral sandbox module for expr:// and ai:// virtual documents.
 *
 * @since 1.7.0
 */
public final class SandboxModule {

    /**
     * Maximum number of active sandbox modules allowed in a registry.
     */
    public static final int MAX_INSTANCES = 50;

    private final DocumentUri uri;
    private final Path parentSourceRoot;
    private final String ephemeralContent;

    /**
     * Creates a sandbox module for a virtual document.
     *
     * @param uri expr:// or ai:// URI
     * @param parentSourceRoot parent source root reference
     * @param ephemeralContent in-memory sandbox content
     */
    public SandboxModule(DocumentUri uri, Path parentSourceRoot, String ephemeralContent) {
        this.uri = Objects.requireNonNull(uri, "uri must not be null");
        this.parentSourceRoot = Objects.requireNonNull(parentSourceRoot, "parentSourceRoot must not be null")
                .toAbsolutePath().normalize();
        this.ephemeralContent = Objects.requireNonNull(ephemeralContent, "ephemeralContent must not be null");

        if (!(uri instanceof DocumentUri.ExprUri) && !(uri instanceof DocumentUri.AiUri)) {
            throw new IllegalArgumentException("SandboxModule requires expr:// or ai:// URI");
        }
    }

    /**
     * Returns the virtual document URI.
     *
     * @return sandbox URI
     */
    public DocumentUri uri() {
        return uri;
    }

    /**
     * Returns parent source root reference.
     *
     * @return parent source root
     */
    public Path parentSourceRoot() {
        return parentSourceRoot;
    }

    /**
     * Returns in-memory sandbox content.
     *
     * @return content
     */
    public String ephemeralContent() {
        return ephemeralContent;
    }

    /**
     * Bounded registry for active sandbox modules.
     *
     * @since 1.7.0
     */
    public static final class Registry {

        private final Map<String, SandboxModule> modules = new LinkedHashMap<>(16, 0.75f, true);

        /**
         * Creates and stores a sandbox module if capacity allows.
         *
         * @param uri expr:// or ai:// URI
         * @param parentSourceRoot parent source root reference
         * @param ephemeralContent in-memory sandbox content
         * @return created sandbox module
         */
        public synchronized SandboxModule create(DocumentUri uri, Path parentSourceRoot, String ephemeralContent) {
            if (modules.size() >= MAX_INSTANCES) {
                throw new IllegalStateException("Sandbox module capacity reached: " + MAX_INSTANCES);
            }

            SandboxModule module = new SandboxModule(uri, parentSourceRoot, ephemeralContent);
            modules.put(module.uri().toString(), module);
            return module;
        }

        /**
         * Returns the number of active sandbox modules.
         *
         * @return active module count
         */
        public synchronized int size() {
            return modules.size();
        }

        /**
         * Removes a module by URI identity.
         *
         * @param uri sandbox URI
         * @return true if removed
         */
        public synchronized boolean remove(DocumentUri uri) {
            Objects.requireNonNull(uri, "uri must not be null");
            return modules.remove(uri.toString()) != null;
        }

        /**
         * Returns a module for the URI when present.
         *
         * @param uri sandbox URI
         * @return module when present
         */
        public synchronized Optional<SandboxModule> get(DocumentUri uri) {
            Objects.requireNonNull(uri, "uri must not be null");
            return Optional.ofNullable(modules.get(uri.toString()));
        }

        /**
         * Returns an immutable snapshot of all modules.
         *
         * @return immutable module list
         */
        public synchronized List<SandboxModule> all() {
            return List.copyOf(modules.values());
        }
    }
}
