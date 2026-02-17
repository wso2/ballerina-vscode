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

package io.ballerina.flowmodelgenerator.extension;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import io.ballerina.flowmodelgenerator.extension.request.GetAllLibrariesRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Tests for the Copilot Library Service getLibrariesListFromSearchIndex method.
 *
 * @since 1.7.0
 */
public class GetLibrariesListFromSearchIndex extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("get_libraries_list_from_database.json")},
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        GetAllLibrariesRequest request = new GetAllLibrariesRequest("ALL");
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
            for (int i = 0; i < actualLibraries.size(); i++) {
                String actualLibrary = actualLibraries.get(i).getAsJsonObject().get("name").getAsString();
                String expectedLibrary = testConfig.expectedLibraries().get(i).name;
                if (!actualLibrary.equals(expectedLibrary)) {
                    log.info("Library mismatch at index " + i + ": expected '" + expectedLibrary + "', got '" +
                            actualLibrary + "'");
                    assertFailure = true;
                    break;
                }

                // Verify description based on expected value
                JsonElement descriptionElement = actualLibraries.get(i).getAsJsonObject().get("description");
                String actualDescription = (descriptionElement != null && !descriptionElement.isJsonNull())
                        ? descriptionElement.getAsString() : null;
                String expectedDescription = testConfig.expectedLibraries().get(i).description;

                // Check if the actual description matches the expected description
                boolean isActualEmpty = actualDescription == null || actualDescription.trim().isEmpty();
                boolean isExpectedEmpty = expectedDescription == null || expectedDescription.trim().isEmpty();

                if (isActualEmpty != isExpectedEmpty) {
                    if (isExpectedEmpty) {
                        log.info("Expected empty description but got non-empty description for library at index "
                                + i + ": '" + actualLibrary + "' - actual: '" + actualDescription + "'");
                    } else {
                        log.info("Expected non-empty description but got empty description for library at index "
                                + i + ": '" + actualLibrary + "'");
                    }
                    assertFailure = true;
                    break;
                }
            }
        }

        if (assertFailure) {
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "copilot_library";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return GetLibrariesListFromSearchIndex.class;
    }

    @Override
    protected String getApiName() {
        return "getLibrariesList";
    }

    @Override
    protected String getServiceName() {
        return "copilotLibraryManager";
    }

    /**
     * Represents the test configuration for the getLibrariesList1 API.
     *
     * @param description       The description of the test
     * @param expectedLibraries The expected list of libraries
     */
    private record TestConfig(String description, List<CompactLibrary> expectedLibraries) {

        public String description() {
            return description == null ? "" : description;
        }
    }

    private record CompactLibrary(String name, String description) {
        // Compact representation of a library with only name and description
    }
}
