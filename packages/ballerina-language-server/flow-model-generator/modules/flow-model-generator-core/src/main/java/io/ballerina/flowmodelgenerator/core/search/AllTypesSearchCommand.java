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

import io.ballerina.flowmodelgenerator.core.model.AvailableNode;
import io.ballerina.flowmodelgenerator.core.model.Category;
import io.ballerina.flowmodelgenerator.core.model.Item;
import io.ballerina.modelgenerator.commons.SearchResult;
import io.ballerina.projects.Document;
import io.ballerina.projects.Project;
import io.ballerina.tools.text.LineRange;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * Search command implementation that searches across all available search types and aggregates results.
 * This provides a unified search experience by executing multiple search commands in parallel and
 * combining their results with intelligent ranking and deduplication.
 *
 * @since 1.0.0
 */
public class AllTypesSearchCommand extends SearchCommand {

    private final Document functionsDoc;
    private final ExecutorService executorService;

    private static final List<Kind> SEARCH_TYPES = List.of(
            Kind.FUNCTION,
            Kind.CONNECTOR,
            Kind.TYPE,
            Kind.NP_FUNCTION,
            Kind.MODEL_PROVIDER,
            Kind.EMBEDDING_PROVIDER,
            Kind.VECTOR_STORE,
            Kind.DATA_LOADER,
            Kind.CHUNKER,
            Kind.AGENT,
            Kind.CLASS_INIT,
            Kind.MEMORY,
            Kind.MEMORY_STORE,
            Kind.AGENT_TOOL,
            Kind.KNOWLEDGE_BASE
    );

    public AllTypesSearchCommand(Project project, LineRange position, Map<String, String> queryMap,
                                 Document functionsDoc) {
        super(project, position, queryMap);
        this.functionsDoc = functionsDoc;
        this.executorService = Executors.newCachedThreadPool();
    }

    @Override
    protected List<Item> defaultView() {
        return executeSearchAcrossAllTypes(true);
    }

    @Override
    protected List<Item> search() {
        return executeSearchAcrossAllTypes(false);
    }

    @Override
    protected Map<String, List<SearchResult>> fetchPopularItems() {
        Map<String, List<SearchResult>> popularItems = new HashMap<>();

        for (Kind searchType : SEARCH_TYPES) {
            try {
                SearchCommand command = createSearchCommand(searchType);
                Map<String, List<SearchResult>> typePopularItems = command.fetchPopularItems();
                popularItems.putAll(typePopularItems);
            } catch (Exception e) {
                // Log error and continue with other search types
                // TODO: Replace with proper logging
            }
        }

        return popularItems;
    }

    @Override
    protected List<Item> searchCurrentOrganization(String currentOrg) {
        List<CompletableFuture<List<Item>>> futures = new ArrayList<>();

        for (Kind searchType : SEARCH_TYPES) {
            CompletableFuture<List<Item>> future = CompletableFuture.supplyAsync(() -> {
                try {
                    SearchCommand command = createSearchCommand(searchType);
                    return command.searchCurrentOrganization(currentOrg);
                } catch (UnsupportedOperationException e) {
                    // Some search types might not support organization search
                    return Collections.emptyList();
                } catch (Exception e) {
                    // Log error and return empty list for this search type
                    // TODO: Replace with proper logging
                    return Collections.emptyList();
                }
            }, executorService);
            futures.add(future);
        }

        return aggregateResults(futures);
    }

    /**
     * Executes search across all search types either for default view or search query.
     *
     * @param isDefaultView true if this is for default view, false for search query
     * @return aggregated and ranked list of items
     */
    private List<Item> executeSearchAcrossAllTypes(boolean isDefaultView) {
        List<CompletableFuture<List<Item>>> futures = new ArrayList<>();

        for (Kind searchType : SEARCH_TYPES) {
            CompletableFuture<List<Item>> future = CompletableFuture.supplyAsync(() -> {
                try {
                    SearchCommand command = createSearchCommand(searchType);
                    return isDefaultView ? command.defaultView() : command.search();
                } catch (Exception e) {
                    // Log error and return empty list for this search type
                    // TODO: Replace with proper logging
                    return Collections.emptyList();
                }
            }, executorService);
            futures.add(future);
        }

        return aggregateResults(futures);
    }

    /**
     * Creates a search command instance for the specified search type.
     *
     * @param searchType the type of search command to create
     * @return the search command instance
     */
    private SearchCommand createSearchCommand(Kind searchType) {
        return switch (searchType) {
            case FUNCTION -> new FunctionSearchCommand(project, position, getQueryMapForType(searchType), functionsDoc);
            case CONNECTOR -> new ConnectorSearchCommand(project, position, getQueryMapForType(searchType));
            case NP_FUNCTION -> new NPFunctionSearchCommand(project, position, getQueryMapForType(searchType), functionsDoc);
            case TYPE -> new TypeSearchCommand(project, position, getQueryMapForType(searchType));
            case MODEL_PROVIDER -> new ModelProviderSearchCommand(project, position, getQueryMapForType(searchType));
            case EMBEDDING_PROVIDER -> new EmbeddingProviderSearchCommand(project, position, getQueryMapForType(searchType));
            case VECTOR_STORE -> new VectorStoreSearchCommand(project, position, getQueryMapForType(searchType));
            case DATA_LOADER -> new DataLoaderSearchCommand(project, position, getQueryMapForType(searchType));
            case CHUNKER -> new ChunkerSearchCommand(project, position, getQueryMapForType(searchType));
            case AGENT -> new AgentSearchCommand(project, position, getQueryMapForType(searchType));
            case CLASS_INIT -> new ClassInitSearchCommand(project, position, getQueryMapForType(searchType));
            case MEMORY -> new MemoryManagerSearchCommand(project, position, getQueryMapForType(searchType));
            case MEMORY_STORE -> new MemoryStoreSearchCommand(project, position, getQueryMapForType(searchType));
            case AGENT_TOOL -> new AgentToolSearchCommand(project, position, getQueryMapForType(searchType));
            case KNOWLEDGE_BASE -> new KnowledgeBaseSearchCommand(project, position, getQueryMapForType(searchType));
            default -> throw new IllegalArgumentException("Unsupported search type: " + searchType);
        };
    }

