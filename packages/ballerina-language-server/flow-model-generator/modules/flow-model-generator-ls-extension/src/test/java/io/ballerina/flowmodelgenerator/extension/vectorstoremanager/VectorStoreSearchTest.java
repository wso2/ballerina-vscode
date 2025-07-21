package io.ballerina.flowmodelgenerator.extension.vectorstoremanager;

import com.google.gson.JsonObject;
import io.ballerina.flowmodelgenerator.extension.request.SearchRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

public class VectorStoreSearchTest extends AbstractLSTest {
    private static final String VECTOR_STORE = "VECTOR_STORE";

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("vector_stores.json")},
                {Path.of("vector_stores_search_pinecone.json")}
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);
        String filePath = sourceDir.resolve(testConfig.source()).toAbsolutePath().toString();
        Map<String, String> queryMap = getQueryMap(testConfig);
        SearchRequest searchRequest = new SearchRequest(VECTOR_STORE, filePath, null, queryMap);
        JsonObject searchResult = getResponse(searchRequest);
        if (!searchResult.equals(testConfig.expectedVectorStores())) {
            TestConfig updatedConfig = new TestConfig(testConfig.source(), testConfig.query(), searchResult);
            // updateConfig(configJsonPath, updatedConfig);
            Assert.fail("Test failed. Updated the expected output in " + configJsonPath);
        }
    }

    private static Map<String, String> getQueryMap(TestConfig testConfig) {
        Map<String, String> queryMap = null;
        if (testConfig.query != null) {
            queryMap = new HashMap<>();
            queryMap.put("q", testConfig.query);
        }
        return queryMap;
    }

    @Override
    protected String getResourceDir() {
        return "vector_store_manager";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return VectorStoreSearchTest.class;
    }

    @Override
    protected String getApiName() {
        return "search";
    }

    /**
     * Represents the test configuration for the flow model getNodeTemplate API.
     *
     * @param source               The source file path
     * @param query                The query string to search
     * @param expectedVectorStores The expected set of model providers
     */
    private record TestConfig(String source, String query, JsonObject expectedVectorStores) {

    }
}
