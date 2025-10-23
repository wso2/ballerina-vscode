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

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import io.ballerina.flowmodelgenerator.core.LocalIndexCentral;
import io.ballerina.flowmodelgenerator.core.model.AvailableNode;
import io.ballerina.flowmodelgenerator.core.model.Category;
import io.ballerina.flowmodelgenerator.core.model.Item;
import io.ballerina.modelgenerator.commons.SearchResult;
import io.ballerina.projects.Project;
import io.ballerina.tools.text.LineRange;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Handles the search command for memory stores.
 *
 * @since 1.3.0
 */
public class MemoryStoreSearchCommand extends SearchCommand {

    private static final Gson GSON = new Gson();
    private List<Item> cachedMemoryStores;

    public MemoryStoreSearchCommand(Project project, LineRange position, Map<String, String> queryMap) {
        super(project, position, queryMap);
    }

    @Override
    protected List<Item> defaultView() {
        return getMemoryStores();
    }

    @Override
    protected List<Item> search() {
        List<Item> memoryStores = getMemoryStores();
        if (memoryStores.isEmpty() || !(memoryStores.getFirst() instanceof Category memoryStoreCategory)) {
            return memoryStores;
        }

        List<Item> stores = memoryStoreCategory.items();

        List<Item> matchingStores = stores.stream()
                .filter(item -> item instanceof AvailableNode availableNode &&
                        (query == null || availableNode.metadata().label().toLowerCase(Locale.ROOT)
                                .contains(query.toLowerCase(Locale.ROOT))))
                .toList();

        stores.clear();
        stores.addAll(matchingStores);

        return List.of(memoryStoreCategory);
    }

    @Override
    protected Map<String, List<SearchResult>> fetchPopularItems() {
        return Collections.emptyMap();
    }

    @Override
    public JsonArray execute() {
        List<Item> items = (query.isEmpty()) ? defaultView() : search();
        return GSON.toJsonTree(items).getAsJsonArray();
    }

    private List<Item> getMemoryStores() {
        if (cachedMemoryStores == null) {
            cachedMemoryStores = List.copyOf(LocalIndexCentral.getInstance().getMemoryStores());
        }
        return cachedMemoryStores;
    }
}
