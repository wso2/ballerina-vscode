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

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import io.ballerina.flowmodelgenerator.extension.request.GetSelectedLibrariesRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Tests for the Copilot Library Service getFilteredLibraries method.
 *
 * @since 1.0.0
 */
public class CopilotLibraryFilterTest extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("get_filtered_libraries.json")},
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        // Create request with library names to filter and mode
        GetSelectedLibrariesRequest request = new GetSelectedLibrariesRequest(
                testConfig.libNames().toArray(new String[0]));
        JsonElement response = getResponse(request);

        JsonArray actualLibraries = response.getAsJsonObject().getAsJsonArray("libraries");

        boolean assertFailure = false;

        if (actualLibraries == null) {
            log.info("No libraries array found in response");
            assertFailure = true;
        } else if (actualLibraries.size() != testConfig.expectedLibraries().size()) {
            log.info("Expected " + testConfig.expectedLibraries().size() + " libraries, but got " +
                    actualLibraries.size());
            assertFailure = true;
        } else {
            // Verify that each returned library is a complete object (not just name and description)
            for (int i = 0; i < actualLibraries.size(); i++) {
                JsonObject actualLibrary = actualLibraries.get(i).getAsJsonObject();
                String expectedLibraryName = testConfig.expectedLibraries().get(i).name;

                if (!actualLibrary.has("name")) {
                    log.info("Library object at index " + i + " missing 'name' field");
                    assertFailure = true;
                    break;
                }

                String actualLibraryName = actualLibrary.get("name").getAsString();
                if (!actualLibraryName.equals(expectedLibraryName)) {
                    log.info("Library mismatch at index " + i + ": expected '" + expectedLibraryName + "', got '" +
                            actualLibraryName + "'");
                    assertFailure = true;
                    break;
                }

                // Verify that this is a full library object (should have more than just name and description)
                if (actualLibrary.entrySet().size() <= 2) {
                    log.info("Library object at index " + i + " appears to be limited (only has " +
                            actualLibrary.entrySet().size() + " fields)");
                    assertFailure = true;
                    break;
                }
            }
        }

        if (assertFailure) {
            // updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "copilot_library";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return CopilotLibraryFilterTest.class;
    }

    @Override
    protected String getApiName() {
        return "getFilteredLibraries";
    }

    @Override
    protected String getServiceName() {
        return "copilotLibraryManager";
    }

    /**
     * Test configuration record for filtered libraries test.
     *
     * @param description The description of the test
     * @param libNames Array of library names to filter
     * @param mode The mode to test ("CORE" or "HEALTHCARE")
     * @param expectedLibraries The expected list of libraries
     */
    public record TestConfig(String description, List<String> libNames, String mode, List<Library> expectedLibraries) {

        public String mode() {
            return mode == null ? "CORE" : mode;
        }
    }

    public record Library(String name, String description, List<Object> typeDefs, List<Object> clients,
                          List<Object> functions) {
    }
}
