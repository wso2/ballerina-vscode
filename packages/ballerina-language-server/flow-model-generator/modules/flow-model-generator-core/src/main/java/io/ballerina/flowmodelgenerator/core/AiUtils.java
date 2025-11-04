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

package io.ballerina.flowmodelgenerator.core;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.Documentation;
import io.ballerina.flowmodelgenerator.core.model.AvailableNode;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.Metadata;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.projects.DependenciesToml;
import io.ballerina.projects.Project;
import io.ballerina.projects.TomlDocument;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static io.ballerina.flowmodelgenerator.core.Constants.AI;
import static io.ballerina.flowmodelgenerator.core.Constants.Ai;
import static io.ballerina.flowmodelgenerator.core.Constants.BALLERINA;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.CHUNKER;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.CHUNKERS;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.CLASS_INIT;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.DATA_LOADER;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.DATA_LOADERS;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.EMBEDDING_PROVIDER;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.EMBEDDING_PROVIDERS;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.KNOWLEDGE_BASES;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.MODEL_PROVIDER;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.MODEL_PROVIDERS;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.VECTOR_STORE;
import static io.ballerina.flowmodelgenerator.core.model.NodeKind.VECTOR_STORES;

/**
 * Utility class for resolving Ballerina AI module versions, their dependent modules, and supported features.
 * <b>Note:</b> This mapping must be updated when new {@code ballerina/ai} versions
 * introduce additional features or dependencies.
 *
 * @since 1.2.0
 */
public class AiUtils {

    private static final Map<String, Set<NodeKind>> versionToFeatures = new HashMap<>();
    private static final Map<String, List<Module>> dependentModules = new HashMap<>();
    private static final Map<String, List<AvailableNode>> cachedModelProviderMap = new HashMap<>();
    private static final Map<String, List<AvailableNode>> cachedEmbeddingProviderMap = new HashMap<>();
    private static final Map<String, List<AvailableNode>> cachedVectorStoreMap = new HashMap<>();
    private static final Map<String, List<AvailableNode>> cachedChunkerMap = new HashMap<>();
    private static final Map<String, List<AvailableNode>> cachedDataLoaderMap = new HashMap<>();

    // Ensures that all dependent modules of the specified AI versions in the set are already cached
    private static final Set<String> cachedDependentModules = new HashSet<>();

    private static final String PACKAGE = "package";
    private static final String ORG = "org";
    private static final String NAME = "name";
    private static final String VERSION = "version";
    private static final String INIT_METHOD = "init";

    public static final String MEMORY_DEFAULT_VALUE = "10";

    static {
        versionToFeatures.put("1.0.0",
                Set.of(MODEL_PROVIDERS, EMBEDDING_PROVIDERS, VECTOR_STORES, KNOWLEDGE_BASES));
        versionToFeatures.put("1.3.0", Set.of(CHUNKERS, DATA_LOADERS));

        dependentModules.put("1.0.0", List.of(
                new Module("ballerinax", "ai.openai", "1.0.0"),
                new Module("ballerinax", "ai.azure", "1.0.0"),
                new Module("ballerinax", "ai.anthropic", "1.0.0"),
                new Module("ballerinax", "ai.deepseek", "1.0.0"),
                new Module("ballerinax", "ai.ollama", "1.0.0"),
                new Module("ballerinax", "ai.mistral", "1.0.0"),
                new Module("ballerinax", "ai.pinecone", "1.0.0")
        ));

        dependentModules.put("1.1.0", List.of(
                new Module("ballerinax", "ai.openai", "1.1.0"),
                new Module("ballerinax", "ai.anthropic", "1.0.1"),
                new Module("ballerinax", "ai.azure", "1.0.1"),
                new Module("ballerinax", "ai.deepseek", "1.0.1"),
                new Module("ballerinax", "ai.mistral", "1.0.1"),
                new Module("ballerinax", "ai.pinecone", "1.0.1"),
                new Module("ballerinax", "ai.ollama", "1.0.1"),

                new Module("ballerinax", "ai.azure", "1.1.0"),
                new Module("ballerinax", "ai.openai", "1.2.0"),
                new Module("ballerinax", "ai.anthropic", "1.1.0"),
                new Module("ballerinax", "ai.mistral", "1.1.0"),
                new Module("ballerinax", "ai.ollama", "1.1.0"),
                new Module("ballerinax", "ai.deepseek", "1.0.2"),

                new Module("ballerinax", "ai.openai", "1.2.1"),
                new Module("ballerinax", "ai.azure", "1.1.1"),
                new Module("ballerinax", "ai.anthropic", "1.1.1"),
                new Module("ballerinax", "ai.mistral", "1.1.1"),
                new Module("ballerinax", "ai.ollama", "1.1.1"),
                new Module("ballerinax", "ai.deepseek", "1.0.3"),

                new Module("ballerinax", "ai.devant", "1.0.0"),
                new Module("ballerinax", "ai.openai", "1.2.2")
        ));

        dependentModules.put("1.5.0", List.of(
                new Module("ballerinax", "ai.pinecone", "1.1.0"),
                new Module("ballerinax", "ai.milvus", "1.0.0"),
                new Module("ballerinax", "ai.pgvector", "1.0.0"),
                new Module("ballerinax", "ai.weaviate", "1.0.0")
        ));

        dependentModules.put("1.6.0", List.of(
                new Module("ballerinax", "ai.azure", "1.2.0")
        ));

        dependentModules.put("1.7.0", List.of(
                new Module("ballerinax", "ai.azure", "1.3.0")
        ));
    }

