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
import io.ballerina.flowmodelgenerator.extension.request.DataMapperSourceRequest;
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
 * Tests for the generation of data mapper source.
 *
 * @since 1.0.0
 */
public class DataMappingSourceTest extends AbstractLSTest {

    private static final Type textEditListType = new TypeToken<Map<String, List<TextEdit>>>() { }.getType();

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("variable1.json")},
                {Path.of("variable2.json")},
                {Path.of("variable2_1.json")},
                {Path.of("variable2_2.json")},
                {Path.of("variable3.json")},
                {Path.of("variable3_1.json")},
                {Path.of("variable3_2.json")},
                {Path.of("variable5_array0.json")},
                {Path.of("variable5_array1.json")},
                {Path.of("variable5_array2.json")},
                {Path.of("variable5_array3.json")},
                {Path.of("variable6.json")},
                {Path.of("variable7_new.json")},
                {Path.of("variable7_new1.json")},
                {Path.of("variable8_new.json")},
                {Path.of("variable8_new1.json")},
                {Path.of("variable9.json")},
                {Path.of("variable9_new.json")},
                {Path.of("variable9_new1.json")},
                {Path.of("variable10.json")},
                {Path.of("variable10_new.json")},
                {Path.of("variable11.json")},
                {Path.of("variable11_new.json")},
                {Path.of("variable12.json")},
                {Path.of("variable12_new1.json")},
                {Path.of("variable12_new2.json")},
                {Path.of("variable13.json")},
                {Path.of("variable13_new1.json")},
                {Path.of("variable13_new2.json")},
                {Path.of("variable13_new3.json")},
                {Path.of("variable13_new4.json")},
                {Path.of("variable13_new5.json")},
                {Path.of("variable13_new6.json")},
                {Path.of("variable13_new7.json")},
                {Path.of("variable14.json")},
                {Path.of("variable15.json")},
                {Path.of("variable15_new.json")},
                {Path.of("variable16.json")},
                {Path.of("variable16_new.json")},
                {Path.of("variable16_new1.json")},
                {Path.of("query1.json")},
                {Path.of("query2.json")},
                {Path.of("query3.json")},
                {Path.of("variable17.json")},
                {Path.of("variable18.json")},
                {Path.of("variable19.json")},
                {Path.of("function_defn1.json")},
                {Path.of("function_defn2.json")},
                {Path.of("function_defn3.json")},
                {Path.of("query4.json")},
                {Path.of("query5.json")},
                {Path.of("query6.json")},
                {Path.of("query7.json")},
                {Path.of("query8.json")},
                {Path.of("variable20.json")},
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        // TODO: check the delete operation
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        DataMapperSourceRequest request =
                new DataMapperSourceRequest(sourceDir.resolve(testConfig.source()).toAbsolutePath().toString(),
                        testConfig.codedata(), testConfig.mapping(), "", testConfig.targetField());
        JsonObject jsonMap = getResponseAndCloseFile(request, testConfig.source()).getAsJsonObject("textEdits");

        Map<String, List<TextEdit>> actualTextEdits = gson.fromJson(jsonMap, textEditListType);

        boolean assertFailure = false;

        if (actualTextEdits.size() != testConfig.output().size()) {
            log.info("The number of text edits does not match the expected output.");
            assertFailure = true;
        }

        Map<String, List<TextEdit>> newMap = new HashMap<>();
        for (Map.Entry<String, List<TextEdit>> entry : actualTextEdits.entrySet()) {
            Path fullPath = Paths.get(entry.getKey());
            String relativePath = sourceDir.relativize(fullPath).toString();

            List<TextEdit> textEdits = testConfig.output().get(relativePath.replace("\\", "/"));
            if (textEdits == null) {
                log.info("No text edits found for the file: " + relativePath);
                assertFailure = true;
            } else if (!assertArray("text edits", entry.getValue(), textEdits)) {
                assertFailure = true;
            }

            newMap.put(relativePath, entry.getValue());
        }

        if (assertFailure) {
            TestConfig updatedConfig = new TestConfig(testConfig.source(), testConfig.description(),
                    testConfig.codedata(), testConfig.propertyKey(), testConfig.position(), testConfig.mapping(),
                    testConfig.targetField(), newMap);
            updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "data_mapper_source";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return DataMappingTypesTest.class;
    }

    @Override
    protected String getApiName() {
        return "getSource";
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
     * @param codedata    The Details of the node
     * @param propertyKey The property key to generate the source code
     * @param position    The position to generate the source code
     * @param mapping     The expected data mapping model
     * @param output      generated source expression
     * @param targetField The target field to generate the source code
     */
    private record TestConfig(String source, String description, JsonElement codedata, String propertyKey,
                              JsonElement position, JsonElement mapping, String targetField,
                              Map<String, List<TextEdit>> output) {

        public String description() {
            return description == null ? "" : description;
        }
    }
}
