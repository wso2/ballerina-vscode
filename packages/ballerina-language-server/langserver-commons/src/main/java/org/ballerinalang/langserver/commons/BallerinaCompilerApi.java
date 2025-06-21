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

package org.ballerinalang.langserver.commons;

import com.github.zafarkhaja.semver.Version;
import io.ballerina.compiler.syntax.tree.ExpressionFunctionBodyNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.projects.Project;
import org.wso2.ballerinalang.util.RepoUtils;

import java.util.ServiceLoader;

/**
 * Abstract class for the new Ballerina Compiler APIs.
 * <p>
 * This is an <strong>abstract class</strong> that follows the adapter pattern to handle different Ballerina compiler
 * API versions gracefully.
 * <p>
 * The {@link #initialize()} method must be called once during language server startup before calling
 * {@link #getInstance()}.
 * <p>
 * The best practice is to extend the class implementation of the previous version to only highlight the differences
 * (e.g., U13 should extend U12).
 *
 * @since 1.0.0
 */
public abstract class BallerinaCompilerApi {

    private static final String DEFAULT_VERSION = "2201.0.0"; // Default version if no specific implementation is found
    private static BallerinaCompilerApi instance;

    /**
     * Initializes the adapter by loading the correct implementation for the Ballerina version. Must be called once at
     * startup.
     */
    public static void initialize() {
        ServiceLoader<BallerinaCompilerApi> serviceLoader = ServiceLoader.load(BallerinaCompilerApi.class);
        String ballerinaVersion = RepoUtils.getBallerinaPackVersion();

        // Ignore the pre-release suffix if present
        Version currentVersion = Version.valueOf(Version.valueOf(ballerinaVersion).getNormalVersion());

        // Find the best match for the current Ballerina version
        Version bestMatchVersion = null;
        BallerinaCompilerApi bestMatch = null;
        BallerinaCompilerApi defaultMatch = null;
        for (BallerinaCompilerApi service : serviceLoader) {
            String serviceVersionString = service.getVersion();
            Version serviceVersion = Version.valueOf(serviceVersionString);

            // Check if this service version is <= current version
            if (serviceVersion.lessThanOrEqualTo(currentVersion)) {
                // Keep track of the highest version that's still <= current version
                if (bestMatch == null || serviceVersion.greaterThan(bestMatchVersion)) {
                    bestMatch = service;
                    bestMatchVersion = serviceVersion;
                }
            }

            // Keep track of default version service as fallback
            if (defaultMatch == null && DEFAULT_VERSION.equals(serviceVersionString)) {
                defaultMatch = service;
            }
        }

        if (bestMatch != null) {
            instance = bestMatch;
        } else if (defaultMatch != null) {
            instance = defaultMatch;
        } else {
            throw new IllegalStateException("Implementation for BallerinaCompilerApi cannot be found.");
        }
    }

    /**
     * Gets the singleton instance. {@link #initialize()} must be called first.
     *
     * @return The singleton instance of BallerinaCompilerApi.
     * @throws IllegalStateException if not initialized.
     */
    public static BallerinaCompilerApi getInstance() {
        if (instance == null) {
            throw new IllegalStateException("BallerinaCompilerApi is not initialized. " +
                    "Please call BallerinaCompilerApi.initialize() before using this method.");
        }
        return instance;
    }

    /**
     * Gets the Ballerina version for this implementation.
     *
     * @return The version string.
     */
    public abstract String getVersion();

    /**
     * Checks if the node is a natural expression body.
     *
     * @param expressionFunctionBodyNode The node to check.
     * @return {@code true} if it is a natural expression body.
     */
    public abstract boolean isNaturalExpressionBody(ExpressionFunctionBodyNode expressionFunctionBodyNode);

    /**
     * Checks if the function has a natural expression body.
     *
     * @param functionDefNode The function node to check.
     * @return {@code true} if the function has a natural expression body.
     */
    public abstract boolean isNaturalExpressionBodiedFunction(FunctionDefinitionNode functionDefNode);

    /**
     * Checks if the project has optimized dependency compilation enabled.
     *
     * @param project The project to check.
     * @return {@code true} if optimized dependency compilation is enabled.
     */
    public abstract boolean hasOptimizedDependencyCompilation(Project project);
}
