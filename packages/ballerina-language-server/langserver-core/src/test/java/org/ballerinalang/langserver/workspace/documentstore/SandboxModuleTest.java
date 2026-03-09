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

import org.testng.Assert;
import org.testng.annotations.Test;

import java.net.URI;
import java.nio.file.Path;

/**
 * Tests for {@link SandboxModule} and its bounded registry.
 *
 * @since 1.7.0
 */
public class SandboxModuleTest {

    /**
     * Verifies sandbox creation accepts only expr:// and ai:// schemes.
     */
    @Test(expectedExceptions = IllegalArgumentException.class)
    public void create_nonSandboxScheme_throwsException() {
        SandboxModule module = new SandboxModule(
                new DocumentUri.FileUri(URI.create("file:///workspace/main.bal")),
                Path.of("/workspace/project"),
                "function main() {}"
        );
        Assert.assertNotNull(module);
    }

    /**
     * Verifies registry rejects creation once 50 instances are active.
     */
    @Test
    public void registry_whenAtLimit_rejectsNewSandbox() {
        SandboxModule.Registry registry = new SandboxModule.Registry();
        Path sourceRoot = Path.of("/workspace/project");

        for (int i = 0; i < 50; i++) {
            DocumentUri uri = new DocumentUri.ExprUri(URI.create("expr:///session/" + i));
            registry.create(uri, sourceRoot, "expr " + i);
        }

        Assert.assertEquals(registry.size(), 50);

        IllegalStateException ex = Assert.expectThrows(IllegalStateException.class,
                () -> registry.create(new DocumentUri.AiUri(URI.create("ai:///session/overflow")),
                        sourceRoot, "overflow"));

        Assert.assertTrue(ex.getMessage().contains("50"));
        Assert.assertEquals(registry.size(), 50);
    }
}
