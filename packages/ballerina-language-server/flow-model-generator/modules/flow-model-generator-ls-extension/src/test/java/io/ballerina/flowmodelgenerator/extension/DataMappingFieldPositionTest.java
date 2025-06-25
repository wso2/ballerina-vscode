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
import io.ballerina.flowmodelgenerator.extension.request.DataMapperFieldPositionRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import io.ballerina.tools.text.LinePosition;
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
 * Tests for the getting the field position and text edits.
 *
 * @since 1.0.0
 */
public class DataMappingFieldPositionTest extends AbstractLSTest {

    private static final Type textEditListType = new TypeToken<Map<String, List<TextEdit>>>() {
    }.getType();

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("variable1.json")},
                {Path.of("variable1_1.json")},
                {Path.of("variable1_2.json")},
                {Path.of("variable2.json")},
                {Path.of("variable2_1.json")},
                {Path.of("variable3.json")},
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        DataMapperFieldPositionRequest request =
                new DataMapperFieldPositionRequest(sourceDir.resolve(testConfig.source()).toAbsolutePath().toString(),
                        testConfig.codedata(), testConfig.propertyKey(), testConfig.targetField(),
                        testConfig.fieldId());
        JsonObject jsonMap = getResponseAndCloseFile(request, testConfig.source()).getAsJsonObject("field");

        Map<String, List<TextEdit>> actualTextEdits = gson.fromJson(jsonMap.get("textEdits"), textEditListType);
        LinePosition actualPosition = gson.fromJson(jsonMap.get("position"), LinePosition.class);

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

        if (!actualPosition.equals(testConfig.position())) {
            log.info("The position matches the expected output.");
            assertFailure = true;
        }

        if (assertFailure) {
            TestConfig updatedConfig = new TestConfig(testConfig.source(), testConfig.description(),
                    testConfig.codedata(), testConfig.propertyKey(), testConfig.targetField(), testConfig.fieldId(),
                    newMap, actualPosition);
//            updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "data_mapper_field_position";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return DataMappingTypesTest.class;
    }

    @Override
    protected String getApiName() {
        return "fieldPosition";
    }

    @Override
    protected String getServiceName() {
        return "dataMapper";
    }

    /**
     * Represents the test configuration for the field position test.
     *
     * @param source      The source file name
     * @param description The description of the test
     * @param codedata    Details of the node
     * @param propertyKey The property key
     * @param targetField The target field to add the element
     * @param fieldId     The field ID to identify the specific field to get the position
     * @param output      The generated source
     * @param position    Position of the given field
     */
    private record TestConfig(String source, String description, JsonElement codedata, String propertyKey,
                              String targetField, String fieldId, Map<String, List<TextEdit>> output,
                              LinePosition position) {

        public String description() {
            return description == null ? "" : description;
        }
    }
}
