/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
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
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.ballerinalang.langserver.util.TestUtil;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.CompletableFuture;

/**
 * Tests for credential introspection functionality of Persist Service.
 *
 * @since 1.7.0
 */
public class IntrospectCredentialsTest extends AbstractLSTest {

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        BufferedReader bufferedReader = Files.newBufferedReader(configJsonPath);
        TestConfig testConfig = gson.fromJson(bufferedReader, TestConfig.class);
        bufferedReader.close();

        IntrospectCredentialsRequest request = new IntrospectCredentialsRequest();
        request.setProjectPath(
                sourceDir.resolve(testConfig.testProjectFolder()).toAbsolutePath().toString());
        request.setConnection(testConfig.connection());

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
        JsonObject actualData = response.getAsJsonObject("data");
        if (actualData == null) {
            Assert.fail("Response missing 'data' field for test: " + testConfig.description());
            return;
        }

        assertResults(actualData, testConfig, configJsonPath);
    }

    private void assertResults(JsonObject actualData, TestConfig testConfig,
                               Path configJsonPath) throws IOException {
        if (testConfig.output() == null) {
            // No expected output yet — write the actual output to the config for future runs
            TestConfig updatedConfig = new TestConfig(
                    testConfig.description(), testConfig.testProjectFolder(),
                    testConfig.connection(), actualData,
                    testConfig.expectError(), testConfig.expectedErrorMessage());
//            updateConfig(configJsonPath, updatedConfig);
            Assert.fail("No expected output defined. Config updated with actual output: "
                    + configJsonPath);
            return;
        }

        if (!actualData.equals(testConfig.output())) {
            compareJsonElements(actualData, testConfig.output());
            TestConfig updatedConfig = new TestConfig(
                    testConfig.description(), testConfig.testProjectFolder(),
                    testConfig.connection(), actualData,
                    testConfig.expectError(), testConfig.expectedErrorMessage());
//            updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)",
                    testConfig.description(), configJsonPath));
        }
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
        return "persist-credentials";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return IntrospectCredentialsTest.class;
    }

    @Override
    protected String getServiceName() {
        return "persistService";
    }

    @Override
    protected String getApiName() {
        return "introspectCredentials";
    }

    /**
     * Represents the test configuration for a credential introspection test.
     *
     * @param description          Human-readable description of the test scenario.
     * @param testProjectFolder    Folder name under {@code source/} containing the Ballerina project.
     * @param connection           Optional connection variable name to look up; {@code null} or empty
     *                             means return the empty credential model immediately.
     * @param output               The complete expected {@code data} response object. When {@code null},
     *                             the test writes the actual output to the config file on first run.
     * @param expectError          {@code true} if the test expects an error response.
     * @param expectedErrorMessage Substring that must be present in the error message for negative tests.
     */
    private record TestConfig(String description, String testProjectFolder, String connection,
                              JsonObject output, Boolean expectError, String expectedErrorMessage) {

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
