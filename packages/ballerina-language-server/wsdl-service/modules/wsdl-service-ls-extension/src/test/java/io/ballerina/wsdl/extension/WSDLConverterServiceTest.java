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

package io.ballerina.wsdl.extension;

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
 * Tests for WSDL to Ballerina type converter service.
 *
 * @since 1.4.0
 */
public class WSDLConverterServiceTest extends AbstractLSTest {

    private static final Type TEXT_EDIT_LIST_TYPE = new TypeToken<Map<String, List<TextEdit>>>() {
    }.getType();

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        BufferedReader bufferedReader = Files.newBufferedReader(configJsonPath);
        TestConfig testConfig = gson.fromJson(bufferedReader, TestConfig.class);
        bufferedReader.close();

        WSDLConverterRequest request = new WSDLConverterRequest(
                testConfig.wsdlContent(),
                sourceDir.resolve(testConfig.testProjectFolder).toAbsolutePath().toString(),
                testConfig.portName() != null ? testConfig.portName() : ""
        );

        JsonObject response = getResponse(request);
        JsonObject jsonMap = response.getAsJsonObject("textEdits");

        if (jsonMap == null) {
            String error = response.get("error").getAsString();
            Assert.fail("WSDL conversion failed: " + error);
        }

        Map<String, List<TextEdit>> actualTextEdits = gson.fromJson(jsonMap, TEXT_EDIT_LIST_TYPE);
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
                    testConfig.wsdlContent(),
                    testConfig.description(),
                    testConfig.testProjectFolder(),
                    testConfig.portName(),
                    newMap
            );
//          updateConfig(configJsonPath, updatedConfig);
          Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "wsdl-converter";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return WSDLConverterServiceTest.class;
    }

    @Override
    protected String getServiceName() {
        return "wsdlService";
    }

    @Override
    protected String getApiName() {
        return "generateTypesFromWSDL";
    }

    /**
     * Represents the test configuration for the WSDL converter test.
     *
     * @param wsdlContent  The WSDL content.
     * @param description The description of the test.
     * @param testProjectFolder The test project folder path.
     * @param portName The port name to process (optional).
     * @param output      The expected text edits output.
     */
    private record TestConfig(String wsdlContent, String description, String testProjectFolder,
                              String portName, Map<String, List<TextEdit>> output) {

        public String description() {
            return description == null ? "" : description;
        }

        public String portName() {
            return portName == null ? "" : portName;
        }
    }
}

