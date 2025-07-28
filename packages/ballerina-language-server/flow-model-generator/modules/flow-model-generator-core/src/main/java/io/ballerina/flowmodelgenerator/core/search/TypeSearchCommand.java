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
import io.ballerina.flowmodelgenerator.core.model.AvailableNode;
import io.ballerina.flowmodelgenerator.core.model.Category;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.Item;
import io.ballerina.flowmodelgenerator.core.model.Metadata;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.modelgenerator.commons.SearchResult;
import io.ballerina.projects.Package;
import io.ballerina.projects.Project;
import io.ballerina.tools.text.LineRange;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    private final List<String> moduleNames;

    public TypeSearchCommand(Project project, LineRange position, Map<String, String> queryMap) {
        super(project, position, queryMap);

        // Obtain the imported project names
        Package currentPackage = project.currentPackage();
        PackageUtil.getCompilation(currentPackage);
        moduleNames = currentPackage.getDefaultModule().moduleDependencies().stream()
                .map(moduleDependency -> moduleDependency.descriptor().name().packageName().value())
                .toList();
    }

    @Override
    protected List<Item> defaultView() {
        List<SearchResult> searchResults = new ArrayList<>();
        if (!moduleNames.isEmpty()) {
            searchResults.addAll(dbManager.searchTypesByPackages(moduleNames, limit, offset));
        }
        
        // Add organization types to default view if any exist
        List<SearchResult> organizationTypes = getOrganizationTypes("");
        searchResults.addAll(organizationTypes);
        
        buildLibraryNodes(searchResults);
        return rootBuilder.build().items();
    }

    @Override
    protected List<Item> search() {
        List<SearchResult> typeSearchList = dbManager.searchTypes(query, limit, offset);
        
        // Get organization types (searchCentral flag is checked inside the method)
        List<SearchResult> organizationTypes = getOrganizationTypes(query);
        typeSearchList.addAll(organizationTypes);
        
        buildLibraryNodes(typeSearchList);
        return rootBuilder.build().items();
    }

    /**
     * Fetches types from the current organization using Ballerina Central.
     *
     * @param searchQuery The search query to use (empty string for default view)
     * @return List of SearchResult containing organization types
     */
    private List<SearchResult> getOrganizationTypes(String searchQuery) {
        List<SearchResult> organizationTypes = new ArrayList<>();
        
        // Only fetch from central if searchCentral is enabled and organization name is present
        if (!searchCentral) {
            return organizationTypes;
        }
        
        Optional<String> organizationName = getOrganizationName();
        if (organizationName.isPresent()) {
            CentralAPI centralClient = RemoteCentral.getInstance();
            Map<String, String> queryMap = new HashMap<>();
            String orgQuery = "org:" + organizationName.get();
            queryMap.put("q", searchQuery.isEmpty() ? orgQuery : searchQuery + " " + orgQuery);
            queryMap.put("limit", String.valueOf(limit));
            queryMap.put("offset", String.valueOf(offset));
            SymbolResponse symbolResponse = centralClient.searchSymbols(queryMap);
            if (symbolResponse != null && symbolResponse.symbols() != null) {
                for (SymbolResponse.Symbol symbol : symbolResponse.symbols()) {
                    if (symbol.symbolType().equals("record") || symbol.symbolType().contains("type")) {
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
        }
        return organizationTypes;
    }

    @Override
    protected Map<String, List<SearchResult>> fetchPopularItems() {
        // Return empty value as required
        return Collections.emptyMap();
    }

    private void buildLibraryNodes(List<SearchResult> typeSearchList) {
        // Set the categories based on available flags
        Category.Builder importedTypesBuilder = rootBuilder.stepIn(Category.Name.IMPORTED_TYPES);
        Category.Builder currentOrgTypesBuilder = rootBuilder.stepIn(Category.Name.CURRENT_ORGANIZATION);
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
            } else if (searchResult.fromCurrentOrg()) {
                builder = currentOrgTypesBuilder;
            } else {
                builder = availableTypesBuilder;
            }
            if (builder != null) {
                builder.stepIn(packageInfo.moduleName(), "", List.of())
                        .node(new AvailableNode(metadata, codedata, true));
            }
        }
    }
}