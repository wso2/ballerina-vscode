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
 * Tests for the generation of data mapper model.
 *
 * @since 1.0.0
 */
public class DataMappingModelTest extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
//                {Path.of("query1.json")},
//                {Path.of("query2.json")},
//                {Path.of("query3.json")},
//                {Path.of("query4.json")},
//                {Path.of("query5.json")},
//                {Path.of("query6.json")},
//                {Path.of("query7.json")},
//                {Path.of("query8.json")},
//                {Path.of("variable1.json")},
//                {Path.of("variable2.json")},
//                {Path.of("variable3.json")},
//                {Path.of("variable4.json")},
//                {Path.of("variable5.json")},
//                {Path.of("variable6.json")},
//                {Path.of("variable7.json")},
//                {Path.of("variable8.json")},
//                {Path.of("variable9.json")},
//                {Path.of("variable10.json")},
//                {Path.of("variable11.json")},
//                {Path.of("variable12.json")},
//                {Path.of("variable13.json")},
//                {Path.of("variable14.json")},
//                {Path.of("variable15.json")},
//                {Path.of("variable16.json")},
//                {Path.of("variable17.json")},
//                {Path.of("variable18.json")},
//                {Path.of("variable19.json")},
//                {Path.of("variable20.json")},
//                {Path.of("variable21.json")},
//                {Path.of("variable22.json")},
//                {Path.of("variable23.json")},
//                {Path.of("variable24.json")},
//                {Path.of("variable25.json")},
//                {Path.of("variable26.json")},
//                {Path.of("variable27.json")},
//                {Path.of("variable28.json")},
//                {Path.of("variable29.json")},
//                {Path.of("variable30.json")},
//                {Path.of("variable31.json")},
//                {Path.of("variable32.json")},
//                {Path.of("variable33.json")},
//                {Path.of("variable34.json")},
//                {Path.of("variable35.json")},
//                {Path.of("variable36.json")},
//                {Path.of("variable37.json")},
//                {Path.of("variable38.json")},
//                {Path.of("variable39.json")},
//                {Path.of("sub_mapping1.json")},
//                {Path.of("sub_mapping2.json")},
//                {Path.of("sub_mapping3.json")},
//                {Path.of("sub_mapping4.json")},
//                {Path.of("variable40.json")},
//                {Path.of("recursive1.json")},
//                {Path.of("recursive2.json")},
//                {Path.of("variable41.json")},
//                {Path.of("primitiveArray.json")},
//                {Path.of("enum.json")},
//                {Path.of("enum2.json")},
//                {Path.of("union.json")},
//                {Path.of("union1.json")},
//                {Path.of("const.json")},
//                {Path.of("sub_mapping5.json")},
//                {Path.of("variable42.json")},
//                {Path.of("variable43.json")},
//                {Path.of("query9.json")},
//                {Path.of("variable44.json")},
//                {Path.of("union2.json")},
//                {Path.of("query10.json")},
//                {Path.of("query11.json")},
//                {Path.of("variable45.json")},
//                {Path.of("function_def1.json")},
//                {Path.of("function_def2.json")},
//                {Path.of("function_def3.json")},
//                {Path.of("function_def4.json")},
//                {Path.of("function_def5.json")},
//                {Path.of("sub_mapping6.json")},
//                {Path.of("variable46.json")},
//                {Path.of("variable47.json")},
//                {Path.of("union3.json")},
//                {Path.of("union4.json")},
//                {Path.of("union5.json")},
//                {Path.of("variable48.json")},
//                {Path.of("variable49.json")},
//                {Path.of("query12.json")},
//                {Path.of("query13.json")},
//                {Path.of("query14.json")},
//                {Path.of("query15.json")},
//                {Path.of("function_def6.json")},
//                {Path.of("query16.json")},
//                {Path.of("query17.json")},
//                {Path.of("variable50.json")},
//                {Path.of("variable51.json")},
//                {Path.of("variable52.json")},
//                {Path.of("query18.json")},
//                {Path.of("query19.json")},
//                {Path.of("query20.json")},
//                {Path.of("configurable_variable1.json")},
//                {Path.of("configurable_variable2.json")},
//                {Path.of("function_def7.json")},
//                {Path.of("variable53.json")},
//                {Path.of("variable54.json")},
//                {Path.of("variable55.json")},
//                {Path.of("variable56.json")},
//                {Path.of("query21.json")},
//                {Path.of("query22.json")},
//                {Path.of("variable57.json")},
//                {Path.of("query23.json")},
//                {Path.of("query24.json")},
//                {Path.of("map.json")},
//                {Path.of("sub_mapping7.json")},
//                {Path.of("query26.json")},
//                {Path.of("query25.json")},
                {Path.of("query27.json")},
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
            if (isJsonPermutation(model, testConfig.model())) {
                return;
            }
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
        return "data_mapper_model";
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
