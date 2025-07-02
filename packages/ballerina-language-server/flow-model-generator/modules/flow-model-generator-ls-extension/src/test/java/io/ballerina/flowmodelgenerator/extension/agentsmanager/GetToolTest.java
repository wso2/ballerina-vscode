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

package io.ballerina.flowmodelgenerator.extension.agentsmanager;

import com.google.gson.JsonElement;
import io.ballerina.flowmodelgenerator.extension.request.GetToolRequest;
import io.ballerina.flowmodelgenerator.extension.response.GetToolResponse;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Tests for the agent editing.
 *
 * @since 2.0.0
 */
public class GetToolTest extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("get_tool.json")},
                {Path.of("get_tool2.json")}
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        GetToolRequest request =
                new GetToolRequest(testConfig.toolName(),
                        sourceDir.resolve(testConfig.source()).toAbsolutePath().toString());
        GetToolResponse response = gson.fromJson(getResponse(request), GetToolResponse.class);

        if (!response.toolName().equals(testConfig.toolName()) || !response.flowNode().equals(testConfig.flowNode()) ||
                !(response.methodCallFlowNode() == null ? testConfig.methodCallFlowNode() == null :
                        response.methodCallFlowNode().equals(testConfig.methodCallFlowNode()))) {
            TestConfig updatedConfig = new TestConfig(testConfig.source(), response.toolName(),
                    response.flowNode(), response.methodCallFlowNode());
//            updateConfig(configJsonPath, updatedConfig);
            Assert.fail("Test failed. Updated the expected output in " + configJsonPath);
        }
    }

    @Override
    protected String getResourceDir() {
        return "agents_manager";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return GetToolTest.class;
    }

    @Override
    protected String getApiName() {
        return "getTool";
    }

    @Override
    protected String getServiceName() {
        return "agentManager";
    }

    /**
     * Represents the test configuration for the source generator test.
     *
     * @param source                The source file name
     * @param toolName              The tool name to edit the description
     * @param flowNode              The flow node of the tool
     * @param methodCallFlowNode    The flow node of the internal method call
     */
    private record TestConfig(String source, String toolName, JsonElement flowNode,
                              JsonElement methodCallFlowNode) {
    }
}