    /**
     * Copies a property value from one FlowNode to another.
     *
     * @param targetNode        the node to update
     * @param sourceNode        the node to copy from
     * @param targetPropertyKey the property key in the target node
     * @param sourcePropertyKey the property key in the source node
     */
    public static void copyPropertyValue(FlowNode targetNode, FlowNode sourceNode, String targetPropertyKey,
                                         String sourcePropertyKey) {
        Property targetProperty = targetNode.properties().get(targetPropertyKey);
        Optional<Property> sourceProperty = sourceNode.getProperty(sourcePropertyKey);

        if (targetProperty == null || sourceProperty.isEmpty() ||
                sourceProperty.get().value() == null) {
            return;
        }

        Property updatedProperty = createUpdatedProperty(targetProperty, sourceProperty.get().value());
        targetNode.properties().put(targetPropertyKey, updatedProperty);
    }

    /**
     * Creates an updated property with a new value while preserving metadata.
     *
     * @param <T>              the type of the new value
     * @param originalProperty the original property
     * @param newValue         the new value to set
     * @return the updated property
     */
    public static <T> Property createUpdatedProperty(Property originalProperty, T newValue) {
        if (originalProperty == null) {
            throw new IllegalArgumentException("Original property cannot be null");
        }

        Property.Builder<T> builder = new Property.Builder<T>(null)
                .type(Property.ValueType.valueOf(originalProperty.valueType()))
                .typeConstraint(originalProperty.valueTypeConstraint())
                .value(newValue);

        if (originalProperty.codedata() != null) {
            builder.codedata()
                    .kind(originalProperty.codedata().kind())
                    .originalName(originalProperty.codedata().originalName());
        }

        return builder.build();
    }

    /**
     * Adds a property to a NodeBuilder by copying all attributes from an existing property with an optional custom
     * value.
     *
     * @param nodeBuilder the node builder to add the property to
     * @param key         the property key
     * @param property    the existing property to copy from
     * @param customValue the custom value to use instead of the property's original value, or null to use original
     * @param isHidden    whether to mark the property as hidden
     */
    public static void addPropertyFromTemplate(NodeBuilder nodeBuilder, String key, Property property,
                                               String customValue, boolean isHidden) {
        if (nodeBuilder == null || key == null || property == null) {
            throw new IllegalArgumentException("NodeBuilder, key, and property cannot be null");
        }

        if (property.metadata() == null) {
            throw new IllegalArgumentException("Property metadata cannot be null");
        }

        Object valueToUse = customValue != null ? customValue : property.value();
        boolean hidden = isHidden || property.hidden();

        nodeBuilder.properties().custom()
                .metadata()
                    .label(property.metadata().label())
                    .description(property.metadata().description())
                    .stepOut()
                .type(Property.ValueType.valueOf(property.valueType()))
                .placeholder(property.placeholder())
                .value(valueToUse)
                .defaultValue(property.defaultValue())
                .typeConstraint(property.valueTypeConstraint())
                .imports(property.imports() != null ? property.imports().toString() : null)
                .optional(property.optional())
                .editable(property.editable())
                .advanced(property.advanced())
                .hidden(hidden)
                .modified(property.modified())
                .codedata()
                    .kind(property.codedata() != null ? property.codedata().kind() : "")
                    .stepOut()
                .stepOut()
                .addProperty(key);
    }

