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

package io.ballerina.servicemodelgenerator.extension;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import io.ballerina.servicemodelgenerator.extension.model.request.TypesRequest;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Assert the response returned by the getListenerModel.
 *
 * @since 1.0.0
 */
public class GetTypeListTest extends AbstractLSTest {

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        BufferedReader bufferedReader = Files.newBufferedReader(configJsonPath);
        GetTypeListTest.TestConfig testConfig = gson.fromJson(bufferedReader,
                GetTypeListTest.TestConfig.class);
        bufferedReader.close();

        String filePath = sourceDir.resolve(testConfig.filePath()).toString();
        TypesRequest request = new TypesRequest(filePath, testConfig.context());
        JsonObject jsonMap = getResponse(request);

        boolean assertTrue = testConfig.result().getAsJsonObject().equals(jsonMap);
        if (!assertTrue) {
            GetTypeListTest.TestConfig updatedConfig =
                    new GetTypeListTest.TestConfig(testConfig.filePath(), testConfig.description(),
                            testConfig.context(), jsonMap);
//            updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }


    @Override
    protected String getResourceDir() {
        return "get_types_list";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return GetTypeListTest.class;
    }

    @Override
    protected String getServiceName() {
        return "serviceDesign";
    }

    @Override
    protected String getApiName() {
        return "types";
    }

    /**
     * Represents the test configuration.
     *
     * @param description description of the test
     * @param filePath    path to the file
     * @param context     context of the request
     * @param result      expected result of the request
     * @since 1.0.0
     */
    private record TestConfig(String filePath, String description, String context, JsonElement result) {
        public String description() {
            return description == null ? "" : description;
        }
    }
}
