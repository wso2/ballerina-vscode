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

package io.ballerina.flowmodelgenerator.core.utils;

import io.ballerina.centralconnector.CentralAPI;
import io.ballerina.centralconnector.response.ConnectorsResponse;
import io.ballerina.centralconnector.response.SymbolResponse;
import io.ballerina.modelgenerator.commons.SearchResult;
import org.ballerinalang.diagramutil.connector.models.connector.Connector;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;

/**
 * Centralizes all Ballerina Central API search operations. This class encapsulates the logic for searching connectors
 * and symbols from Ballerina Central, including over-fetching strategies, organization filtering, and response
 * conversion to {@link SearchResult}.
 *
 * @since 1.7.0
 */
public class CentralSearchUtil {

    private static final int OVERFETCH_FACTOR = 3;
    private static final int MAX_FETCH_ITERATIONS = 3;

    private final CentralAPI centralClient;

    public CentralSearchUtil(CentralAPI centralClient) {
        this.centralClient = centralClient;
    }

    /**
     * Searches connectors from Ballerina Central with over-fetching to compensate for post-filtering by allowed
     * organizations and blacklisted names. Returns null if the request fails or times out, allowing the caller to
     * fall back to the local database.
     *
     * @param query                  the search query string
     * @param limit                  the desired number of results
     * @param offset                 the pagination offset
     * @param allowedOrgs            the set of allowed organization names
     * @param blacklistedNamePatterns the set of blacklisted connector name patterns
     * @return a list of matching search results, or null if the request failed
     */
    public List<SearchResult> searchConnectors(String query, int limit, int offset, Set<String> allowedOrgs,
                                               Set<String> blacklistedNamePatterns) {
        try {
            List<SearchResult> filteredResults = new ArrayList<>();
            int fetchOffset = offset;
            int fetchLimit = limit * OVERFETCH_FACTOR;

            for (int iteration = 0; iteration < MAX_FETCH_ITERATIONS; iteration++) {
                Map<String, String> centralQueryMap = new HashMap<>();
                if (!query.isEmpty()) {
                    centralQueryMap.put("q", query);
                }
                centralQueryMap.put("limit", String.valueOf(fetchLimit));
                centralQueryMap.put("offset", String.valueOf(fetchOffset));
                ConnectorsResponse connectorsResponse = centralClient.connectors(centralQueryMap);

                if (connectorsResponse == null || connectorsResponse.connectors() == null) {
                    break;
                }

                for (Connector connector : connectorsResponse.connectors()) {
                    if (connector == null || connector.packageInfo == null) {
                        continue;
                    }
                    if (!allowedOrgs.contains(connector.packageInfo.getOrganization())) {
                        continue;
                    }
                    if (isBlacklisted(connector.name, blacklistedNamePatterns)) {
                        continue;
                    }
                    filteredResults.add(toSearchResult(connector, false));
                    if (filteredResults.size() >= limit) {
                        return filteredResults.subList(0, limit);
                    }
                }

                // Check if Central has more results
                if (connectorsResponse.count() <= fetchOffset + fetchLimit) {
                    break;
                }
                fetchOffset += fetchLimit;
            }

            return filteredResults;
        } catch (RuntimeException e) {
            // Failed to fetch connectors from Central, falling back to local database
            return null;
        }
    }

    /**
     * Searches connectors within the current organization from Ballerina Central.
     *
     * @param currentOrg the current organization name
     * @param query      the search query string
     * @param limit      the desired number of results
     * @param offset     the pagination offset
     * @return a list of matching search results from the organization
     */
    public List<SearchResult> searchConnectorsByOrganization(String currentOrg, String query, int limit, int offset) {
        List<SearchResult> organizationConnectors = new ArrayList<>();
        Map<String, String> queryMap = new HashMap<>();
        boolean success = false;
        if (centralClient.hasAuthorizedAccess()) {
            queryMap.put("user-packages", "true");
            success = true;
        }
        if (currentOrg != null && !currentOrg.isEmpty()) {
            queryMap.put("org", currentOrg);
            success = true;
        }
        if (success) {
            if (!query.isEmpty()) {
                queryMap.put("q", query);
            }
            queryMap.put("limit", String.valueOf(limit));
            queryMap.put("offset", String.valueOf(offset));
            ConnectorsResponse connectorsResponse = centralClient.connectors(queryMap);
            if (connectorsResponse != null && connectorsResponse.connectors() != null) {
                for (Connector connector : connectorsResponse.connectors()) {
                    if (connector == null || connector.packageInfo == null) {
                        continue;
                    }
                    organizationConnectors.add(toSearchResult(connector, true));
                }
            }
        }
        return organizationConnectors;
    }

    /**
     * Searches symbols within the current organization from Ballerina Central, filtered by symbol type.
     *
     * @param currentOrg       the current organization name
     * @param query            the search query string
     * @param limit            the desired number of results
     * @param offset           the pagination offset
     * @param symbolTypeFilter a predicate to filter symbols by their type
     * @return a list of matching search results from the organization
     */
    public List<SearchResult> searchSymbolsByOrganization(String currentOrg, String query, int limit, int offset,
                                                          Predicate<String> symbolTypeFilter) {
        List<SearchResult> organizationSymbols = new ArrayList<>();
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
                    if (symbolTypeFilter.test(symbol.symbolType())) {
                        organizationSymbols.add(toSearchResult(symbol));
                    }
                }
            }
        }
        return organizationSymbols;
    }

    private static SearchResult toSearchResult(Connector connector, boolean fromCurrentOrg) {
        SearchResult.Package packageInfo = new SearchResult.Package(
                connector.packageInfo.getOrganization(),
                connector.packageInfo.getName(),
                connector.moduleName,
                connector.packageInfo.getVersion()
        );
        return SearchResult.from(packageInfo, connector.name, connector.packageInfo.getSummary(), fromCurrentOrg);
    }

    private static SearchResult toSearchResult(SymbolResponse.Symbol symbol) {
        SearchResult.Package packageInfo = new SearchResult.Package(
                symbol.organization(),
                symbol.name(),
                symbol.name(),
                symbol.version()
        );
        return SearchResult.from(packageInfo, symbol.symbolName(), symbol.description(), true);
    }

    private static boolean isBlacklisted(String connectorName, Set<String> patterns) {
        return patterns.stream().anyMatch(connectorName::contains);
    }
}
