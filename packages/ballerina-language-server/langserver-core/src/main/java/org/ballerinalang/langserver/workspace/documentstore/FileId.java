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

import java.util.Objects;

/**
 * Opaque identifier for a tracked document.
 *
 * @since 1.7.0
 */
public final class FileId {

    private final String value;

    private FileId(String value) {
        this.value = value;
    }

    /**
     * Creates an opaque file identifier from a validated raw value.
     *
     * @param rawValue raw identifier value
     * @return file identifier
     */
    public static FileId from(String rawValue) {
        Objects.requireNonNull(rawValue, "rawValue must not be null");
        if (rawValue.isBlank()) {
            throw new IllegalArgumentException("rawValue must not be blank");
        }
        return new FileId(rawValue);
    }

    /**
     * Returns whether this file ID equals another object.
     *
     * @param obj object to compare
     * @return {@code true} when both values are equal
     */
    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof FileId other)) {
            return false;
        }
        return value.equals(other.value);
    }

    /**
     * Returns the hash code for this file ID.
     *
     * @return hash code value
     */
    @Override
    public int hashCode() {
        return value.hashCode();
    }

    /**
     * Returns a redacted string representation.
     *
     * @return opaque identifier representation
     */
    @Override
    public String toString() {
        return "FileId[opaque]";
    }
}
