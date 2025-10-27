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

package io.ballerina.xsd.extension;

import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.eclipse.lsp4j.TextEdit;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.io.BufferedReader;
import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Tests for XSD to Ballerina type converter service.
 *
 * @since 1.4.0
 */
public class XSDConverterServiceTest extends AbstractLSTest {

    private static final Type TEXT_EDIT_LIST_TYPE = new TypeToken<Map<String, List<TextEdit>>>() {
    }.getType();

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        BufferedReader bufferedReader = Files.newBufferedReader(configJsonPath);
        TestConfig testConfig = gson.fromJson(bufferedReader, TestConfig.class);
        bufferedReader.close();

        // Create request with XSD content and project path
        XSDConverterRequest request = new XSDConverterRequest(
                testConfig.xsdContent(),
                sourceDir.resolve("sample").toAbsolutePath().toString()
        );

        // Get response from the service
        JsonObject response = getResponse(request);
        JsonObject jsonMap = response.getAsJsonObject("textEdits");

        if (jsonMap == null) {
            String error = response.get("error").getAsString();
            Assert.fail("XSD conversion failed: " + error);
        }

        Map<String, List<TextEdit>> actualTextEdits = gson.fromJson(jsonMap, TEXT_EDIT_LIST_TYPE);

        // Validate text edits against expected output
        assertResults(actualTextEdits, testConfig, configJsonPath);
    }

    private void assertResults(Map<String, List<TextEdit>> actualTextEdits, TestConfig testConfig,
                                Path configJsonPath) throws IOException {
        boolean assertFailure = false;

        if (actualTextEdits.size() != testConfig.output().size()) {
            log.info("The number of text edits does not match the expected output.");
            assertFailure = true;
        }

        Map<String, List<TextEdit>> newMap = new HashMap<>();
        for (Map.Entry<String, List<TextEdit>> entry : actualTextEdits.entrySet()) {
            Path fullPath = Paths.get(entry.getKey());
            String relativePath = sourceDir.relativize(fullPath).toString();

            List<TextEdit> expectedEdits = testConfig.output().get(relativePath.replace("\\", "/"));
            if (expectedEdits == null) {
                log.info("No text edits found for the file: " + relativePath);
                assertFailure = true;
            } else if (!assertArray("text edits", entry.getValue(), expectedEdits)) {
                assertFailure = true;
            }

            newMap.put(relativePath, entry.getValue());
        }

        if (assertFailure) {
            TestConfig updatedConfig = new TestConfig(
                    testConfig.xsdContent(),
                    testConfig.description(),
                    newMap
            );
            // Uncomment to update config file with actual output:
            // updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "xsd-converter";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return XSDConverterServiceTest.class;
    }

    @Override
    protected String getServiceName() {
        return "xsdService";
    }

    @Override
    protected String getApiName() {
        return "generateTypesFromXSD";
    }

    /**
     * Represents the test configuration for the XSD converter test.
     *
     * @param xsdContent  The XSD schema content.
     * @param description The description of the test.
     * @param output      The expected text edits output.
     */
    private record TestConfig(String xsdContent, String description,
                              Map<String, List<TextEdit>> output) {

        public String description() {
            return description == null ? "" : description;
        }
    }
}
