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
import io.ballerina.compiler.api.symbols.Documentation;
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
import io.ballerina.projects.Project;
import io.ballerina.tools.text.LineRange;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

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
                if (symbol instanceof TypeDefinitionSymbol typeDefinitionSymbol) {
                    if (typeDefinitionSymbol.getName().isEmpty()) {
                        continue;
                    }
                    String typeName = typeDefinitionSymbol.getName().get();
                    Documentation documentation = typeDefinitionSymbol.documentation()
                            .orElse(null);
                    String description = documentation != null ? documentation.description().orElse("") : "";


                    // Calculate the relevance score, and filter out types with score 0 (no match)
                    int score = RelevanceCalculator.calculateFuzzyRelevanceScore(typeName, description, query);
                    if (score > 0) {
                        scoredTypes.add(new ScoredType(typeDefinitionSymbol, typeName, description, score));
                    }
                }
            }

            // Sort by score in descending order (highest score first)
            scoredTypes.sort(Comparator.comparingInt(ScoredType::getScore).reversed());

            // Build nodes from sorted list
            for (ScoredType scoredType : scoredTypes) {
                Metadata metadata = new Metadata.Builder<>(null)
                        .label(scoredType.getTypeName())
                        .description(scoredType.getDescription())
                        .build();

                Codedata codedata = new Codedata.Builder<>(null)
                        .org(orgName)
                        .module(moduleName)
                        .packageName(packageName)
                        .symbol(scoredType.getTypeName())
                        .version(version)
                        .build();

                moduleBuilder.stepIn(moduleName, "", List.of())
                        .node(new AvailableNode(metadata, codedata, true));
            }
        }
    }

    /**
     * Helper class to store type symbols along with their relevance scores for ranking.
     */
    private static class ScoredType {
        private final TypeDefinitionSymbol symbol;
        private final String typeName;
        private final String description;
        private final int score;

        ScoredType(TypeDefinitionSymbol symbol, String typeName, String description, int score) {
            this.symbol = symbol;
            this.typeName = typeName;
            this.description = description;
            this.score = score;
        }

        TypeDefinitionSymbol getSymbol() {
            return symbol;
        }

        String getTypeName() {
            return typeName;
        }

        String getDescription() {
            return description;
        }

        int getScore() {
            return score;
        }
    }


}
