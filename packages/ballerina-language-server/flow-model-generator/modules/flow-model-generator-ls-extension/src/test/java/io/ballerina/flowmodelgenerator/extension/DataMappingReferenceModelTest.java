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
import io.ballerina.flowmodelgenerator.extension.request.DataMapperModelRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import io.ballerina.tools.text.LinePosition;
import org.ballerinalang.langserver.BallerinaLanguageServer;
import org.ballerinalang.langserver.util.TestUtil;
import org.eclipse.lsp4j.jsonrpc.Endpoint;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Tests for the generation of data mapper model with the reference-based types.
 *
 * @since 1.1.0
 */
public class DataMappingReferenceModelTest extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("record1.json")},
                {Path.of("record2.json")},
                {Path.of("array1.json")},
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Endpoint endpoint = TestUtil.newLanguageServer().withLanguageServer(new BallerinaLanguageServer()).build();
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        DataMapperModelRequest request =
                new DataMapperModelRequest(sourceDir.resolve(testConfig.source()).toAbsolutePath().toString(),
                        testConfig.codedata(), testConfig.position(), testConfig.propertyKey(),
                        testConfig.targetField());
        JsonObject model = getResponse(endpoint, request).getAsJsonObject("mappingsModel");
        String actual = model.toString().replace(" ", "");
        String expected = testConfig.model().toString().replace(" ", "");
        if (!actual.equals(expected)) {
            TestConfig updateConfig = new TestConfig(testConfig.source(), testConfig.description(),
                    testConfig.codedata(), testConfig.position(), testConfig.propertyKey(), testConfig.targetField(),
                    model);
//            updateConfig(configJsonPath, updateConfig);
            compareJsonElements(model, testConfig.model());
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "data_mapper_reference_model";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return DataMappingTypesTest.class;
    }

    @Override
    protected String getApiName() {
        return "mappings";
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
     * @param codedata    The details of the node
     * @param position    position of the end of previous statement
     * @param propertyKey The property that needs to consider to get the type
     * @param model       The expected data mapping model
     * @param targetField The target field to add the element
     */
    private record TestConfig(String source, String description, JsonElement codedata, LinePosition position,
                              String propertyKey, String targetField, JsonElement model) {

        public String description() {
            return description == null ? "" : description;
        }
    }
}