    /**
     * Adds a simple string property to a NodeBuilder with the specified configuration.
     *
     * @param nodeBuilder the node builder to add the property to
     * @param key         the property key
     * @param label       the property label
     * @param description the property description
     * @param placeholder the placeholder text
     * @param value       the property value
     */
    public static void addStringProperty(NodeBuilder nodeBuilder, String key, String label, String description,
                                         String placeholder, String value) {
        if (nodeBuilder == null || key == null) {
            throw new IllegalArgumentException("NodeBuilder and key cannot be null");
        }

        nodeBuilder.properties().custom()
                .metadata()
                    .label(label != null ? label : "")
                    .description(description != null ? description : "")
                    .stepOut()
                .value(value != null && !value.isEmpty() ? value : "")
                .defaultValue("")
                .type(Property.ValueType.STRING)
                .placeholder(placeholder != null ? placeholder : "")
                .optional(true)
                .editable()
                .codedata()
                    .kind("REQUIRED")
                    .stepOut()
                .stepOut()
                .addProperty(key);
    }

    /**
     * Creates a default template context for node builders with the specified codedata.
     *
     * @param sourceBuilder the source builder containing workspace and file information
     * @param codedata      the codedata to use for the template context
     * @return the created template context
     */
    public static NodeBuilder.TemplateContext createDefaultTemplateContext(SourceBuilder sourceBuilder,
                                                                           Codedata codedata) {
        if (sourceBuilder == null || codedata == null) {
            throw new IllegalArgumentException("SourceBuilder and codedata cannot be null");
        }

        if (sourceBuilder.flowNode == null || sourceBuilder.flowNode.codedata() == null ||
                sourceBuilder.flowNode.codedata().lineRange() == null) {
            throw new IllegalArgumentException("SourceBuilder must have valid flowNode with codedata and lineRange");
        }

        return new NodeBuilder.TemplateContext(
                sourceBuilder.workspaceManager,
                sourceBuilder.filePath,
                sourceBuilder.flowNode.codedata().lineRange().startLine(),
                codedata,
                null
        );
    }

    /**
     * Copies common properties from source FlowNode to target FlowNode, excluding variable and type properties. Only
     * copies properties that have non-null and non-empty values in the source node.
     *
     * @param targetNode the node to copy properties to
     * @param sourceNode the node to copy properties from
     */
    public static void copyCommonProperties(FlowNode targetNode, FlowNode sourceNode) {
        if (targetNode.properties() == null || sourceNode.properties() == null) {
            return;
        }

        for (Map.Entry<String, Property> targetPropertyEntry : targetNode.properties().entrySet()) {
            String propertyName = targetPropertyEntry.getKey();

            // Skip copying variable and type properties
            if (Property.VARIABLE_KEY.equals(propertyName) || Property.TYPE_KEY.equals(propertyName)) {
                continue;
            }

            Optional<Property> sourceProperty = sourceNode.getProperty(propertyName);

            // Only copy if source property exists and has a non-empty string value
            if (sourceProperty.isPresent()) {
                Property srcProp = sourceProperty.get();
                if (srcProp.value() != null && !srcProp.value().toString().isEmpty()) {
                    copyPropertyValue(targetNode, sourceNode, propertyName, propertyName);
                }
            }
        }
    }

    public record Module(String org, String name, String version) {
    }

    public static String getBallerinaAiModuleVersion(Project project) {
        return project.currentPackage().dependenciesToml().map(DependenciesToml::tomlDocument).map(TomlDocument::toml)
                .map(toml -> toml.getTables(PACKAGE)).orElse(List.of()).stream()
                .filter(pkg -> BALLERINA.equals(pkg.get(ORG).map(Object::toString).orElse(""))
                        && AI.equals(pkg.get(NAME).map(Object::toString).orElse("")))
                .findFirst().flatMap(aiPackage -> aiPackage.get(VERSION).map(Objects::toString))
                .orElse(null);
    }

    public static List<Module> getLatestCompatibleModules(String version) {
        Collection<List<Module>> candidateModules = (version == null)
                ? dependentModules.values()
                : dependentModules.entrySet().stream()
                .filter(entry -> compareSemver(version, entry.getKey()) >= 0)
                .map(Map.Entry::getValue)
                .toList();

        Map<String, Module> latestModules = candidateModules.stream()
                .flatMap(Collection::stream)
                .collect(Collectors.toMap(
                        module -> module.org + ":" + module.name,
                        module -> module,
                        (existing, candidate) ->
                                compareSemver(candidate.version, existing.version) >= 0 ? candidate : existing
                ));
        latestModules.put(AI, new Module(BALLERINA, AI, version));

        // If version is null, set all dependent module versions to null
        // so the latest compatible modules will be pulled
        return latestModules.values().stream()
                .map(module -> version == null ? new Module(module.org, module.name, null) : module)
                .toList();
    }

