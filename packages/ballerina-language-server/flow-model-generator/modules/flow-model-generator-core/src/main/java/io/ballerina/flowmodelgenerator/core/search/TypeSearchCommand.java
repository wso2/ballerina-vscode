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

package io.ballerina.flowmodelgenerator.core.search;

import io.ballerina.centralconnector.CentralAPI;
import io.ballerina.centralconnector.RemoteCentral;
import io.ballerina.centralconnector.response.SymbolResponse;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.Documentable;
import io.ballerina.compiler.api.symbols.Documentation;
import io.ballerina.compiler.api.symbols.EnumSymbol;
import io.ballerina.compiler.api.symbols.Qualifiable;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.flowmodelgenerator.core.model.AvailableNode;
import io.ballerina.flowmodelgenerator.core.model.Category;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.Item;
import io.ballerina.flowmodelgenerator.core.model.Metadata;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.modelgenerator.commons.SearchResult;
import io.ballerina.projects.Module;
import io.ballerina.projects.ModuleName;
import io.ballerina.projects.Package;
import io.ballerina.projects.PackageName;
import io.ballerina.projects.Project;
import io.ballerina.projects.directory.BuildProject;
import io.ballerina.projects.directory.WorkspaceProject;
import io.ballerina.tools.text.LineRange;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Represents a command to search for types within a module. This class extends SearchCommand and provides functionality
 * to search for both project-specific and library types.
 *
 * <p>
 * The search includes:
 * <li>Types within the current project/module </li>
 * <li>Imported types from dependencies</li>
 * <li>Available types from the standard library (if enabled)</li>
 *
 * <p>The search results are organized into different categories:</p>
 * <li>CURRENT_INTEGRATION: Types from the current project</li>
 * <li>IMPORTED_TYPES: Types from imported modules</li>
 * <li>AVAILABLE_TYPES: Types available but not imported (optional)</li>
 * </p>
 *
 * @see SearchCommand
 * @since 1.0.0
 */
class TypeSearchCommand extends SearchCommand {

    public static final String CURRENT_INTEGRATION_INDICATOR = " (current)";
    private final List<String> moduleNames;

    public TypeSearchCommand(Project project, LineRange position, Map<String, String> queryMap) {
        super(project, position, queryMap);

        // Obtain the imported project names
        Package currentPackage = project.currentPackage();
        PackageUtil.getCompilation(currentPackage);
        moduleNames = currentPackage.getDefaultModule().moduleDependencies().stream()
                .map(moduleDependency -> {
                    ModuleName name = moduleDependency.descriptor().name();
                    if (Objects.nonNull(name.moduleNamePart()) && !name.moduleNamePart().isEmpty()) {
                        return name.packageName().value() + "." + name.moduleNamePart();
                    }
                    return name.packageName().value();
                })
                .toList();
    }

    @Override
    protected List<Item> defaultView() {
        buildWorkspaceNodes();
        List<SearchResult> searchResults = new ArrayList<>();
        if (!moduleNames.isEmpty()) {
            searchResults.addAll(dbManager.searchTypesByPackages(moduleNames, limit, offset));
        }

        buildLibraryNodes(searchResults);
        buildImportedLocalModules();
        return rootBuilder.build().items();
    }

    @Override
    protected List<Item> search() {
        buildWorkspaceNodes();
        List<SearchResult> typeSearchList = dbManager.searchTypes(query, limit, offset);
        buildLibraryNodes(typeSearchList);
        buildImportedLocalModules();
        return rootBuilder.build().items();
    }

    @Override
    protected Map<String, List<SearchResult>> fetchPopularItems() {
        return Collections.emptyMap();
    }

