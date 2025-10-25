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
import java.util.Locale;
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

                    // Calculate fuzzy relevance score
                    int score = calculateFuzzyRelevanceScore(typeName, description, query);

                    // Filter out types with score 0 (no match)
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

    /**
     * Calculates the Levenshtein distance between two strings.
     * This is the minimum number of single-character edits (insertions, deletions, or substitutions)
     * required to change one string into the other.
     *
     * @param s1 First string
     * @param s2 Second string
     * @return The edit distance between the two strings
     */
    private int levenshteinDistance(String s1, String s2) {
        int len1 = s1.length();
        int len2 = s2.length();

        // Create a matrix to store distances
        int[][] dp = new int[len1 + 1][len2 + 1];

        // Initialize first column (distance from empty string)
        for (int i = 0; i <= len1; i++) {
            dp[i][0] = i;
        }

        // Initialize first row (distance from empty string)
        for (int j = 0; j <= len2; j++) {
            dp[0][j] = j;
        }

        // Fill the matrix
        for (int i = 1; i <= len1; i++) {
            for (int j = 1; j <= len2; j++) {
                int cost = (s1.charAt(i - 1) == s2.charAt(j - 1)) ? 0 : 1;

                dp[i][j] = Math.min(
                        Math.min(
                                dp[i - 1][j] + 1,      // deletion
                                dp[i][j - 1] + 1       // insertion
                        ),
                        dp[i - 1][j - 1] + cost        // substitution
                );
            }
        }

        return dp[len1][len2];
    }

    /**
     * Calculates a fuzzy match relevance score for a type based on its name and description.
     * Higher scores indicate better matches. The algorithm combines multiple matching strategies:
     * 1. Exact matching (highest priority)
     * 2. Prefix matching (high priority)
     * 3. Substring matching (medium priority)
     * 4. Fuzzy matching using Levenshtein distance (lower priority)
     * 5. Description matching (bonus points)
     *
     * TypeName matching is weighted higher than description matching.
     *
     * @param typeName    The name of the type to score
     * @param description The description of the type (can be null or empty)
     * @param query       The search query to match against
     * @return A relevance score (0 = no match, higher = better match)
     */
    private int calculateFuzzyRelevanceScore(String typeName, String description, String query) {
        if (query == null || query.isEmpty()) {
            return 1;  // No query means everything matches with minimal score
        }

        String lowerTypeName = typeName.toLowerCase(Locale.ROOT);
        String lowerQuery = query.toLowerCase(Locale.ROOT);
        String lowerDescription = (description != null && !description.isEmpty())
                ? description.toLowerCase(Locale.ROOT)
                : "";

        int score = 0;

        // --- TYPE NAME MATCHING (Weighted Higher) ---

        // 1. Exact match (highest priority)
        if (lowerTypeName.equals(lowerQuery)) {
            score += 10000;
        }
        // 2. Starts with query (prefix match - high priority)
        else if (lowerTypeName.startsWith(lowerQuery)) {
            score += 5000;
        }
        // 3. Contains query (substring match - medium priority)
        else {
            int nameIndex = lowerTypeName.indexOf(lowerQuery);
            if (nameIndex >= 0) {
                // Earlier matches score higher
                // Score range: 1000 to 999 (assuming names < 1000 chars)
                score += Math.max(1, 1000 - nameIndex);
            } else {
                // 4. Fuzzy matching using Levenshtein distance
                int distance = levenshteinDistance(lowerTypeName, lowerQuery);
                int maxLen = Math.max(lowerTypeName.length(), lowerQuery.length());

                // Only consider fuzzy matches if distance is reasonable (< 50% of max length)
                if (distance <= maxLen / 2) {
                    // Score range: 500 to 1 (higher similarity = higher score)
                    int fuzzyScore = 500 * (maxLen - distance) / maxLen;
                    score += fuzzyScore;
                }

                // Also check if query is an abbreviation (matches first letters)
                if (matchesAbbreviation(lowerTypeName, lowerQuery)) {
                    score += 300;
                }
            }
        }

        // --- DESCRIPTION MATCHING (Bonus Points - Lower Weight) ---
        if (!lowerDescription.isEmpty() && lowerDescription.contains(lowerQuery)) {
            // Description match adds bonus points
            score += 200;

            // Extra bonus if description starts with query
            if (lowerDescription.startsWith(lowerQuery)) {
                score += 100;
            }
        }

        return score;
    }

    /**
     * Checks if the query could be an abbreviation of the type name.
     * For example, "HC" could match "HttpClient", "AC" could match "ApplicationConfig".
     *
     * @param typeName The type name to check against
     * @param query    The potential abbreviation
     * @return true if query matches the first letters of words in typeName
     */
    private boolean matchesAbbreviation(String typeName, String query) {
        if (query.length() > typeName.length()) {
            return false;
        }

        int queryIndex = 0;
        boolean lastWasUpper = true;  // Start of string counts as word boundary

        for (int i = 0; i < typeName.length() && queryIndex < query.length(); i++) {
            char typeChar = typeName.charAt(i);
            boolean isUpper = Character.isUpperCase(typeChar);

            // Check if this is the start of a new word (uppercase after lowercase, or first char)
            if (isUpper && !lastWasUpper) {
                if (Character.toLowerCase(typeChar) == query.charAt(queryIndex)) {
                    queryIndex++;
                }
            } else if (i == 0 && Character.toLowerCase(typeChar) == query.charAt(queryIndex)) {
                // First character match
                queryIndex++;
            }

            lastWasUpper = isUpper;
        }

        return queryIndex == query.length();
    }
}
