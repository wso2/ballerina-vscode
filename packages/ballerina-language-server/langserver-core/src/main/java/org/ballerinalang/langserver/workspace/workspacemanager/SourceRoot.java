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

package org.ballerinalang.langserver.workspace.workspacemanager;

import java.nio.file.Path;
import javax.annotation.Nonnull;

/**
 * Identifies a project source root using an absolute, normalized path.
 *
 * @since 1.7.0
 */
public final class SourceRoot {

    private final Path path;

    /**
     * Creates a source-root identity.
     *
     * @param path absolute and normalized source-root path
     */
    public SourceRoot(@Nonnull Path path) {
        if (!path.isAbsolute()) {
            throw new IllegalArgumentException("path must be absolute");
        }
        if (!path.normalize().equals(path)) {
            throw new IllegalArgumentException("path must be normalized");
        }
        this.path = path;
    }

    /**
     * Returns the normalized source-root path.
     *
     * @return source-root path
     */
    public Path path() {
        return path;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof SourceRoot other)) {
            return false;
        }
        return path.equals(other.path);
    }

    @Override
    public int hashCode() {
        return path.hashCode();
    }

    @Override
    public String toString() {
        return "SourceRoot[" + path + "]";
    }
}
