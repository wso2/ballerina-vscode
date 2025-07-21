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

package io.ballerina.projectservice.core.baltool;

import io.ballerina.projects.BalToolsManifest;
import io.ballerina.projects.BalToolsToml;
import io.ballerina.projects.JvmTarget;
import io.ballerina.projects.PackageVersion;
import io.ballerina.projects.ProjectException;
import io.ballerina.projects.SemanticVersion;
import io.ballerina.projects.util.CustomURLClassLoader;
import io.ballerina.projects.util.ProjectConstants;
import io.ballerina.projects.util.ProjectUtils;
import org.wso2.ballerinalang.util.RepoUtils;

import java.io.File;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import static io.ballerina.projects.util.ProjectConstants.BALA_DIR_NAME;
import static io.ballerina.projects.util.ProjectConstants.BAL_TOOLS_TOML;
import static io.ballerina.projects.util.ProjectConstants.CENTRAL_REPOSITORY_CACHE_NAME;
import static io.ballerina.projects.util.ProjectConstants.CONFIG_DIR;
import static io.ballerina.projects.util.ProjectConstants.REPOSITORIES_DIR;

/**
 * This class contains utility functions needed for Bal Tool tasks in the Main class.
 *
 * @since 1.2.0
 */
public final class BalToolsUtil {

    private static final String TOOL = "tool";
    private static final String LIBS = "libs";

    private static final String VERSION_OPTION = "--version";
    private static final String HELP_OPTION = "--help";
    private static final String DEBUG_OPTION = "--debug";
    private static final String VERSION_SHORT_OPTION = "-v";
    private static final String HELP_SHORT_OPTION = "-h";

    private static final String BUILD_COMMAND = "build";
    private static final String RUN_COMMAND = "run";
    private static final String DOC_COMMAND = "doc";
    private static final String TEST_COMMAND = "test";
    private static final String INIT_COMMAND = "init";
    private static final String NEW_COMMAND = "new";
    private static final String ADD_COMMAND = "add";
    private static final String PULL_COMMAND = "pull";
    private static final String PUSH_COMMAND = "push";
    private static final String SEARCH_COMMAND = "search";
    private static final String CLEAN_COMMAND = "clean";
    private static final String FORMAT_COMMAND = "format";
    private static final String GRPC_COMMAND = "grpc";
    private static final String GRAPHQL_COMMAND = "graphql";
    private static final String OPENAPI_COMMAND = "openapi";
    private static final String ASYNCAPI_COMMAND = "asyncapi";
    private static final String PERSIST_COMMAND = "persist";
    private static final String VERSION_COMMAND = "version";
    private static final String BINDGEN_COMMAND = "bindgen";
    private static final String SHELL_COMMAND = "shell";
    private static final String PACK_COMMAND = "pack";
    private static final String GRAPH_COMMAND = "graph";
    private static final String DEPRECATE_COMMAND = "deprecate";
    private static final String SEMVER_COMMAND = "semver";
    private static final String DIST_COMMAND = "dist";
    private static final String UPDATE_COMMAND = "update";
    private static final String PROFILE_COMMAND = "profile";
    private static final String START_LANG_SERVER_COMMAND = "start-language-server";
    private static final String LANG_SERVER_SPEC = "language-server-spec";
    private static final String START_DEBUG_ADAPTER_COMMAND =  "start-debugger-adapter";
    private static final String HELP_COMMAND = "help";
    private static final String HOME_COMMAND = "home";
    private static final String GENCACHE_COMMAND = "gencache";
    private static final String TOOL_COMMAND = "tool";

    private static final String ANY_PLATFORM = "any";


