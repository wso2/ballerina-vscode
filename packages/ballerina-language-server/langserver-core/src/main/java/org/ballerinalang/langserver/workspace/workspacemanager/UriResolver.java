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

import io.ballerina.projects.Document;
import io.ballerina.projects.Module;
import io.ballerina.projects.Project;
import io.ballerina.projects.TomlDocument;
import io.ballerina.projects.util.ProjectConstants;

import java.net.URI;
import java.nio.file.Path;
import java.lang.reflect.Method;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Lock-free URI resolution cache backed by an immutable persistent trie.
 *
 * <p>Readers call resolution methods with zero synchronization. They snapshot the current trie
 * root via a plain {@link AtomicReference#get()} and traverse the immutable structure without
 * locking. A single maintainer thread updates the root via {@link AtomicReference#set(Object)}
 * after constructing a new immutable snapshot.</p>
 *
 * <p>Implements the ADR-048 trie-based URI resolution design.</p>
 *
 * @since 1.7.0
 */
public final class UriResolver {

    private static final TargetType[] RESOLUTION_ORDER = {
            TargetType.DOCUMENT,
            TargetType.CONFIG,
            TargetType.MODULE,
            TargetType.PROJECT
    };

    private final AtomicReference<TrieNode<ResolvedEntry>> root = new AtomicReference<>(new TrieNode<>());

    /**
     * Resolves the given URI using the URI's own scheme.
     *
     * @param uri the document URI to resolve
     * @return the resolved entry, or empty if not cached
     */
    public Optional<ResolvedEntry> resolve(DocumentUri uri) {
        return resolve(uri, uri.uri().getScheme());
    }

    /**
     * Resolves the given URI to the most specific cached entry for the supplied scheme.
     *
     * @param uri the document URI to resolve
     * @param scheme the scheme to discriminate by
     * @return the resolved entry, or empty if not cached
     */
    public Optional<ResolvedEntry> resolve(DocumentUri uri, String scheme) {
        Objects.requireNonNull(uri, "uri must not be null");
        Objects.requireNonNull(scheme, "scheme must not be null");

        TrieNode<ResolvedEntry> snapshot = root.get();
        String[] segments = toSegments(uri.uri());
        for (TargetType targetType : RESOLUTION_ORDER) {
            Optional<ResolvedEntry> match = lookup(snapshot, segments, scheme, targetType);
            if (match.isPresent()) {
                return match;
            }
        }
        return Optional.empty();
    }

    /**
     * Resolves a cached document using the URI's own scheme.
     *
     * @param uri the document URI
     * @return the cached document, or empty if unavailable
     */
    public Optional<Document> document(DocumentUri uri) {
        return document(uri, uri.uri().getScheme());
    }

    /**
     * Resolves a cached document for the supplied scheme.
     *
     * @param uri the document URI
     * @param scheme the scheme to discriminate by
     * @return the cached document, or empty if unavailable
     */
    public Optional<Document> document(DocumentUri uri, String scheme) {
        TrieNode<ResolvedEntry> snapshot = root.get();
        return lookup(snapshot, toSegments(uri.uri()), scheme, TargetType.DOCUMENT)
                .filter(ResolvedEntry.DocumentEntry.class::isInstance)
                .map(ResolvedEntry.DocumentEntry.class::cast)
                .map(ResolvedEntry.DocumentEntry::document);
    }

    /**
     * Resolves a module using the URI's own scheme.
     *
     * @param uri the document URI
     * @return the cached or derived module, or empty if unavailable
     */
    public Optional<Module> module(DocumentUri uri) {
        return module(uri, uri.uri().getScheme());
    }

    /**
     * Resolves a module for the supplied scheme, deriving upward from a cached document when possible.
     *
     * @param uri the document URI
     * @param scheme the scheme to discriminate by
     * @return the cached or derived module, or empty if unavailable
     */
    public Optional<Module> module(DocumentUri uri, String scheme) {
        TrieNode<ResolvedEntry> snapshot = root.get();
        String[] segments = toSegments(uri.uri());
        return lookup(snapshot, segments, scheme, TargetType.MODULE)
                .filter(ResolvedEntry.ModuleEntry.class::isInstance)
                .map(ResolvedEntry.ModuleEntry.class::cast)
                .map(ResolvedEntry.ModuleEntry::module)
                .or(() -> lookup(snapshot, segments, scheme, TargetType.DOCUMENT)
                        .filter(ResolvedEntry.DocumentEntry.class::isInstance)
                        .map(ResolvedEntry.DocumentEntry.class::cast)
                        .map(ResolvedEntry.DocumentEntry::document)
                        .map(Document::module));
    }

    /**
     * Resolves a project using the URI's own scheme.
     *
     * @param uri the document URI
     * @return the cached or derived project, or empty if unavailable
     */
    public Optional<Project> project(DocumentUri uri) {
        return project(uri, uri.uri().getScheme());
    }

    /**
     * Resolves a project for the supplied scheme, deriving upward from cached module, document,
     * or config entries when possible.
     *
     * @param uri the document URI
     * @param scheme the scheme to discriminate by
     * @return the cached or derived project, or empty if unavailable
     */
    public Optional<Project> project(DocumentUri uri, String scheme) {
        TrieNode<ResolvedEntry> snapshot = root.get();
        String[] segments = toSegments(uri.uri());
        return lookup(snapshot, segments, scheme, TargetType.PROJECT)
                .filter(ResolvedEntry.ProjectEntry.class::isInstance)
                .map(ResolvedEntry.ProjectEntry.class::cast)
                .map(ResolvedEntry.ProjectEntry::project)
                .or(() -> lookup(snapshot, segments, scheme, TargetType.MODULE)
                        .filter(ResolvedEntry.ModuleEntry.class::isInstance)
                        .map(ResolvedEntry.ModuleEntry.class::cast)
                        .map(ResolvedEntry.ModuleEntry::module)
                        .map(Module::project))
                .or(() -> lookup(snapshot, segments, scheme, TargetType.DOCUMENT)
                        .filter(ResolvedEntry.DocumentEntry.class::isInstance)
                        .map(ResolvedEntry.DocumentEntry.class::cast)
                        .map(ResolvedEntry.DocumentEntry::document)
                        .map(Document::module)
                        .map(Module::project))
                .or(() -> lookup(snapshot, segments, scheme, TargetType.CONFIG)
                        .filter(ResolvedEntry.ConfigEntry.class::isInstance)
                        .map(ResolvedEntry.ConfigEntry.class::cast)
                        .flatMap(ResolvedEntry.ConfigEntry::project));
    }

    /**
     * Resolves a cached config file using the URI's own scheme.
     *
     * @param uri the document URI
     * @return the cached config, or empty if unavailable
     */
    public Optional<TomlDocument> config(DocumentUri uri) {
        return config(uri, uri.uri().getScheme());
    }

    /**
     * Resolves a cached config file for the supplied scheme.
     *
     * @param uri the document URI
     * @param scheme the scheme to discriminate by
     * @return the cached config, or empty if unavailable
     */
    public Optional<TomlDocument> config(DocumentUri uri, String scheme) {
        TrieNode<ResolvedEntry> snapshot = root.get();
        return lookup(snapshot, toSegments(uri.uri()), scheme, TargetType.CONFIG)
                .filter(ResolvedEntry.ConfigEntry.class::isInstance)
                .map(ResolvedEntry.ConfigEntry.class::cast)
                .map(ResolvedEntry.ConfigEntry::config);
    }

    /**
     * Registers a resolved entry using the URI's own scheme and the entry's target type.
     *
     * @param uri the document URI
     * @param entry the resolved back-references to store
     */
    public void register(DocumentUri uri, ResolvedEntry entry) {
        register(uri, uri.uri().getScheme(), entry.targetType(), entry);
    }

    /**
     * Registers a resolved entry using the supplied scheme and the entry's target type.
     *
     * @param uri the document URI
     * @param scheme the scheme discriminator
     * @param entry the resolved back-references to store
     */
    public void register(DocumentUri uri, String scheme, ResolvedEntry entry) {
        register(uri, scheme, entry.targetType(), entry);
    }

    /**
     * Registers a resolved entry for the given URI.
     *
     * @param uri the document URI
     * @param scheme the scheme discriminator
     * @param targetType the target type discriminator
     * @param entry the resolved back-references to store
     */
    public void register(DocumentUri uri, String scheme, TargetType targetType, ResolvedEntry entry) {
        Objects.requireNonNull(uri, "uri must not be null");
        Objects.requireNonNull(scheme, "scheme must not be null");
        Objects.requireNonNull(targetType, "targetType must not be null");
        Objects.requireNonNull(entry, "entry must not be null");

        root.set(root.get().insert(toSegments(uri.uri()), scheme, targetType, entry));
    }

    /**
     * Removes all entries at the given URI for the URI's own scheme.
     *
     * @param uri the document URI to remove
     */
    public void unregister(DocumentUri uri) {
        unregisterSchemeEntries(uri, uri.uri().getScheme());
    }

    /**
     * Removes a single keyed entry at the given URI.
     *
     * @param uri the document URI to remove
     * @param scheme the scheme discriminator
     * @param targetType the target type discriminator
     */
    public void unregister(DocumentUri uri, String scheme, TargetType targetType) {
        Objects.requireNonNull(uri, "uri must not be null");
        Objects.requireNonNull(scheme, "scheme must not be null");
        Objects.requireNonNull(targetType, "targetType must not be null");

        root.set(root.get().remove(toSegments(uri.uri()), scheme, targetType));
    }

    /**
     * Evicts all cached entries under the given source root URI prefix.
     *
     * @param sourceRootUri the source root URI whose subtree should be evicted
     */
    public void evictSubtree(DocumentUri sourceRootUri) {
        Objects.requireNonNull(sourceRootUri, "sourceRootUri must not be null");
        root.set(root.get().removeSubtree(toSegments(sourceRootUri.uri())));
    }

    /**
     * Updates a document entry and refreshes its module and project ancestors in a single atomic swap.
     *
     * @param uri the document URI
     * @param scheme the scheme discriminator
     * @param newDocument the new document instance
     */
    public void onDocumentUpdate(DocumentUri uri, String scheme, Document newDocument) {
        Objects.requireNonNull(newDocument, "newDocument must not be null");
        Module module = newDocument.module();
        Project project = module.project();

        TrieNode<ResolvedEntry> snapshot = root.get();
        TrieNode<ResolvedEntry> updated = snapshot
                .insert(toSegments(project.sourceRoot()), scheme, TargetType.PROJECT,
                        new ResolvedEntry.ProjectEntry(project))
                .insert(toSegments(modulePath(uri, project)), scheme, TargetType.MODULE,
                        new ResolvedEntry.ModuleEntry(module))
                .insert(toSegments(uri.uri()), scheme, TargetType.DOCUMENT,
                        new ResolvedEntry.DocumentEntry(newDocument));
        root.set(updated);
    }

    /**
     * Creates a new document entry and refreshes its ancestors in a single atomic swap.
     *
     * @param uri the document URI
     * @param scheme the scheme discriminator
     * @param newDocument the new document instance
     */
    public void onDocumentCreate(DocumentUri uri, String scheme, Document newDocument) {
        onDocumentUpdate(uri, scheme, newDocument);
    }

    /**
     * Removes a document entry and refreshes its module and project ancestors in a single atomic swap.
     *
     * @param uri the document URI
     * @param scheme the scheme discriminator
     * @param updatedModule the refreshed module after removal
     */
    public void onDocumentRemove(DocumentUri uri, String scheme, Module updatedModule) {
        Objects.requireNonNull(updatedModule, "updatedModule must not be null");
        Project project = updatedModule.project();

        TrieNode<ResolvedEntry> snapshot = root.get();
        TrieNode<ResolvedEntry> updated = snapshot
                .remove(toSegments(uri.uri()), scheme, TargetType.DOCUMENT)
                .insert(toSegments(project.sourceRoot()), scheme, TargetType.PROJECT,
                        new ResolvedEntry.ProjectEntry(project))
                .insert(toSegments(modulePath(uri, project)), scheme, TargetType.MODULE,
                        new ResolvedEntry.ModuleEntry(updatedModule));
        root.set(updated);
    }

    /**
     * Registers a project root in a single atomic swap.
     *
     * @param projectRootUri the project root URI
     * @param scheme the scheme discriminator
     * @param project the project instance
     */
    public void onProjectCreate(DocumentUri projectRootUri, String scheme, Project project) {
        Objects.requireNonNull(projectRootUri, "projectRootUri must not be null");
        Objects.requireNonNull(project, "project must not be null");
        root.set(root.get().insert(toSegments(projectRootUri.uri()), scheme, TargetType.PROJECT,
                new ResolvedEntry.ProjectEntry(project)));
    }

    /**
     * Replaces a project's cached subtree with a fresh project root entry in a single atomic swap.
     *
     * @param projectRootUri the project root URI
     * @param scheme the scheme discriminator
     * @param newProject the refreshed project instance
     */
    public void onProjectUpdate(DocumentUri projectRootUri, String scheme, Project newProject) {
        Objects.requireNonNull(projectRootUri, "projectRootUri must not be null");
        Objects.requireNonNull(newProject, "newProject must not be null");

        TrieNode<ResolvedEntry> updated = root.get()
                .removeSubtree(toSegments(projectRootUri.uri()))
                .insert(toSegments(projectRootUri.uri()), scheme, TargetType.PROJECT,
                        new ResolvedEntry.ProjectEntry(newProject));
        root.set(updated);
    }

    /**
     * Removes every cached entry under the supplied project root.
     *
     * @param projectRootUri the project root URI
     */
    public void onProjectRemove(DocumentUri projectRootUri) {
        evictSubtree(projectRootUri);
    }

    /**
     * Updates a config entry and refreshes its project ancestor in a single atomic swap.
     *
     * @param uri the config URI
     * @param scheme the scheme discriminator
     * @param newConfig the new config instance
     */
    public void onConfigUpdate(DocumentUri uri, String scheme, TomlDocument newConfig) {
        Objects.requireNonNull(uri, "uri must not be null");
        Objects.requireNonNull(newConfig, "newConfig must not be null");
        Path projectRootPath = Path.of(uri.uri().getPath()).toAbsolutePath().normalize().getParent();
        Project project = resolveProjectForConfig(newConfig, scheme, projectRootPath)
                .orElseThrow(() -> new IllegalArgumentException("Cannot determine project for config URI: "
                        + uri.uri()));

        TrieNode<ResolvedEntry> updated = root.get()
                .insert(toSegments(project.sourceRoot()), scheme, TargetType.PROJECT,
                        new ResolvedEntry.ProjectEntry(project))
                .insert(toSegments(uri.uri()), scheme, TargetType.CONFIG,
                        new ResolvedEntry.ConfigEntry(newConfig, project));
        root.set(updated);
    }

    /**
     * Removes a config entry and refreshes its project ancestor in a single atomic swap.
     *
     * @param uri the config URI
     * @param scheme the scheme discriminator
     * @param updatedProject the refreshed project instance
     */
    public void onConfigRemove(DocumentUri uri, String scheme, Project updatedProject) {
        Objects.requireNonNull(uri, "uri must not be null");
        Objects.requireNonNull(updatedProject, "updatedProject must not be null");

        TrieNode<ResolvedEntry> updated = root.get()
                .remove(toSegments(uri.uri()), scheme, TargetType.CONFIG)
                .insert(toSegments(updatedProject.sourceRoot()), scheme, TargetType.PROJECT,
                        new ResolvedEntry.ProjectEntry(updatedProject));
        root.set(updated);
    }

    private void unregisterSchemeEntries(DocumentUri uri, String scheme) {
        TrieNode<ResolvedEntry> snapshot = root.get();
        String[] segments = toSegments(uri.uri());
        TrieNode<ResolvedEntry> updated = snapshot;
        for (TargetType targetType : RESOLUTION_ORDER) {
            updated = updated.remove(segments, scheme, targetType);
        }
        root.set(updated);
    }

    private Optional<ResolvedEntry> lookup(TrieNode<ResolvedEntry> snapshot, String[] segments,
                                           String scheme, TargetType targetType) {
        return snapshot.lookup(segments, scheme, targetType);
    }

    private Optional<Project> resolveProjectForConfig(TomlDocument config, String scheme, Path projectRootPath) {
        Optional<Project> reflected = projectFromConfigViaReflection(config);
        if (reflected.isPresent()) {
            return reflected;
        }
        if (projectRootPath == null) {
            return Optional.empty();
        }
        return root.get().lookup(toSegments(projectRootPath), scheme, TargetType.PROJECT)
                .filter(ResolvedEntry.ProjectEntry.class::isInstance)
                .map(ResolvedEntry.ProjectEntry.class::cast)
                .map(ResolvedEntry.ProjectEntry::project);
    }

    private Optional<Project> projectFromConfigViaReflection(TomlDocument config) {
        try {
            Method packageInstanceMethod = config.getClass().getMethod("packageInstance");
            Object packageInstance = packageInstanceMethod.invoke(config);
            Method projectMethod = packageInstance.getClass().getMethod("project");
            return Optional.of((Project) projectMethod.invoke(packageInstance));
        } catch (ReflectiveOperationException | ClassCastException ignored) {
            return Optional.empty();
        }
    }

    private static Path modulePath(DocumentUri documentUri, Project project) {
        Path sourceRoot = project.sourceRoot().toAbsolutePath().normalize();
        Path documentPath = Path.of(documentUri.uri().getPath()).toAbsolutePath().normalize();
        if (sourceRoot.equals(documentPath)) {
            return sourceRoot;
        }

        Path relativePath = sourceRoot.relativize(documentPath);
        if (relativePath.getNameCount() >= 3
                && ProjectConstants.MODULES_ROOT.equals(relativePath.getName(0).toString())) {
            return sourceRoot.resolve(relativePath.getName(0).toString())
                    .resolve(relativePath.getName(1).toString());
        }
        return sourceRoot;
    }

    /**
     * Extracts the normalized path string from a URI, stripping any trailing slash that
     * {@link java.nio.file.Path#toUri()} appends for directory paths.
     *
     * <p>Use this instead of {@link URI#toString()} or {@link URI#getPath()} when the result
     * will be compared against {@link Path#toString()} values (e.g., as index keys).
     *
     * @param uri the URI whose path component should be normalized
     * @return the path string with no trailing slash, as produced by {@link Path#toString()}
     */
    public static String pathOf(URI uri) {
        return Path.of(uri.getPath()).toString();
    }

    /**
     * Decomposes a URI's path into trie segments using {@link Path} for segment splitting.
     */
    private static String[] toSegments(URI uri) {
        return toSegments(Path.of(uri.getPath()));
    }

    /**
     * Decomposes an absolute {@link Path} into trie segments.
     */
    private static String[] toSegments(Path path) {
        int count = path.getNameCount();
        String[] segments = new String[count];
        for (int i = 0; i < count; i++) {
            segments[i] = path.getName(i).toString();
        }
        return segments;
    }
}