    public static Set<NodeKind> getSupportedFeatures(String version) {
        Stream<Set<NodeKind>> featureSets = (version == null) ? versionToFeatures.values().stream()
                : versionToFeatures.entrySet().stream()
                .filter(entry -> compareSemver(version, entry.getKey()) >= 0)
                .map(Map.Entry::getValue);
        return featureSets.flatMap(Collection::stream).collect(Collectors.toSet());
    }

    public static int compareSemver(String version1, String version2) {
        String[] parts1 = version1.split("\\.");
        String[] parts2 = version2.split("\\.");
        int length = Math.max(parts1.length, parts2.length);

        for (int i = 0; i < length; i++) {
            int num1 = i < parts1.length ? Integer.parseInt(parts1[i]) : 0;
            int num2 = i < parts2.length ? Integer.parseInt(parts2[i]) : 0;
            if (num1 != num2) {
                return Integer.compare(num1, num2);
            }
        }
        return 0;
    }

    public static List<AvailableNode> getModelProviders(Project project) {
        String aiModuleVersion = AiUtils.getBallerinaAiModuleVersion(project);
        if (!cachedModelProviderMap.containsKey(aiModuleVersion)) {
            buildAiComponentsCache(project);
        }
        return cachedModelProviderMap.get(aiModuleVersion);
    }

    public static List<AvailableNode> getEmbeddingProviders(Project project) {
        String aiModuleVersion = AiUtils.getBallerinaAiModuleVersion(project);
        if (!cachedEmbeddingProviderMap.containsKey(aiModuleVersion)) {
            buildAiComponentsCache(project);
        }
        return cachedEmbeddingProviderMap.get(aiModuleVersion);
    }

    public static List<AvailableNode> getVectorStores(Project project) {
        String aiModuleVersion = AiUtils.getBallerinaAiModuleVersion(project);
        if (!cachedVectorStoreMap.containsKey(aiModuleVersion)) {
            buildAiComponentsCache(project);
        }
        return cachedVectorStoreMap.get(aiModuleVersion);
    }

    public static List<AvailableNode> getChunkers(Project project) {
        String aiModuleVersion = AiUtils.getBallerinaAiModuleVersion(project);
        if (!cachedChunkerMap.containsKey(aiModuleVersion)) {
            buildAiComponentsCache(project);
        }
        return cachedChunkerMap.get(aiModuleVersion);
    }

    public static List<AvailableNode> getDataLoaders(Project project) {
        String aiModuleVersion = AiUtils.getBallerinaAiModuleVersion(project);
        if (!cachedDataLoaderMap.containsKey(aiModuleVersion)) {
            buildAiComponentsCache(project);
        }
        return cachedDataLoaderMap.get(aiModuleVersion);
    }

