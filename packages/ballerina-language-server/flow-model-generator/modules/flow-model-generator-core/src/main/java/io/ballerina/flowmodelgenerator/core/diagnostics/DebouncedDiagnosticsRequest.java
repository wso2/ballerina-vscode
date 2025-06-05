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

package io.ballerina.flowmodelgenerator.core.diagnostics;

import java.util.concurrent.Callable;

/**
 * Interface representing a debounced diagnostics request. This interface provides a template for handling
 * diagnostics requests with debouncing functionality specifically for the Flow Model Generator.
 * It manages the lifecycle of processing diagnostics requests while enabling asynchronous execution.
 *
 * @param <T> The type of response that will be returned by this diagnostics request
 * @since 2.0.0
 */
public interface DebouncedDiagnosticsRequest<T> extends Callable<T> {

    /**
     * Returns the unique key associated with the diagnostics request. This key is utilized by the debouncer
     * to manage and debounce related diagnostics requests.
     *
     * @return A unique string identifier for the diagnostics request
     */
    String getKey();

    /**
     * Returns the delay in milliseconds to be used for debouncing the diagnostics request.
     *
     * @return The delay in milliseconds
     */
    long getDelay();

    /**
     * Reverts any document changes that may have been made during the diagnostics processing.
     * This method should be called when the request is cancelled or completes exceptionally.
     */
    default void revertDocument() {
        // Default implementation does nothing
        // Subclasses can override this if they need to revert document changes
    }
}
