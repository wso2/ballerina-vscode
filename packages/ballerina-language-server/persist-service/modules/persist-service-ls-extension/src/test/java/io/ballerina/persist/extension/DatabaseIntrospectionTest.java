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

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonPrimitive;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import io.ballerina.persist.extension.DatabaseIntrospectionRequest.IntrospectDatabaseData;
import org.ballerinalang.langserver.util.TestUtil;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.CompletableFuture;

/**
 * Tests for database introspection functionality of Persist Service.
 *
 * @since 1.5.0
 */
public class DatabaseIntrospectionTest extends AbstractLSTest {

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        BufferedReader bufferedReader = Files.newBufferedReader(configJsonPath);
        TestConfig testConfig = gson.fromJson(bufferedReader, TestConfig.class);
        bufferedReader.close();

        DatabaseIntrospectionRequest request = new DatabaseIntrospectionRequest();
        request.setProjectPath(
                sourceDir.resolve(testConfig.testProjectFolder()).toAbsolutePath().toString());
        request.setData(testConfig.data());

        // Handle negative test cases
        if (testConfig.expectError()) {
            try {
                getResponseForNegativeTest(request);
                Assert.fail("Expected error but got successful response for test: "
                        + testConfig.description());
            } catch (AssertionError e) {
                String errorMessage = e.getMessage();
                if (!testConfig.expectedErrorMessage().isEmpty()
                        && !errorMessage.toLowerCase()
                                .contains(testConfig.expectedErrorMessage().toLowerCase())) {
                    Assert.fail("Error message '" + errorMessage
                            + "' does not contain expected text: "
                            + testConfig.expectedErrorMessage());
                }
                log.info("Negative test passed: " + testConfig.description());
            }
            return;
        }

        JsonObject response = getResponse(request);
        assertResults(response, testConfig, configJsonPath);
    }

    private void assertResults(JsonObject actualResponse, TestConfig testConfig,
                               Path configJsonPath) throws IOException {
        if (testConfig.output() == null) {
            TestConfig updatedConfig = new TestConfig(
                    testConfig.description(), testConfig.testProjectFolder(),
                    testConfig.data(), actualResponse,
                    testConfig.expectError(), testConfig.expectedErrorMessage());
//            updateConfig(configJsonPath, updatedConfig);
            Assert.fail("No expected output defined. Config updated with actual output: "
                    + configJsonPath);
            return;
        }

        JsonArray actualTables = actualResponse.getAsJsonArray("tables");
        JsonArray expectedTables = testConfig.output().getAsJsonArray("tables");

        if (!tableSetEquals(actualTables, expectedTables)) {
            compareJsonElements(actualResponse, testConfig.output());
            TestConfig updatedConfig = new TestConfig(
                    testConfig.description(), testConfig.testProjectFolder(),
                    testConfig.data(), actualResponse,
                    testConfig.expectError(), testConfig.expectedErrorMessage());
//            updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)",
                    testConfig.description(), configJsonPath));
        }
    }

    /**
     * Compares two table JsonArrays as unordered sets so that the assertion is
     * not sensitive to the order in which the database driver returns table names.
     */
    private boolean tableSetEquals(JsonArray actual, JsonArray expected) {
        if (actual == null && expected == null) {
            return true;
        }
        if (actual == null || expected == null) {
            return false;
        }
        if (actual.size() != expected.size()) {
            return false;
        }
        for (JsonElement expectedElem : expected) {
            boolean found = false;
            for (JsonElement actualElem : actual) {
                if (actualElem.equals(expectedElem)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;
            }
        }
        return true;
    }

    private JsonObject getResponseForNegativeTest(Object request) {
        CompletableFuture<?> result = serviceEndpoint.request(
                getServiceName() + "/" + getApiName(), request);
        String response = TestUtil.getResponseString(result);
        JsonObject jsonObject = JsonParser.parseString(response)
                .getAsJsonObject().getAsJsonObject("result");
        JsonPrimitive errorMsg = jsonObject.getAsJsonPrimitive("errorMsg");
        if (errorMsg != null) {
            throw new AssertionError(errorMsg.getAsString());
        }
        return jsonObject;
    }

    @Override
    protected String getResourceDir() {
        return "persist-introspection";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return DatabaseIntrospectionTest.class;
    }

    @Override
    protected String getServiceName() {
        return "persistService";
    }

    @Override
    protected String getApiName() {
        return "introspectDatabase";
    }

    /**
     * Represents the test configuration for a database introspection test.
     *
     * @param description          Human-readable description of the test scenario.
     * @param testProjectFolder    Folder name under {@code source/} containing the Ballerina project.
     * @param data                 The credential data sent as the request body, containing
     *                             {@code metadata}, {@code properties}, optional {@code targetModule},
     *                             and optional {@code modelFilePath}.
     * @param output               The complete expected response object. When {@code null}, the test
     *                             writes the actual output to the config file on first run.
     * @param expectError          {@code true} if the test expects an error response.
     * @param expectedErrorMessage Substring that must be present in the error message for negative tests.
     */
    private record TestConfig(String description, String testProjectFolder,
                              IntrospectDatabaseData data, JsonObject output,
                              Boolean expectError, String expectedErrorMessage) {

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