    private static void buildAiComponentsCache(Project project) {
        String aiModuleVersion = getBallerinaAiModuleVersion(project);
        if (cachedDependentModules.contains(aiModuleVersion)) {
            return;
        }
        List<AvailableNode> cachedModelProviders = new ArrayList<>();
        List<AvailableNode> cachedEmbeddingProviders = new ArrayList<>();
        List<AvailableNode> cachedVectorStores = new ArrayList<>();
        List<AvailableNode> cachedChunkers = new ArrayList<>();
        List<AvailableNode> cachedDataLoaders = new ArrayList<>();
        List<ModuleInfo> modules = AiUtils.getLatestCompatibleModules(aiModuleVersion).stream()
                .map(m -> new ModuleInfo(m.org(), m.name(), m.name(), m.version()))
                .toList();
        for (ModuleInfo module : modules) {
            // The following method call may take additional time if the module is not already available,
            // as it may need to pull the module first.
            Optional<SemanticModel> semanticModel;
            try {
                semanticModel = getSemanticModel(module);
            } catch (Exception e) {
                // Skip modules that fail to load due to dependency resolution or compilation issues
                continue;
            }
            if (semanticModel.isEmpty()) {
                continue;
            }
            Stream<ClassSymbol> classSymbols = semanticModel.get().moduleSymbols().stream()
                    .filter(ClassSymbol.class::isInstance).map(ClassSymbol.class::cast);

            for (var classSymbol : classSymbols.toList()) {
                if (isModelProviderClass(classSymbol)) {
                    AvailableNode node = buildAvailableNode(classSymbol, module, aiModuleVersion, MODEL_PROVIDER);
                    cachedModelProviders.add(node);
                } else if (isEmbeddingProviderClass(classSymbol)) {
                    AvailableNode node = buildAvailableNode(classSymbol, module, aiModuleVersion, EMBEDDING_PROVIDER);
                    cachedEmbeddingProviders.add(node);
                } else if (isVectorStoreClass(classSymbol)) {
                    AvailableNode node = buildAvailableNode(classSymbol, module, aiModuleVersion, VECTOR_STORE);
                    cachedVectorStores.add(node);
                } else if (isChunkerClass(classSymbol)) {
                    AvailableNode node = buildAvailableNode(classSymbol, module, aiModuleVersion, CHUNKER);
                    cachedChunkers.add(node);
                } else if (isDataLoaderClass(classSymbol)) {
                    AvailableNode node = buildAvailableNode(classSymbol, module, aiModuleVersion, DATA_LOADER);
                    cachedDataLoaders.add(node);
                }
            }
        }
        cachedModelProviderMap.put(aiModuleVersion, cachedModelProviders.stream()
                .sorted(Comparator.comparing(node -> node.codedata().module())).toList());
        cachedEmbeddingProviderMap.put(aiModuleVersion, cachedEmbeddingProviders.stream()
                .sorted(Comparator.comparing(node -> node.codedata().module())).toList());
        cachedVectorStoreMap.put(aiModuleVersion, cachedVectorStores.stream()
                .sorted(Comparator.comparing(node -> node.codedata().module())).toList());
        cachedChunkerMap.put(aiModuleVersion, cachedChunkers.stream()
                .sorted(Comparator.comparing(node -> node.codedata().module())).toList());
        cachedDataLoaderMap.put(aiModuleVersion, cachedDataLoaders.stream()
                .sorted(Comparator.comparing(node -> node.codedata().module())).toList());
        cachedDependentModules.add(aiModuleVersion);
    }

    private static Optional<SemanticModel> getSemanticModel(ModuleInfo module) {
        return module.version() == null ? PackageUtil.getSemanticModel(module.org(), module.moduleName())
                : PackageUtil.getSemanticModel(module);
    }

    private static boolean isModelProviderClass(ClassSymbol classSymbol) {
        return classSymbol.getName().isPresent()
                && classSymbol.typeInclusions().stream()
                .anyMatch(inclusion -> inclusion.nameEquals(Ai.MODEL_PROVIDER_TYPE_NAME));
    }

    private static boolean isEmbeddingProviderClass(ClassSymbol classSymbol) {
        return classSymbol.getName().isPresent()
                && classSymbol.typeInclusions().stream()
                .anyMatch(inclusion -> inclusion.nameEquals(Ai.EMBEDDING_PROVIDER_TYPE_NAME));
    }

    private static boolean isVectorStoreClass(ClassSymbol classSymbol) {
        return classSymbol.getName().isPresent()
                && classSymbol.typeInclusions().stream()
                .anyMatch(inclusion -> inclusion.nameEquals(Ai.VECTOR_STORE_TYPE_NAME));
    }

    private static boolean isChunkerClass(ClassSymbol classSymbol) {
        return classSymbol.getName().isPresent()
                && classSymbol.typeInclusions().stream()
                .anyMatch(inclusion -> inclusion.nameEquals(Ai.CHUNKER_TYPE_NAME));
    }

    private static boolean isDataLoaderClass(ClassSymbol classSymbol) {
        return classSymbol.getName().isPresent()
                && classSymbol.typeInclusions().stream()
                .anyMatch(inclusion -> inclusion.nameEquals(Ai.DATA_LOADER_TYPE_NAME));
    }

