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

package io.ballerina.flowmodelgenerator.extension.vectorstoremanager;

import com.google.gson.JsonObject;
import io.ballerina.flowmodelgenerator.extension.request.FlowModelNodeTemplateRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import io.ballerina.tools.text.LinePosition;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Test for obtaining vector store node templates.
 *
 * @since 1.1.0
 */
public class GetNodeTemplateTest extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("get_in_memory_vector_store_template.json")},
                {Path.of("get_pinecone_vector_store_template.json")}
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);
        String filePath = sourceDir.resolve(testConfig.source()).toAbsolutePath().toString();
        FlowModelNodeTemplateRequest request = new FlowModelNodeTemplateRequest(filePath,
                LinePosition.from(1, 1), testConfig.codedata());
        JsonObject nodeTemplateResponse = getResponse(request);
        if (!nodeTemplateResponse.equals(testConfig.expectedTemplate())) {
            TestConfig updatedConfig = new TestConfig(testConfig.source(), testConfig.codedata(), nodeTemplateResponse);
            // updateConfig(configJsonPath, updatedConfig);
            compareJsonElements(nodeTemplateResponse, testConfig.expectedTemplate());
            Assert.fail(String.format("Failed test: '%s'", configJsonPath));
        }
    }


    @Override
    protected String getResourceDir() {
        return "vector_store_manager";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return GetNodeTemplateTest.class;
    }

    @Override
    protected String getApiName() {
        return "getNodeTemplate";
    }

    /**
     * Represents the test configuration for the flow model getNodeTemplate API.
     *
     * @param source           The source file path
     * @param codedata         The code data of the vector store
     * @param expectedTemplate The expected template of the vector store
     */
    private record TestConfig(String source, JsonObject codedata, JsonObject expectedTemplate) {

    }
}
