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

package io.ballerina.persist.extension;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonPrimitive;
import com.google.gson.reflect.TypeToken;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.ballerinalang.langserver.util.TestUtil;
import org.eclipse.lsp4j.TextEdit;
import org.testng.Assert;
import org.testng.annotations.BeforeClass;
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
import java.util.concurrent.CompletableFuture;

/**
 * Tests for Persist client generation functionality.
 *
 * @since 1.5.0
 */
public class PersistClientGeneratorTest extends AbstractLSTest {

    private static final Type TEXT_EDIT_LIST_TYPE = new TypeToken<Map<String, List<TextEdit>>>() {
    }.getType();

    @BeforeClass
    public void setup() {
        log.info("Starting persist client generation tests...");
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        BufferedReader bufferedReader = Files.newBufferedReader(configJsonPath);
        TestConfig testConfig = gson.fromJson(bufferedReader, TestConfig.class);
        bufferedReader.close();

        PersistClientGeneratorRequest request = new PersistClientGeneratorRequest(
                sourceDir.resolve(testConfig.testProjectFolder()).toAbsolutePath().toString(),
                testConfig.name(),
                testConfig.dbSystem(),
                testConfig.host(),
                testConfig.port(),
                testConfig.user(),
                testConfig.password(),
                testConfig.database(),
                testConfig.selectedTables(),
                testConfig.module());

        // Handle negative test cases
        if (testConfig.expectError()) {
            try {
                JsonObject response = getResponseForNegativeTest(request);
                Assert.fail("Expected error but got successful response for test: " + testConfig.description());
            } catch (AssertionError e) {
                // Expected error - verify error message contains expected text
                String errorMessage = e.getMessage();
                if (testConfig.expectedErrorMessage() != null && 
                    !errorMessage.toLowerCase().contains(testConfig.expectedErrorMessage().toLowerCase())) {
                    Assert.fail("Error message '" + errorMessage + "' does not contain expected text: " + 
                               testConfig.expectedErrorMessage());
                }
                log.info("Negative test passed: " + testConfig.description());
                return;
            }
        }

        JsonObject response = getResponse(request);

        // Check if source exists in response
        JsonObject source = response.getAsJsonObject("source");
        if (source == null) {
            Assert.fail("Persist client generation failed: No source returned in response");
        }

        JsonObject textEditsMap = source.getAsJsonObject("textEditsMap");
        Map<String, List<TextEdit>> actualTextEdits = gson.fromJson(textEditsMap, TEXT_EDIT_LIST_TYPE);
        assertResults(actualTextEdits, testConfig, configJsonPath);
    }

    private JsonObject getResponseForNegativeTest(Object request) throws IOException {
        CompletableFuture<?> result = serviceEndpoint.request(getServiceName() + "/" + getApiName(), request);
        String response = TestUtil.getResponseString(result);
        JsonObject jsonObject = JsonParser.parseString(response).getAsJsonObject().getAsJsonObject("result");
        JsonPrimitive errorMsg = jsonObject.getAsJsonPrimitive("errorMsg");
        if (errorMsg != null) {
            throw new AssertionError(errorMsg.getAsString());
        }
        return jsonObject;
    }

    private void assertResults(Map<String, List<TextEdit>> actualTextEdits, TestConfig testConfig,
                               Path configJsonPath) throws IOException {
        boolean assertFailure = false;

        if (actualTextEdits == null || actualTextEdits.isEmpty()) {
            log.info("No text edits generated.");
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }

        if (testConfig.output() != null && !testConfig.output().isEmpty()) {
            if (actualTextEdits.size() != testConfig.output().size()) {
                log.info("The number of text edits does not match the expected output.");
                log.info("Expected files: " + testConfig.output().keySet());
                log.info("Actual files: " + actualTextEdits.keySet());
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
                        testConfig.description(),
                        testConfig.testProjectFolder(),
                        testConfig.name(),
                        testConfig.dbSystem(),
                        testConfig.host(),
                        testConfig.port(),
                        testConfig.user(),
                        testConfig.password(),
                        testConfig.database(),
                        testConfig.selectedTables(),
                        testConfig.module(),
                        newMap,
                        testConfig.expectError(),
                        testConfig.expectedErrorMessage()
                );
                updateConfig(configJsonPath, updatedConfig);
                Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
            }
        } else {
            Assert.fail("No expected output defined for test: " +
                    String.format("'%s' (%s)", testConfig.description(), configJsonPath) + " but got text edits.");
        }
    }

    @Override
    protected String getResourceDir() {
        return "persist-generator";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return PersistClientGeneratorTest.class;
    }

    @Override
    protected String getServiceName() {
        return "persistService";
    }

    @Override
    protected String getApiName() {
        return "generatePersistClient";
    }

    /**
     * Represents the test configuration for persist client generation test.
     *
     * @param description          The description of the test.
     * @param testProjectFolder    The test project folder path.
     * @param name                 Name of the database connector.
     * @param dbSystem             Database system type (mysql, postgresql, mssql).
     * @param host                 Database host address.
     * @param port                 Database port number.
     * @param user                 Database username.
     * @param password             Database user password.
     * @param database             Name of the database to connect.
     * @param selectedTables       Selected tables to generate entities for.
     * @param module               The target module name for generated client.
     * @param output               The expected text edits output.
     * @param expectError          Flag to indicate if an error is expected.
     * @param expectedErrorMessage Expected error message content for negative tests.
     */
    private record TestConfig(String description, String testProjectFolder, String name,
            String dbSystem, String host, Integer port,
            String user, String password, String database,
            String[] selectedTables, String module,
            Map<String, List<TextEdit>> output, Boolean expectError, String expectedErrorMessage) {

        public String description() {
            return description == null ? "" : description;
        }

        public Boolean expectError() {
            return expectError != null && expectError;
        }

        public String expectedErrorMessage() {
            return expectedErrorMessage == null ? "" : expectedErrorMessage;
        }
    }
}