    private static AvailableNode buildAvailableNode(ClassSymbol classSymbol, ModuleInfo moduleInfo,
                                                    String aiModuleVersion, NodeKind kind) {
        String className = classSymbol.getName().orElse("");
        String label = buildLabel(moduleInfo.moduleName(), className);
        String description = classSymbol.documentation()
                .flatMap(Documentation::description)
                .orElse(getDefaultNodeLabel(kind, label.split(" ")[0]));

        Metadata metadata = new Metadata.Builder<>(null).label(label).description(description).build();
        Codedata.Builder<Object> codedataBuilder = new Codedata.Builder<>(null).version(moduleInfo.version())
                .packageName(moduleInfo.packageName()).module(moduleInfo.moduleName()).org(moduleInfo.org())
                .node(kind);

        switch (className) {
            case Ai.WSO2_MODEL_PROVIDER_NAME -> codedataBuilder.symbol(Ai.GET_DEFAULT_MODEL_PROVIDER_METHOD);
            case Ai.WSO2_EMBEDDING_PROVIDER_NAME -> codedataBuilder.symbol(Ai.GET_DEFAULT_EMBEDDING_PROVIDER_METHOD);
            default -> codedataBuilder.object(className).symbol(INIT_METHOD);
        }
        return new AvailableNode(metadata, codedataBuilder.build(), true);
    }

    private static String buildLabel(String moduleName, String className) {
        if (Ai.WSO2_MODEL_PROVIDER_NAME.equals(className)) {
            return "Default Model Provider (WSO2)";
        }
        if (Ai.WSO2_EMBEDDING_PROVIDER_NAME.equals(className)) {
            return "Default Embedding Provider (WSO2)";
        }

        String providerName = capitalizeFirstChar(moduleName.replaceAll("^ai|\\.", ""));
        String label = providerName + " " + className;
        if (className.contains("ModelProvider")) {
            label = providerName + " " + className.replace("ModelProvider", " Model Provider");
        } else if (className.contains("EmbeddingProvider")) {
            label = providerName + " " + className.replace("EmbeddingProvider", " Embedding Provider");
        } else if (className.contains("VectorStore")) {
            label = providerName + " " + className.replace("VectorStore", " Vector Store");
        } else if (className.contains("Chunker")) {
            label = providerName + " " + className.replace("Chunker", " Chunker");
        } else if (className.contains("DataLoader")) {
            label = providerName + " " + className.replace("DataLoader", " Data Loader");
        }

        return label.replaceAll("(?i)openai", "OpenAI")
                .replace("GenericRecursive", "Generic Recursive")
                .replaceAll("^\\s+", "").replaceAll("\\s+", " ");
    }

    private static String capitalizeFirstChar(String word) {
        if (word == null || word.isEmpty()) {
            return word;
        }
        return Character.toUpperCase(word.charAt(0)) + word.substring(1);
    }

    private static String getDefaultNodeLabel(NodeKind kind, String providerName) {
        return switch (kind) {
            case MODEL_PROVIDER -> "Provides an interface to interact with " + providerName + " LLMs.";
            case EMBEDDING_PROVIDER -> "Provides an interface to interact with " + providerName + " embedding models.";
            case VECTOR_STORE -> "Vector store implementation to connect with " + providerName + " vector database.";
            case CHUNKER -> "Splits the provided document.";
            case DATA_LOADER -> "Loads documents from specified data source.";
            default -> null;
        };
    }

    public static Codedata getDefaultModelProviderCodedata(String orgName) {
        return new Codedata.Builder<>(null)
                .node(Objects.equals(orgName, BALLERINA) ? MODEL_PROVIDER : CLASS_INIT)
                .org(orgName)
                .module(AI)
                .packageName(AI)
                .object(Objects.equals(orgName, BALLERINA) ? null : Ai.OPEN_AI_PROVIDER)
                .symbol(Objects.equals(orgName, BALLERINA) ? Ai.GET_DEFAULT_MODEL_PROVIDER_METHOD : INIT_METHOD)
                .build();
    }

    public static Codedata getDefaultAgentCodedata(String orgName) {
        return new Codedata.Builder<>(null)
                .node(NodeKind.AGENT)
                .object(Ai.AGENT_TYPE_NAME)
                .org(orgName)
                .module(AI)
                .packageName(AI)
                .symbol(Ai.AGENT_SYMBOL_NAME)
                .build();
    }

    /**
     * Replaces backticks in a string with an expression that works in string template.
     *
     * @param input the string that may contain backticks
     * @return the string with backticks replaced by ${"`"} for safe use in string templates
     */
    public static String replaceBackticksForStringTemplate(String input) {
        if (input == null) {
            return "";
        }
        return input.replace("`", "${\"`\"}");
    }

    /**
     * Reverts template string interpolation expressions back to backticks.
     *
     * @param input the string that may contain ${"`"} expressions
     * @return the string with ${"`"} expressions replaced by backticks
     */
    public static String restoreBackticksFromStringTemplate(String input) {
        if (input == null) {
            return "";
        }
        return input.replace("${\"`\"}", "`");
    }
}
