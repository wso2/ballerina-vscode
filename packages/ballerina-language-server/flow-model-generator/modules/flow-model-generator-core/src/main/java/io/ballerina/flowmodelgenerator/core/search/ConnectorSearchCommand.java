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

import com.google.gson.reflect.TypeToken;
import io.ballerina.centralconnector.CentralAPI;
import io.ballerina.centralconnector.RemoteCentral;
import io.ballerina.centralconnector.response.ConnectorsResponse;
import io.ballerina.compiler.api.ModuleID;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.flowmodelgenerator.core.LocalIndexCentral;
import io.ballerina.flowmodelgenerator.core.model.AvailableNode;
import io.ballerina.flowmodelgenerator.core.model.Category;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.Item;
import io.ballerina.flowmodelgenerator.core.model.Metadata;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.node.NewConnectionBuilder;
import io.ballerina.flowmodelgenerator.core.utils.ConnectorUtil;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.modelgenerator.commons.SearchResult;
import io.ballerina.projects.Module;
import io.ballerina.projects.PackageCompilation;
import io.ballerina.projects.Project;
import io.ballerina.tools.text.LineRange;
import org.ballerinalang.diagramutil.connector.models.connector.Connector;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Handles the search command for connectors.
 *
 * @since 1.0.0
 */
public class ConnectorSearchCommand extends SearchCommand {

    private static final String CONNECTORS_LANDING_JSON = "connectors_landing.json";
    private static final String AGENT_SUPPORT_CONNECTORS_JSON = "agent_support_connectors.json";
    private static final Type CONNECTION_CATEGORY_LIST_TYPE = new TypeToken<Map<String, List<String>>>() { }.getType();
    private static final Type AGENT_SUPPORT_CONNECTORS_LIST_TYPE = new TypeToken<Set<String>>() { }.getType();

    private static final Set<String> AGENT_SUPPORT_CONNECTORS = LocalIndexCentral.getInstance()
            .readJsonResource(AGENT_SUPPORT_CONNECTORS_JSON, AGENT_SUPPORT_CONNECTORS_LIST_TYPE);
    public static final String IS_AGENT_SUPPORT = "isAgentSupport";

    public ConnectorSearchCommand(Project project, LineRange position, Map<String, String> queryMap) {
        super(project, position, queryMap);
    }

    @Override
    protected List<Item> defaultView() {
        List<SearchResult> localConnectors = getLocalConnectors();
        Category.Builder localCategoryBuilder = rootBuilder.stepIn("Local", null, null);
        localConnectors.forEach(connection -> localCategoryBuilder.node(generateAvailableNode(connection, true)));

        Map<String, List<SearchResult>> categories = fetchPopularItems();
        for (Map.Entry<String, List<SearchResult>> entry : categories.entrySet()) {
            Category.Builder categoryBuilder = rootBuilder.stepIn(entry.getKey(), null, null);
            entry.getValue().forEach(searchResult -> categoryBuilder.node(generateAvailableNode(searchResult)));
        }

        return rootBuilder.build().items();
    }

    @Override
    protected List<Item> search() {
        List<SearchResult> searchResults = dbManager.searchConnectors(query, limit, offset);
        searchResults.forEach(searchResult -> rootBuilder.node(generateAvailableNode(searchResult)));
        return rootBuilder.build().items();
    }

    @Override
    protected List<Item> searchCurrentOrganization(String currentOrg) {
        List<SearchResult> organizationConnectors = new ArrayList<>();
        CentralAPI centralClient = RemoteCentral.getInstance();
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
                    SearchResult.Package packageInfo = new SearchResult.Package(
                            connector.packageInfo.getOrganization(),
                            connector.packageInfo.getName(),
                            connector.moduleName,
                            connector.packageInfo.getVersion()
                    );
                    SearchResult searchResult = SearchResult.from(packageInfo, connector.name,
                            connector.packageInfo.getSummary(), true);
                    organizationConnectors.add(searchResult);
                }
            }
            organizationConnectors.forEach(searchResult -> rootBuilder.node(generateAvailableNode(searchResult)));
        }
        return rootBuilder.build().items();
    }

    @Override
    protected Map<String, List<SearchResult>> fetchPopularItems() {
        Map<String, List<String>> categories = LocalIndexCentral.getInstance()
                .readJsonResource(CONNECTORS_LANDING_JSON, CONNECTION_CATEGORY_LIST_TYPE);

        Map<String, List<SearchResult>> defaultView = new LinkedHashMap<>();
        for (Map.Entry<String, List<String>> category : categories.entrySet()) {
            List<String> packageList = category.getValue();
            List<SearchResult> searchResults = dbManager.searchConnectorsByPackage(packageList, limit, offset);
            SearchResult.sortByPackageListOrder(searchResults, packageList);
            defaultView.put(category.getKey(), searchResults);
        }
        return defaultView;
    }

    private static AvailableNode generateAvailableNode(SearchResult searchResult) {
        return generateAvailableNode(searchResult, false);
    }

    private static AvailableNode generateAvailableNode(SearchResult searchResult, boolean isGenerated) {
        SearchResult.Package packageInfo = searchResult.packageInfo();
        Metadata metadata = new Metadata.Builder<>(null)
                .label(ConnectorUtil.getConnectorName(searchResult.name(), packageInfo.moduleName()))
                .description(searchResult.description())
                .icon(CommonUtils.generateIcon(packageInfo.org(), packageInfo.packageName(), packageInfo.version()))
                .addData(IS_AGENT_SUPPORT, AGENT_SUPPORT_CONNECTORS.contains(packageInfo.moduleName()))
                .build();
        Codedata codedata = new Codedata.Builder<>(null)
                .node(NodeKind.NEW_CONNECTION)
                .org(packageInfo.org())
                .module(packageInfo.moduleName())
                .packageName(packageInfo.packageName())
                .object(searchResult.name())
                .symbol(NewConnectionBuilder.INIT_SYMBOL)
                .version(packageInfo.version())
                .isGenerated(isGenerated)
                .build();
        return new AvailableNode(metadata, codedata, true);
    }

    private List<SearchResult> getLocalConnectors() {
        PackageCompilation compilation = PackageUtil.getCompilation(project);
        Iterable<Module> modules = project.currentPackage().modules();
        List<SearchResult> localConnections = new ArrayList<>();
        for (Module module : modules) {
            if (module.isDefaultModule()) {
                continue;
            }
            SemanticModel semanticModel = compilation.getSemanticModel(module.moduleId());
            List<Symbol> symbols = semanticModel.moduleSymbols();
            for (Symbol symbol : symbols) {
                if (symbol.kind() != SymbolKind.CLASS) {
                    continue;
                }
                ClassSymbol classSymbol = (ClassSymbol) symbol;
                if (!classSymbol.qualifiers().contains(Qualifier.CLIENT)) {
                    continue;
                }
                Optional<ModuleSymbol> optModule = symbol.getModule();
                if (optModule.isEmpty()) {
                    throw new IllegalStateException("Module cannot be found for the symbol: " + symbol.getName());
                }
                ModuleID id = optModule.get().id();
                String doc = "";
                if (classSymbol.documentation().isPresent()) {
                    doc = classSymbol.documentation().get().description().orElse("");
                }
                SearchResult searchResult = SearchResult.from(id.orgName(),
                        id.packageName(), id.moduleName().substring(id.packageName().length() + 1),
                        id.version(), classSymbol.getName().orElse(ConnectorUtil.CLIENT), doc);
                localConnections.add(searchResult);
            }
        }
        return localConnections;
    }
}
