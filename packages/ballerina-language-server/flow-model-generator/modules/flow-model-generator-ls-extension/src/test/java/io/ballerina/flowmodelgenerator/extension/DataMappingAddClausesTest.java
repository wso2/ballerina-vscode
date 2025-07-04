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
import io.ballerina.flowmodelgenerator.extension.request.DataMapperAddClausesRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Tests for the generation of data mapper source.
 *
 * @since 1.0.0
 */
public class DataMappingAddClausesTest extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("variable1.json")},
                {Path.of("variable2.json")}
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        DataMapperAddClausesRequest request =
                new DataMapperAddClausesRequest(sourceDir.resolve(testConfig.source()).toAbsolutePath().toString(),
                        testConfig.diagram(), testConfig.query(), testConfig.propertyKey(), testConfig.targetField());
        String source = getResponse(request).getAsJsonPrimitive("source").getAsString();

        if (!source.equals(testConfig.output())) {
            TestConfig updateConfig = new TestConfig(testConfig.source(), testConfig.description(),
                    testConfig.diagram(), testConfig.propertyKey(), testConfig.query(), testConfig.targetField(),
                    source);
            updateConfig(configJsonPath, updateConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "data_mapper_add_clauses";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return DataMappingAddClausesTest.class;
    }

    @Override
    protected String getApiName() {
        return "addClauses";
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
     * @param diagram     The diagram to generate the source code
     * @param propertyKey The property key to generate the source code
     * @param query       The representation of query
     * @param targetField The target field to generate the source code
     * @param output      The expected source
     */
    private record TestConfig(String source, String description, JsonElement diagram, String propertyKey,
                              JsonElement query, String targetField, String output) {

        public String description() {
            return description == null ? "" : description;
        }
    }
}
