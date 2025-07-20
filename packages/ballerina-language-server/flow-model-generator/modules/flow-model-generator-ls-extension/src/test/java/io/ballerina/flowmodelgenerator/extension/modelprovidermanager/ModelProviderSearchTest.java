package io.ballerina.flowmodelgenerator.extension.modelprovidermanager;

import com.google.gson.JsonObject;
import io.ballerina.flowmodelgenerator.extension.request.SearchRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class ModelProviderSearchTest extends AbstractLSTest {
    private static final String MODEL_PROVIDER_KIND_NAME = "MODEL_PROVIDER";

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{{Path.of("model_providers.json")}};
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);
        String filePath = sourceDir.resolve(testConfig.source()).toAbsolutePath().toString();
        SearchRequest searchRequest = new SearchRequest(MODEL_PROVIDER_KIND_NAME, filePath, null, null);
        JsonObject searchResult = getResponse(searchRequest);
        if (!searchResult.equals(testConfig.expectedModelProviders())) {
            TestConfig updatedConfig = new TestConfig(testConfig.source(), searchResult);
            // updateConfig(configJsonPath, updatedConfig);
            Assert.fail("Test failed. Updated the expected output in " + configJsonPath);
        }
    }

    @Override
    protected String getResourceDir() {
        return "model_provider_manager";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return ModelProviderSearchTest.class;
    }

    @Override
    protected String getApiName() {
        return "search";
    }

    /**
     * Represents the test configuration for the flow model getNodeTemplate API.
     *
     * @param source           The source file path
     * @param expectedModelProviders The expected set of model providers
     */
    private record TestConfig(String source, JsonObject expectedModelProviders) {

    }
}
