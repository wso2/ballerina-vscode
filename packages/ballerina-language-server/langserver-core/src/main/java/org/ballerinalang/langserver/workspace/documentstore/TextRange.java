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
 * Represents a range within a text document for incremental edits.
 * Line and column indices are zero-based.
 *
 * @param startLine   starting line number (0-based)
 * @param startColumn starting column number (0-based)
 * @param endLine     ending line number (0-based, inclusive)
 * @param endColumn   ending column number (0-based, exclusive)
 *
 * @since 1.7.0
 */
public record TextRange(int startLine, int startColumn, int endLine, int endColumn) {

    /**
     * Creates a text range with validation.
     *
     * @param startLine   starting line number
     * @param startColumn starting column number
     * @param endLine     ending line number
     * @param endColumn   ending column number
     */
    public TextRange {
        if (startLine < 0) {
            throw new IllegalArgumentException("startLine must be non-negative");
        }
        if (startColumn < 0) {
            throw new IllegalArgumentException("startColumn must be non-negative");
        }
        if (endLine < 0) {
            throw new IllegalArgumentException("endLine must be non-negative");
        }
        if (endColumn < 0) {
            throw new IllegalArgumentException("endColumn must be non-negative");
        }
        if (startLine > endLine || (startLine == endLine && startColumn > endColumn)) {
            throw new IllegalArgumentException("range start must not be after range end");
        }
    }

    /**
     * Returns whether this range is empty (zero-length).
     *
     * @return true if start equals end
     */
    public boolean isEmpty() {
        return startLine == endLine && startColumn == endColumn;
    }

    /**
     * Compares this range with another object for equality.
     *
     * @param obj object to compare
     * @return true when both ranges have identical coordinates
     */
    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof TextRange other)) {
            return false;
        }
        return startLine == other.startLine
                && startColumn == other.startColumn
                && endLine == other.endLine
                && endColumn == other.endColumn;
    }

    /**
     * Returns the hash code for this range.
     *
     * @return hash code value
     */
    @Override
    public int hashCode() {
        return Objects.hash(startLine, startColumn, endLine, endColumn);
    }

    /**
     * Returns a string representation of the range.
     *
     * @return range string in [line:col-line:col] format
     */
    @Override
    public String toString() {
        return String.format("[%d:%d-%d:%d]", startLine, startColumn, endLine, endColumn);
    }
}
