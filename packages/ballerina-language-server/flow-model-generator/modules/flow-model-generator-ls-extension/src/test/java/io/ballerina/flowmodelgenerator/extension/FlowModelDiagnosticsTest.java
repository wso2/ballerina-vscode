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

package io.ballerina.flowmodelgenerator.extension;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import io.ballerina.flowmodelgenerator.extension.request.FlowModelSourceGeneratorRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Test cases for the flow model diagnostics API.
 *
 * @since 1.0.0
 */
public class FlowModelDiagnosticsTest extends AbstractLSTest {

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);
        String sourcePath = getSourcePath(testConfig.source());

        notifyDidOpen(sourcePath);
        FlowModelSourceGeneratorRequest request =
                new FlowModelSourceGeneratorRequest(sourcePath, testConfig.flowNode());
        JsonElement flowNode = getResponse(request).get("flowNode");
        notifyDidClose(sourcePath);

        if (!flowNode.equals(testConfig.output())) {
            TestConfig updateConfig = new TestConfig(testConfig.source(), testConfig.description(),
                    testConfig.flowNode(), flowNode);
//            updateConfig(configJsonPath, updateConfig);
            compareJsonElements(flowNode, testConfig.output());
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Test
    public void testMultipleRequests() throws IOException, InterruptedException {
        // Load the template test config
        Path configJsonPath = configDir.resolve("variable1.json");
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);
        String sourcePath = getSourcePath(testConfig.source());
        notifyDidOpen(sourcePath);

        // Fire multiple requests with the same flow node to test race conditions
        JsonElement flowNode = testConfig.flowNode();
        for (int i = 0; i < 3; i++) {
            getResponse(new FlowModelSourceGeneratorRequest(sourcePath, flowNode));
            Thread.sleep(50);
        }

        // Make a final request and verify it returns the expected response
        FlowModelSourceGeneratorRequest finalReq = new FlowModelSourceGeneratorRequest(sourcePath, flowNode);
        JsonObject response = getResponse(finalReq);
        notifyDidClose(sourcePath);
        Assert.assertEquals(response.get("flowNode"), testConfig.output());
    }

    @Override
    protected String getResourceDir() {
        return "flow_model_diagnostics";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return FlowModelDiagnosticsTest.class;
    }

    @Override
    protected String getApiName() {
        return "diagnostics";
    }

    private record TestConfig(String source, String description, JsonElement flowNode, JsonElement output) {

        public String description() {
            return description == null ? "" : description;
        }
    }
}
