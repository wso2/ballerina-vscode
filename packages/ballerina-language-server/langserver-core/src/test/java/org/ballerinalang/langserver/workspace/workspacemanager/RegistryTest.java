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

import io.ballerina.projects.Project;
import org.ballerinalang.langserver.workspace.workspacemanager.cache.SharedDependencyCache;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.DocumentUri;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.UriResolver;
import org.mockito.Mockito;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Tests for {@link SharedDependencyCache} and UriResolver project-index behavior migrated from the old registry suite.
 *
 * @since 1.7.0
 */
public class RegistryTest {

    @Test
    public void sharedDependencyCache_retainAndRelease_tracksWeight() {
        SharedDependencyCache cache = new SharedDependencyCache(512);

        Assert.assertTrue(cache.retain("dep:guava", "guava-jar", 5));
        Assert.assertEquals(cache.totalWeightMb(), 5L);
        Assert.assertEquals(cache.get("dep:guava").orElseThrow(), "guava-jar");

        cache.release("dep:guava");
        Assert.assertTrue(cache.get("dep:guava").isEmpty());
        Assert.assertEquals(cache.totalWeightMb(), 0L);
    }

    @Test
    public void sharedDependencyCache_retain_overBudget_returnsFalse() {
        SharedDependencyCache cache = new SharedDependencyCache(10);

        cache.retain("dep:big1", "big1", 8);

        Assert.assertFalse(cache.retain("dep:big2", "big2", 5));
        Assert.assertTrue(cache.get("dep:big2").isEmpty());
    }

    @Test
    public void uriResolver_projectIndex_explicitRemovalSkipsCallback() {
        List<DocumentUri> evictedRoots = new CopyOnWriteArrayList<>();
        UriResolver resolver = new UriResolver(2, evictedRoots::add);
        DocumentUri root = root("/projects/alpha");
        Project project = Mockito.mock(Project.class);

        resolver.registerProject(root, project);
        resolver.removeProject(root);

        Assert.assertTrue(resolver.getProject(root).isEmpty());
        Assert.assertTrue(evictedRoots.isEmpty());
    }

    private static DocumentUri root(String path) {
        return new DocumentUri.FileUri(Path.of(path).toAbsolutePath().normalize().toUri());
    }
}