    private static final List<String> options = Arrays.asList(VERSION_OPTION, VERSION_SHORT_OPTION, HELP_OPTION,
            HELP_SHORT_OPTION, DEBUG_OPTION);
    private static final List<String> coreCommands = Arrays.asList(
            BUILD_COMMAND, RUN_COMMAND, TEST_COMMAND, DOC_COMMAND, PACK_COMMAND);
    private static final List<String> packageCommands = Arrays.asList(NEW_COMMAND, ADD_COMMAND, PULL_COMMAND,
            PUSH_COMMAND, SEARCH_COMMAND, SEMVER_COMMAND, GRAPH_COMMAND, DEPRECATE_COMMAND);
    // if a command is a built-in tool command, remove it from this list
    private static final List<String> otherCommands = Arrays.asList(CLEAN_COMMAND, FORMAT_COMMAND, BINDGEN_COMMAND,
            SHELL_COMMAND, VERSION_COMMAND, OPENAPI_COMMAND, GRAPHQL_COMMAND, ASYNCAPI_COMMAND, GRPC_COMMAND,
            PERSIST_COMMAND, PROFILE_COMMAND);
    private static final List<String> hiddenCommands = Arrays.asList(INIT_COMMAND, TOOL_COMMAND, DIST_COMMAND,
            UPDATE_COMMAND, START_LANG_SERVER_COMMAND, LANG_SERVER_SPEC, START_DEBUG_ADAPTER_COMMAND, HELP_COMMAND,
            HOME_COMMAND, GENCACHE_COMMAND);
    // if a command is a built-in tool command, add it to this list
    private static final List<String> builtInToolCommands = List.of();

    private static final Path balToolsTomlPath = RepoUtils.createAndGetHomeReposPath().resolve(
            Path.of(CONFIG_DIR, BAL_TOOLS_TOML));
    private static final Path balaCacheDirPath = ProjectUtils.createAndGetHomeReposPath()
            .resolve(REPOSITORIES_DIR).resolve(CENTRAL_REPOSITORY_CACHE_NAME)
            .resolve(ProjectConstants.BALA_DIR_NAME);

    private BalToolsUtil() {
    }

    public static boolean isNonBuiltInToolCommand(String commandName) {
        return isToolCommand(commandName) && !builtInToolCommands.contains(commandName);
    }

    public static boolean isToolCommand(String commandName) {
        return Stream.of(options, coreCommands, packageCommands, otherCommands, hiddenCommands)
                .flatMap(List::stream).noneMatch(commandName::equals);
    }

    public static URLClassLoader getCustomToolClassLoader(String commandName) {
        List<File> toolJars = getToolCommandJarAndDependencyJars(commandName);
        URL[] urls = toolJars.stream()
                .map(file -> {
                    try {
                        return file.toURI().toURL();
                    } catch (MalformedURLException e) {
                        throw new RuntimeException("invalid tool jar: " + file.getAbsolutePath(), e);
                    }
                })
                .toArray(URL[]::new);
        // Combine custom class loader with system class loader
        ClassLoader systemClassLoader = ClassLoader.getSystemClassLoader();
        return new URLClassLoader(urls, systemClassLoader);
    }

