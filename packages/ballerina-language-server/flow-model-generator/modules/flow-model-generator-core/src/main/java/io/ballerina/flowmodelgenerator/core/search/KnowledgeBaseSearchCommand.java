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

import io.ballerina.flowmodelgenerator.core.AiUtils;
import io.ballerina.flowmodelgenerator.core.model.AvailableNode;
import io.ballerina.flowmodelgenerator.core.model.Category;
import io.ballerina.flowmodelgenerator.core.model.Item;
import io.ballerina.modelgenerator.commons.SearchResult;
import io.ballerina.projects.Project;
import io.ballerina.tools.text.LineRange;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Handles the search command for knowledge bases.
 *
 * @since 1.3.0
 */
public class KnowledgeBaseSearchCommand extends SearchCommand {

    private static final String KNOWLEDGE_BASE_LABEL = "Knowledge Bases";

    public KnowledgeBaseSearchCommand(Project project, LineRange position, Map<String, String> queryMap) {
        super(project, position, queryMap);
    }

    @Override
    protected List<Item> defaultView() {
        List<AvailableNode> knowledgeBases = AiUtils.getKnowledgeBases(project);
        Category category = new Category.Builder(null).metadata().label(KNOWLEDGE_BASE_LABEL)
                .stepOut().items(List.copyOf(knowledgeBases)).build();
        return List.of(category);
    }

    @Override
    protected List<Item> search() {
        List<AvailableNode> knowledgeBases = AiUtils.getKnowledgeBases(project);
        List<Item> matchingBases = knowledgeBases.stream()
                .filter(node -> AiUtils.matchesQuery(node, query))
                .collect(Collectors.toList());

        Category category = new Category.Builder(null).metadata().label(KNOWLEDGE_BASE_LABEL)
                .stepOut().items(matchingBases).build();
        return List.of(category);
    }

    @Override
    protected Map<String, List<SearchResult>> fetchPopularItems() {
        return Collections.emptyMap();
    }
}