    /**
     * Search types/records in the given organization via Central and add them to the result categories.
     */
    @Override
    protected List<Item> searchCurrentOrganization(String currentOrg) {
        List<SearchResult> organizationTypes = new ArrayList<>();
        CentralAPI centralClient = RemoteCentral.getInstance();
        Map<String, String> queryMap = new HashMap<>();
        boolean success = false;
        // TODO: Enable once https://github.com/ballerina-platform/ballerina-central/issues/284 is resolved
//        if (centralClient.hasAuthorizedAccess()) {
//            queryMap.put("user-packages", "true");
//            success = true;
//        }
        if (currentOrg != null && !currentOrg.isEmpty()) {
            String orgQuery = "org:" + currentOrg;
            queryMap.put("q", query.isEmpty() ? orgQuery : query + " " + orgQuery);
            success = true;
        }
        if (success) {
            queryMap.put("limit", String.valueOf(limit));
            queryMap.put("offset", String.valueOf(offset));
            SymbolResponse symbolResponse = centralClient.searchSymbols(queryMap);
            if (symbolResponse != null && symbolResponse.symbols() != null) {
                for (SymbolResponse.Symbol symbol : symbolResponse.symbols()) {
                    // Consider records and other type-like symbols
                    if ("record".equals(symbol.symbolType()) || symbol.symbolType().contains("type")) {
                        SearchResult.Package packageInfo = new SearchResult.Package(
                                symbol.organization(),
                                symbol.name(),
                                symbol.name(),
                                symbol.version()
                        );
                        SearchResult searchResult = SearchResult.from(
                                packageInfo,
                                symbol.symbolName(),
                                symbol.description(),
                                true
                        );
                        organizationTypes.add(searchResult);
                    }
                }
            }
            buildLibraryNodes(organizationTypes);
        }
        return rootBuilder.build().items();
    }

    private List<Symbol> getTypes(Project project) {
        Package currentPackage = project.currentPackage();
        return PackageUtil.getCompilation(currentPackage)
                .getSemanticModel(currentPackage.getDefaultModule().moduleId())
                .moduleSymbols().stream()
                .filter(symbol -> symbol instanceof TypeDefinitionSymbol || symbol instanceof ClassSymbol)
                .toList();
    }

    private void buildWorkspaceNodes() {
        Optional<WorkspaceProject> workspaceProject = project.workspaceProject();
        if (workspaceProject.isEmpty()) {
            Category.Builder projectBuilder = rootBuilder.stepIn(Category.Name.CURRENT_INTEGRATION);
            buildProjectNodes(project, projectBuilder);
            return;
        }

        PackageName currProjPackageName = this.project.currentPackage().packageName();

        Category.Builder workspaceBuilder = rootBuilder.stepIn(Category.Name.CURRENT_WORKSPACE);

        // Build current integration first to ensure it appears at the top
        Category.Builder currIntProjBuilder = workspaceBuilder.stepIn(
                currProjPackageName.value() + CURRENT_INTEGRATION_INDICATOR, "", List.of());
        buildProjectNodes(this.project, currIntProjBuilder);

        List<BuildProject> projects = workspaceProject.get().projects();
        for (BuildProject project : projects) {
            PackageName packageName = project.currentPackage().packageName();
            if (packageName.equals(currProjPackageName)) {
                continue;
            }

            Category.Builder projectBuilder = workspaceBuilder.stepIn(packageName.value(), "", List.of());
            buildProjectNodes(project, projectBuilder);
        }
    }

    private void buildProjectNodes(Project project, Category.Builder projectBuilder) {
        List<Symbol> types = getTypes(project);

        boolean isCurrIntProject = this.project.currentPackage().packageName()
                .equals(project.currentPackage().packageName());

        List<Symbol> filteredTypes;
        if (!isCurrIntProject) {
            filteredTypes = types.stream()
                    .filter(type -> type instanceof Qualifiable q
                            && q.qualifiers().contains(Qualifier.PUBLIC))
                    .toList();
        } else {
            filteredTypes = types;
        }

        List<ScoredType> scoredTypes = new ArrayList<>();
        for (Symbol typeSymbol : filteredTypes) {
            if (typeSymbol.getName().isEmpty()) {
                continue;
            }
            String typeName = typeSymbol.getName().get();
            String description = "";
            if (typeSymbol instanceof Documentable documentable) {
                Documentation documentation = documentable.documentation().orElse(null);
                description = documentation != null ? documentation.description().orElse("") : "";
            }

            int score = RelevanceCalculator.calculateFuzzyRelevanceScore(typeName, description, query);
            if (score > 0) {
                scoredTypes.add(new ScoredType(typeSymbol, typeName, description, score));
            }
        }

        scoredTypes.sort(Comparator.comparingInt(ScoredType::score).reversed());

        String orgName = project.currentPackage().packageOrg().toString();
        String packageName = project.currentPackage().packageName().toString();
        String version = project.currentPackage().packageVersion().toString();

        List<Item> availableNodes = new ArrayList<>();
        for (ScoredType scoredType : scoredTypes) {
            Metadata metadata = new Metadata.Builder<>(null)
                    .label(scoredType.typeName())
                    .description(scoredType.description())
                    .build();

            Codedata codedata = new Codedata.Builder<>(null)
                    .node(NodeKind.TYPEDESC)
                    .org(orgName)
                    .module(packageName)
                    .packageName(packageName)
                    .symbol(scoredType.typeName())
                    .version(version)
                    .build();

            availableNodes.add(new AvailableNode(metadata, codedata, true));
        }

        projectBuilder.items(availableNodes);
    }

