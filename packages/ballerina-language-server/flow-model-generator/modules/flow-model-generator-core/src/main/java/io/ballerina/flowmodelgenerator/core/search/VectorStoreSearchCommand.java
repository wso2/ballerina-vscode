package io.ballerina.flowmodelgenerator.core.search;

import io.ballerina.flowmodelgenerator.core.LocalIndexCentral;
import io.ballerina.flowmodelgenerator.core.model.AvailableNode;
import io.ballerina.flowmodelgenerator.core.model.Category;
import io.ballerina.flowmodelgenerator.core.model.Item;
import io.ballerina.modelgenerator.commons.SearchResult;
import io.ballerina.projects.Project;
import io.ballerina.tools.text.LineRange;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Handles the search command for vector stores.
 *
 * @since 1.0.0
 */
public class VectorStoreSearchCommand extends SearchCommand {
    private List<Item> cachedVectorStores;

    public VectorStoreSearchCommand(Project project, LineRange position, Map<String, String> queryMap) {
        super(project, position, queryMap);
    }

    @Override
    protected List<Item> defaultView() {
        return getVectorStores();
    }

    @Override
    protected List<Item> search() {
        List<Item> vectorStores = getVectorStores();
        if (vectorStores.isEmpty()) {
            return vectorStores;
        }

        Category vectorStoreCategory = (Category) vectorStores.getFirst();
        List<Item> stores = vectorStoreCategory.items();

        List<Item> matchingStores = stores.stream()
                .filter(item -> item instanceof AvailableNode availableNode &&
                        availableNode.codedata().module().contains(query))
                .toList();

        stores.removeAll(matchingStores);
        stores.addAll(matchingStores);

        return List.of(vectorStoreCategory);
    }

    @Override
    protected Map<String, List<SearchResult>> fetchPopularItems() {
        return Collections.emptyMap();
    }

    private List<Item> getVectorStores() {
        if (cachedVectorStores == null) {
            cachedVectorStores = List.copyOf(LocalIndexCentral.getInstance().getVectorStores());
        }
        return cachedVectorStores;
    }
}
