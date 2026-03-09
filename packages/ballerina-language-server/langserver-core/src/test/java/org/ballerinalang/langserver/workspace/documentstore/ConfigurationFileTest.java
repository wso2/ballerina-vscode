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

import org.eclipse.lsp4j.FileChangeType;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.net.URI;
import java.util.List;

/**
 * Tests for {@link ConfigurationFile} tier classification behavior.
 *
 * @since 1.7.0
 */
public class ConfigurationFileTest {

    private static final DocumentUri TEST_URI = new DocumentUri.FileUri(URI.create("file:///workspace/Ballerina.toml"));

    /**
     * Verifies Dependencies.toml creation maps to Tier 1 structural reactivity.
     */
    @Test
    public void classify_dependenciesTomlCreated_returnsStructural() {
        ConfigurationFile file = new ConfigurationFile(TEST_URI, ConfigFileType.DEPENDENCIES_TOML, "[dependency]");

        Assert.assertEquals(file.classify(FileChangeType.Created), ReactivityTier.STRUCTURAL);
    }

    /**
     * Verifies Dependencies.toml modification maps to Tier 2 dependency graph reactivity.
     */
    @Test
    public void classify_dependenciesTomlChanged_returnsDependencyGraph() {
        ConfigurationFile file = new ConfigurationFile(TEST_URI, ConfigFileType.DEPENDENCIES_TOML, "[dependency]");

        Assert.assertEquals(file.classify(FileChangeType.Changed), ReactivityTier.DEPENDENCY_GRAPH);
    }

    /**
     * Verifies Cloud.toml changes map to Tier 3 configuration reactivity.
     */
    @Test
    public void classify_cloudTomlChanged_returnsConfiguration() {
        ConfigurationFile file = new ConfigurationFile(TEST_URI, ConfigFileType.CLOUD_TOML, "[cloud]");

        Assert.assertEquals(file.classify(FileChangeType.Changed), ReactivityTier.CONFIGURATION);
    }

    /**
     * Verifies Ballerina.toml changes map to Tier 1 structural reactivity.
     */
    @Test
    public void classify_ballerinaTomlChanged_returnsStructural() {
        ConfigurationFile file = new ConfigurationFile(TEST_URI, ConfigFileType.BALLERINA_TOML, "[package]");

        Assert.assertEquals(file.classify(FileChangeType.Changed), ReactivityTier.STRUCTURAL);
    }

    /**
     * Verifies compound change promotion returns the highest tier present.
     */
    @Test
    public void promote_compoundChanges_returnsHighestTier() {
        ReactivityTier promoted = ConfigurationFile.promote(List.of(
                ReactivityTier.CONFIGURATION,
                ReactivityTier.DEPENDENCY_GRAPH,
                ReactivityTier.STRUCTURAL));

        Assert.assertEquals(promoted, ReactivityTier.STRUCTURAL);
    }
}
