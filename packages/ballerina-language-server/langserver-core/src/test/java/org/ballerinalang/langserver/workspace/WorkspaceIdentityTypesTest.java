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

package org.ballerinalang.langserver.workspace;

import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.ballerinalang.langserver.workspace.documentstore.FileId;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

/**
 * Tests workspace identity value objects and bounded-context package scaffolding.
 *
 * @since 1.7.0
 */
public class WorkspaceIdentityTypesTest {

    /**
     * Verifies each supported URI scheme maps to the expected variant.
     */
    // RED: this test should fail - workspace identity types are not yet implemented
    @Test
    public void documentUri_withSupportedSchemes_createsExpectedVariant() {
        DocumentUri.FileUri fileUri = new DocumentUri.FileUri(URI.create("file:///tmp/main.bal"));
        DocumentUri.ExprUri exprUri = new DocumentUri.ExprUri(URI.create("expr:///tmp/main.bal"));
        DocumentUri.AiUri aiUri = new DocumentUri.AiUri(URI.create("ai:///tmp/main.bal"));
        DocumentUri.UntitledUri untitledUri = new DocumentUri.UntitledUri(URI.create("untitled:Untitled-1"));

        Assert.assertEquals(fileUri.uri().getScheme(), "file");
        Assert.assertEquals(exprUri.uri().getScheme(), "expr");
        Assert.assertEquals(aiUri.uri().getScheme(), "ai");
        Assert.assertEquals(untitledUri.uri().getScheme(), "untitled");
    }

    /**
     * Verifies URI-variant constructors reject mismatched schemes.
     *
     * @param variant target URI variant
     * @param uri URI with an invalid scheme for the variant
     */
    @Test(dataProvider = "documentUriMismatchCases")
    public void documentUri_withMismatchedScheme_throws(String variant, URI uri) {
        Assert.assertThrows(IllegalArgumentException.class, () -> {
            switch (variant) {
                case "file" -> new DocumentUri.FileUri(uri);
                case "expr" -> new DocumentUri.ExprUri(uri);
                case "ai" -> new DocumentUri.AiUri(uri);
                case "untitled" -> new DocumentUri.UntitledUri(uri);
                default -> throw new IllegalArgumentException("Unsupported test variant");
            }
        });
    }

    /**
     * Provides mismatched URI schemes for each document URI variant.
     *
     * @return mismatch cases
     */
    @DataProvider(name = "documentUriMismatchCases")
    public Object[][] documentUriMismatchCases() {
        return new Object[][]{
                {"file", URI.create("expr:///tmp/file.bal")},
                {"expr", URI.create("ai:///tmp/file.bal")},
                {"ai", URI.create("file:///tmp/file.bal")},
                {"untitled", URI.create("file:///tmp/file.bal")}
        };
    }

    /**
     * Verifies absolute normalized paths are accepted for source roots.
     */
    @Test
    public void sourceRoot_withAbsoluteNormalizedPath_acceptsPath() {
        SourceRoot sourceRoot = new SourceRoot(Path.of("/tmp/workspace/project"));
        Assert.assertEquals(sourceRoot.path(), Path.of("/tmp/workspace/project"));
    }

    /**
     * Verifies relative paths are rejected for source roots.
     */
    @Test
    public void sourceRoot_withRelativePath_throws() {
        Assert.assertThrows(IllegalArgumentException.class, () -> new SourceRoot(Path.of("workspace/project")));
    }

    /**
     * Verifies non-normalized absolute paths are rejected for source roots.
     */
    @Test
    public void sourceRoot_withNonNormalizedAbsolutePath_throws() {
        Assert.assertThrows(IllegalArgumentException.class,
                () -> new SourceRoot(Path.of("/tmp/workspace/../workspace/project")));
    }

    /**
     * Verifies content-version comparison ordering semantics.
     */
    @Test
    public void contentVersion_compareTo_ordersByVersion() {
        ContentVersion older = new ContentVersion(4);
        ContentVersion newer = new ContentVersion(5);

        Assert.assertTrue(older.compareTo(newer) < 0);
        Assert.assertTrue(newer.compareTo(older) > 0);
    }

    /**
     * Verifies {@code next()} returns a version incremented by one.
     */
    @Test
    public void contentVersion_next_returnsIncrementedVersion() {
        ContentVersion version = new ContentVersion(10);
        Assert.assertEquals(version.next(), new ContentVersion(11));
    }

    /**
     * Verifies file IDs use value equality for equal identifiers.
     */
    @Test
    public void fileId_withSameRawId_isValueEqual() {
        FileId first = FileId.from("doc-01");
        FileId second = FileId.from("doc-01");
        FileId third = FileId.from("doc-02");

        Assert.assertEquals(first, second);
        Assert.assertNotEquals(first, third);
    }

    /**
     * Verifies file ID does not expose its underlying raw representation.
     */
    @Test
    public void fileId_isOpaque_noPublicRawValueAccessor() {
        boolean hasPublicRawAccessor = Arrays.stream(FileId.class.getDeclaredMethods())
                .anyMatch(method -> method.getParameterCount() == 0
                        && method.getReturnType().equals(String.class)
                        && !method.getName().equals("toString"));

        Assert.assertFalse(hasPublicRawAccessor);
    }

    /**
     * Verifies each bounded context has a package-info scaffold file.
     *
     * @param resourcePath package-info resource path
     */
    @Test(dataProvider = "packageInfoResources")
    public void packageScaffold_containsPackageInfoForEachContext(String resourcePath) {
        Path packageInfoFile = moduleRoot().resolve("src/main/java").resolve(resourcePath.replace(".class", ".java"));
        Assert.assertTrue(Files.exists(packageInfoFile), "Missing package-info.java at: " + packageInfoFile);
    }

    /**
     * Provides package-info resource paths for each bounded context package.
     *
     * @return package-info resource path cases
     */
    @DataProvider(name = "packageInfoResources")
    public Object[][] packageInfoResources() {
        return new Object[][]{
                {"org/ballerinalang/langserver/workspace/lspgateway/package-info.class"},
                {"org/ballerinalang/langserver/workspace/workspacemanager/package-info.class"},
                {"org/ballerinalang/langserver/workspace/compilerengine/package-info.class"},
                {"org/ballerinalang/langserver/workspace/documentstore/package-info.class"},
                {"org/ballerinalang/langserver/workspace/executionmanager/package-info.class"},
                {"org/ballerinalang/langserver/workspace/observability/package-info.class"},
                {"org/ballerinalang/langserver/workspace/eventbus/package-info.class"}
        };
    }

    private static Path moduleRoot() {
        Path currentDirectory = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
        Path modulePathFromRoot = currentDirectory.resolve("langserver-core");
        if (Files.isDirectory(modulePathFromRoot.resolve("src/main/java"))) {
            return modulePathFromRoot;
        }
        if (Files.isDirectory(currentDirectory.resolve("src/main/java"))) {
            return currentDirectory;
        }
        throw new IllegalStateException("Unable to locate langserver-core module root");
    }
}