    private void buildLibraryNodes(List<SearchResult> typeSearchList) {
        // Set the categories based on available flags
        Category.Builder importedTypesBuilder = rootBuilder.stepIn(Category.Name.IMPORTED_TYPES);
        Category.Builder availableTypesBuilder = rootBuilder.stepIn(Category.Name.STANDARD_LIBRARY);

        // Add the library types
        for (SearchResult searchResult : typeSearchList) {
            SearchResult.Package packageInfo = searchResult.packageInfo();

            // Add the type to the respective category
            String icon = CommonUtils.generateIcon(packageInfo.org(), packageInfo.packageName(), packageInfo.version());
            Metadata metadata = new Metadata.Builder<>(null)
                    .label(searchResult.name())
                    .description(searchResult.description())
                    .icon(icon)
                    .build();
            Codedata codedata = new Codedata.Builder<>(null)
                    .node(NodeKind.TYPEDESC)
                    .org(packageInfo.org())
                    .module(packageInfo.moduleName())
                    .packageName(packageInfo.packageName())
                    .symbol(searchResult.name())
                    .version(packageInfo.version())
                    .build();
            Category.Builder builder;
            if (moduleNames.contains(packageInfo.moduleName())) {
                builder = importedTypesBuilder;
            } else {
                builder = availableTypesBuilder;
            }
            if (builder != null) {
                builder.stepIn(packageInfo.moduleName(), "", List.of())
                        .node(new AvailableNode(metadata, codedata, true));
            }
        }
    }

     private void buildImportedLocalModules() {
        Iterable<Module> modules = project.currentPackage().modules();
        for (Module module : modules) {
            if (module.isDefaultModule()) {
                continue;
            }
            SemanticModel semanticModel = PackageUtil.getCompilation(module.packageInstance())
                    .getSemanticModel(module.moduleId());
            if (semanticModel == null) {
                continue;
            }
            List<Symbol> symbols = semanticModel.moduleSymbols();
            String moduleName = module.moduleName().toString();
            Category.Builder moduleBuilder = rootBuilder.stepIn(Category.Name.IMPORTED_TYPES);
            String orgName = module.packageInstance().packageOrg().toString();
            String packageName = module.packageInstance().packageName().toString();
            String version = module.packageInstance().packageVersion().toString();

            // Collect all types with their scores for ranking
            List<ScoredType> scoredTypes = new ArrayList<>();

            for (Symbol symbol : symbols) {
                if (symbol instanceof TypeDefinitionSymbol || symbol instanceof ClassSymbol) {
                    if (symbol.getName().isEmpty()) {
                        continue;
                    }
                    String typeName = symbol.getName().get();
                    String description = "";
                    Documentable documentable = (Documentable) symbol;
                    Documentation documentation = documentable.documentation().orElse(null);
                    description = documentation != null ? documentation.description().orElse("") : "";

                    // Calculate the relevance score, and filter out types with score 0 (no match)
                    int score = RelevanceCalculator.calculateFuzzyRelevanceScore(typeName, description, query);
                    if (score > 0) {
                        scoredTypes.add(new ScoredType(symbol, typeName, description, score));
                    }
                }
            }

            // Sort by score in descending order (highest score first)
            scoredTypes.sort(Comparator.comparingInt(ScoredType::score).reversed());

            // Build nodes from sorted list
            for (ScoredType scoredType : scoredTypes) {
                Metadata metadata = new Metadata.Builder<>(null)
                        .label(scoredType.typeName())
                        .description(scoredType.description())
                        .build();

                Codedata codedata = new Codedata.Builder<>(null)
                        .org(orgName)
                        .module(moduleName)
                        .packageName(packageName)
                        .symbol(scoredType.typeName())
                        .version(version)
                        .build();

                moduleBuilder.stepIn(moduleName, "", List.of())
                        .node(new AvailableNode(metadata, codedata, true));
            }
        }
    }

        /**
         * Helper record to store type definition and class symbols along with their relevance scores for ranking.
         */
        private record ScoredType(Symbol symbol, String typeName, String description, int score) {
    }


}