    /**
     * Creates a query map for a specific search type, potentially customizing parameters.
     *
     * @param searchType the search type
     * @return the query map for this search type
     */
    private Map<String, String> getQueryMapForType(Kind searchType) {
        Map<String, String> typeQueryMap = new HashMap<>();

        // Copy all original query parameters
        typeQueryMap.put("q", query);
        typeQueryMap.put("limit", String.valueOf(Math.max(5, limit / SEARCH_TYPES.size())));
        typeQueryMap.put("offset", String.valueOf(offset));

        return typeQueryMap;
    }

    /**
     * Aggregates results from all search futures, applies deduplication and ranking.
     *
     * @param futures list of futures containing search results
     * @return aggregated and ranked list of items
     */
    private List<Item> aggregateResults(List<CompletableFuture<List<Item>>> futures) {
        List<Item> allItems = new ArrayList<>();

        // Wait for all futures to complete and collect results
        for (CompletableFuture<List<Item>> future : futures) {
            try {
                List<Item> items = future.get();
                if (items != null) {
                    allItems.addAll(items);
                }
            } catch (Exception e) {
                // Log error and continue with other results
                // TODO: Replace with proper logging
            }
        }

        // Apply deduplication based on item properties
        List<Item> deduplicatedItems = deduplicateItems(allItems);

        // Apply ranking and limit results
        return rankAndLimitResults(deduplicatedItems);
    }

    /**
     * Removes duplicate items based on their key properties.
     *
     * @param items list of items to deduplicate
     * @return deduplicated list of items
     */
    private List<Item> deduplicateItems(List<Item> items) {
        Map<String, Item> uniqueItems = new HashMap<>();

        for (Item item : items) {
            String key = generateItemKey(item);
            if (!uniqueItems.containsKey(key)) {
                uniqueItems.put(key, item);
            }
        }

        return new ArrayList<>(uniqueItems.values());
    }

    /**
     * Generates a unique key for an item based on its properties.
     *
     * @param item the item to generate a key for
     * @return unique key string
     */
    private String generateItemKey(Item item) {
        if (item instanceof AvailableNode availableNode) {
            if (availableNode.codedata() != null && availableNode.codedata().node() != null) {
                String symbol = availableNode.codedata().symbol() != null ?
                    availableNode.codedata().symbol() : "";
                String kind = availableNode.codedata().node().toString();
                return symbol + ":" + kind;
            }
        }

        if (item instanceof Category category) {
            return "category:" + (category.metadata() != null ? category.metadata().label() : "unknown");
        }

        return item.getClass().getSimpleName() + ":" + System.identityHashCode(item);
    }

    /**
     * Ranks items based on relevance and applies limit/offset.
     *
     * @param items list of items to rank
     * @return ranked and limited list of items
     */
    private List<Item> rankAndLimitResults(List<Item> items) {
        // Sort by relevance (you can implement more sophisticated ranking here)
        List<Item> sortedItems = items.stream()
                .sorted(Comparator.comparing((Item item) -> calculateRelevanceScore(item)).reversed())
                .collect(Collectors.toList());

        // Apply offset and limit
        int startIndex = Math.min(offset, sortedItems.size());
        int endIndex = Math.min(startIndex + limit, sortedItems.size());

        return sortedItems.subList(startIndex, endIndex);
    }

    /**
     * Calculates a relevance score for an item based on the search query.
     *
     * @param item the item to score
     * @return relevance score (higher is more relevant)
     */
    private double calculateRelevanceScore(Item item) {
        if (query == null || query.isEmpty()) {
            return 1.0; // All items are equally relevant for default view
        }

        double score = 0.0;
        String queryLower = query.toLowerCase(java.util.Locale.ROOT);

        // Score based on different item types
        if (item instanceof AvailableNode availableNode) {
            if (availableNode.metadata() != null && availableNode.metadata().label() != null) {
                String labelLower = availableNode.metadata().label().toLowerCase();
                if (labelLower.equals(queryLower)) {
                    score += 100.0; // Exact match
                } else if (labelLower.startsWith(queryLower)) {
                    score += 50.0; // Starts with query
                } else if (labelLower.contains(queryLower)) {
                    score += 25.0; // Contains query
                }
            }

            if (availableNode.metadata() != null && availableNode.metadata().description() != null) {
                String descLower = availableNode.metadata().description().toLowerCase();
                if (descLower.contains(queryLower)) {
                    score += 10.0; // Description contains query
                }
            }

            // Score based on symbol match
            if (availableNode.codedata() != null && availableNode.codedata().symbol() != null) {
                String symbolLower = availableNode.codedata().symbol().toLowerCase();
                if (symbolLower.contains(queryLower)) {
                    score += 15.0; // Symbol contains query
                }
            }
        } else if (item instanceof Category category) {
            if (category.metadata() != null && category.metadata().label() != null) {
                String labelLower = category.metadata().label().toLowerCase();
                if (labelLower.contains(queryLower)) {
                    score += 20.0; // Category label contains query
                }
            }
        }

        return score;
    }
}