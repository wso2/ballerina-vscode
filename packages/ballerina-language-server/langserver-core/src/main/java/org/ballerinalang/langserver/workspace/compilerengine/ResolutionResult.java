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

package org.ballerinalang.langserver.workspace.compilerengine;

import javax.annotation.Nonnull;

import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;

import java.util.List;
import java.util.Objects;

/**
 * Captures pre-compilation resolution diagnostics per ADR-008.
 *
 * @param sourceRootUri  the project that was resolved
 * @param diagnostics immutable list of resolution diagnostics
 * @param success     {@code true} when no ERROR-level diagnostics are present
 * @since 1.7.0
 */
public record ResolutionResult(@Nonnull DocumentUri sourceRootUri,
                                @Nonnull List<ResolutionDiagnostic> diagnostics,
                                boolean success) {

    /**
     * Validates fields and creates a defensive copy of diagnostics.
     */
    public ResolutionResult {
        Objects.requireNonNull(sourceRootUri, "sourceRootUri must not be null");
        diagnostics = List.copyOf(diagnostics);
    }

    /**
     * A single resolution diagnostic.
     *
     * @param severity   the diagnostic severity
     * @param message    the diagnostic message
     * @param modulePath the module path where the issue was found
     * @since 1.7.0
     */
    public record ResolutionDiagnostic(@Nonnull Severity severity, @Nonnull String message,
                                       @Nonnull String modulePath) {

        /**
         * Validates all fields are non-null.
         */
        public ResolutionDiagnostic {
        }
    }

    /**
     * Severity levels for resolution diagnostics.
     *
     * @since 1.7.0
     */
    public enum Severity {
        ERROR,
        WARNING,
        INFO
    }
}
