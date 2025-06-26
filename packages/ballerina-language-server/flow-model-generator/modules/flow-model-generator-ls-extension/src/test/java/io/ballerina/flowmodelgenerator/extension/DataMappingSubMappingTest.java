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
import com.google.gson.reflect.TypeToken;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperAddElementRequest;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperSubMappingRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.eclipse.lsp4j.TextEdit;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Tests for the getting the codedata for sub mapping view.
 *
 * @since 1.0.0
 */
public class DataMappingSubMappingTest extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("variable1.json")}
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        DataMapperSubMappingRequest request = new DataMapperSubMappingRequest(sourceDir.resolve(testConfig.source())
                .toAbsolutePath().toString(), testConfig.codedata(), testConfig.view());
        JsonObject output = getResponseAndCloseFile(request, testConfig.source()).getAsJsonObject("codedata");

        if (!testConfig.output().equals(output)) {
            TestConfig updatedConfig = new TestConfig(testConfig.source(), testConfig.description(),
                    testConfig.codedata(), testConfig.view(), output);
            updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "data_mapper_sub_mapping";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return DataMappingTypesTest.class;
    }

    @Override
    protected String getApiName() {
        return "subMapping";
    }

    @Override
    protected String getServiceName() {
        return "dataMapper";
    }

    /**
     * Represents the test configuration for the source generator test.
     *
     * @param source      The source file name
     * @param description The description of the test
     * @param codedata    Details of the node
     * @param view        The view of the node
     * @param output      The codedata of the view
     */
    private record TestConfig(String source, String description, JsonElement codedata, String view,
                              JsonElement output) {

        public String description() {
            return description == null ? "" : description;
        }
    }
}