    private static List<File> getToolCommandJarAndDependencyJars(String commandName) {
        Path userHomeDirPath = RepoUtils.createAndGetHomeReposPath();
        Path balToolsTomlPath = userHomeDirPath.resolve(Path.of(CONFIG_DIR, BAL_TOOLS_TOML));
        Path centralBalaDirPath = userHomeDirPath.resolve(
                Path.of(REPOSITORIES_DIR, CENTRAL_REPOSITORY_CACHE_NAME, BALA_DIR_NAME));
        Path localBalaDirPath = userHomeDirPath.resolve(
                Path.of(REPOSITORIES_DIR, ProjectConstants.LOCAL_REPOSITORY_NAME, BALA_DIR_NAME));
        BalToolsToml balToolsToml = BalToolsToml.from(balToolsTomlPath);
        BalToolsManifest balToolsManifest = BalToolsManifestBuilder.from(balToolsToml).build();

        Optional<BalToolsManifest.Tool> toolOpt = balToolsManifest.getActiveTool(commandName);
        if (toolOpt.isPresent()) {
            BalToolsManifest.Tool tool = toolOpt.get();
            Path platformPath = getPlatformSpecificBalaPath(
                    tool.org(), tool.name(), tool.version(), ProjectConstants.LOCAL_REPOSITORY_NAME
                            .equals(tool.repository()) ? localBalaDirPath : centralBalaDirPath);
            File libsDir = platformPath.resolve(Path.of(TOOL, LIBS)).toFile();
            return findJarFiles(libsDir);
        }
        throw new RuntimeException("unknown command '" + commandName + "'. ");
    }
    /**
     * Find jar files in the given directory.
     *
     * @param directory directory to search for jar files
     * @return list of jar files
     */
    public static List<File> findJarFiles(File directory) {
        List<File> jarFiles = new ArrayList<>();
        if (directory.isDirectory()) {
            File[] files = directory.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.isFile() && file.getName().toLowerCase().endsWith(".jar")) {
                        jarFiles.add(file);
                    }
                }
            }
        }
        return jarFiles;
    }

    /**
     * Update the bal-tools.toml file with the version and the active flags.
     * bal-tools.tomls of updates 6, 7  only has id, name and org fields. Therefore, we need to update the
     * bal-tools.toml file when the user moves from updates 6, 7 to update 8 and above.
     */
    public static void updateOldBalToolsToml() {
        BalToolsToml balToolsToml = BalToolsToml.from(balToolsTomlPath);
        BalToolsManifestBuilder balToolsManifestBuilder = BalToolsManifestBuilder.from(balToolsToml);
        BalToolsManifest balToolsManifest = balToolsManifestBuilder.build();
        Map<String, BalToolsManifestBuilder.OldTool> oldTools = balToolsManifestBuilder.getOldTools();
        if (oldTools.isEmpty()) {
            return;
        }
        oldTools.values().stream().forEach(tool -> {
            Path toolCachePath = balaCacheDirPath.resolve(Path.of(tool.org(), tool.name()));
            if (toolCachePath.toFile().isDirectory()) {
                List<String> versions = Arrays.stream(toolCachePath.toFile().listFiles((dir, name) -> {
                    try {
                        PackageVersion.from(name);
                        return true;
                    } catch (ProjectException ignore) {
                        return false;
                    }
                })).map(File::getName).toList();

                Optional<String> latestVersion = getLatestVersion(versions);
                versions.stream().forEach(version -> {
                    // If there is no current active version in balToolsManifest, we set the latest version in the
                    // central cache as active. This is because in U6, U7, the latest is automatically picked as active.
                    boolean isActive = balToolsManifest.getActiveTool(tool.id()).isEmpty()
                            && latestVersion.isPresent()
                            && latestVersion.get().equals(version);
                    if (balToolsManifest.getTool(tool.id(), version, null).isEmpty()) {
                        balToolsManifest.addTool(tool.id(), tool.org(), tool.name(), version, isActive, null);
                    }
                });
            }
        });
        balToolsToml.modify(balToolsManifest);
    }

    private static Optional<String> getLatestVersion(List<String> versions) {
        return versions.stream().map(SemanticVersion::from)
                .max((v1, v2) -> {
                    if (v1.greaterThan(v2)) {
                        return 1;
                    } else if (v2.greaterThan(v1)) {
                        return -1;
                    } else {
                        return 0;
                    }
                })
                .map(SemanticVersion::toString);
    }

    public static Path getPlatformSpecificBalaPath(String orgName, String pkgName, String version,
                                                   Path balaCache) {
        Path balaPath = balaCache.resolve(
                ProjectUtils.getRelativeBalaPath(orgName, pkgName, version, null));
        //First we will check for a bala that match any platform
        String platform = ANY_PLATFORM;
        if (!Files.exists(balaPath)) {
            for (JvmTarget supportedPlatform : JvmTarget.values()) {
                balaPath = balaCache.resolve(
                        ProjectUtils.getRelativeBalaPath(orgName, pkgName, version, supportedPlatform.code()));
                if (Files.exists(balaPath)) {
                    platform = supportedPlatform.code();
                    break;
                }
            }
        }
        return balaPath;
    }
}
