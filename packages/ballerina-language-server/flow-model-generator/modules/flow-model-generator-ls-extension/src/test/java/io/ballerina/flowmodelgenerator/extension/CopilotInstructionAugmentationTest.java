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
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Path;

/**
 * Integration tests for the Copilot instruction augmentation functionality.
 * Verifies that custom instructions from resource files are correctly added to libraries.
 *
 * @since 1.0.1
 */
public class CopilotInstructionAugmentationTest extends AbstractLSTest {

    private static final String FIELD_NAME = "name";
    private static final String FIELD_INSTRUCTIONS = "instructions";
    private static final String FIELD_SERVICES = "services";
    private static final String FIELD_TYPE = "type";
    private static final String FIELD_TEST_GENERATION_INSTRUCTION = "testGenerationInstruction";
    private static final String TYPE_GENERIC = "generic";

    @Test
    public void testHttpInstructionsAugmented() {
        // ballerina/http has: service.md, test.md (no library.md)
        JsonObject http = fetchLibrary("ballerina/http");

        Assert.assertFalse(http.has(FIELD_INSTRUCTIONS),
                "ballerina/http should not have library-level instructions");
        assertGenericServicesHaveInstruction(http, "Service writing instructions");
        assertAllServicesHaveTestInstruction(http);
    }

    @Test
    public void testGraphqlInstructionsAugmented() {
        // ballerina/graphql has: service.md (no library.md, no test.md)
        JsonObject graphql = fetchLibrary("ballerina/graphql");

        Assert.assertFalse(graphql.has(FIELD_INSTRUCTIONS),
                "ballerina/graphql should not have library-level instructions");
        assertGenericServicesHaveInstruction(graphql, null);
        assertNoServicesHaveTestInstruction(graphql);
    }

    @Test
    public void testBallerinaTestInstructionsAugmented() {
        // ballerina/test has: library.md (no service.md, no test.md)
        JsonObject testLib = fetchLibrary("ballerina/test");

        Assert.assertTrue(testLib.has(FIELD_INSTRUCTIONS),
                "ballerina/test should have library-level instructions");
        Assert.assertFalse(testLib.get(FIELD_INSTRUCTIONS).getAsString().isEmpty(),
                "ballerina/test library instructions should not be empty");
    }

    private JsonObject fetchLibrary(String libraryName) {
        GetSelectedLibrariesRequest request = new GetSelectedLibrariesRequest(
                new String[]{libraryName});
        JsonElement response;
        try {
            response = getResponse(request);
        } catch (IOException e) {
            throw new RuntimeException("Failed to fetch library: " + libraryName, e);
        }
        JsonArray libraries = response.getAsJsonObject().getAsJsonArray("libraries");

        Assert.assertNotNull(libraries, "Libraries array should not be null");
        Assert.assertEquals(libraries.size(), 1, "Should return exactly one library");

        JsonObject library = libraries.get(0).getAsJsonObject();
        Assert.assertEquals(library.get(FIELD_NAME).getAsString(), libraryName);
        return library;
    }

    private void assertGenericServicesHaveInstruction(JsonObject library, String expectedSubstring) {
        if (!library.has(FIELD_SERVICES)) {
            return;
        }
        JsonArray services = library.getAsJsonArray(FIELD_SERVICES);
        for (JsonElement serviceElement : services) {
            JsonObject service = serviceElement.getAsJsonObject();
            if (isGenericService(service)) {
                Assert.assertTrue(service.has(FIELD_INSTRUCTIONS),
                        "Generic service should have instructions");
                String instruction = service.get(FIELD_INSTRUCTIONS).getAsString();
                Assert.assertFalse(instruction.isEmpty(),
                        "Generic service instructions should not be empty");
                if (expectedSubstring != null) {
                    Assert.assertTrue(instruction.contains(expectedSubstring),
                            "Service instruction should contain: " + expectedSubstring);
                }
            }
        }
    }

    private void assertAllServicesHaveTestInstruction(JsonObject library) {
        if (!library.has(FIELD_SERVICES)) {
            return;
        }
        JsonArray services = library.getAsJsonArray(FIELD_SERVICES);
        for (JsonElement serviceElement : services) {
            JsonObject service = serviceElement.getAsJsonObject();
            Assert.assertTrue(service.has(FIELD_TEST_GENERATION_INSTRUCTION),
                    "Service should have testGenerationInstruction");
            Assert.assertFalse(service.get(FIELD_TEST_GENERATION_INSTRUCTION).getAsString().isEmpty(),
                    "testGenerationInstruction should not be empty");
        }
    }

    private void assertNoServicesHaveTestInstruction(JsonObject library) {
        if (!library.has(FIELD_SERVICES)) {
            return;
        }
        JsonArray services = library.getAsJsonArray(FIELD_SERVICES);
        for (JsonElement serviceElement : services) {
            JsonObject service = serviceElement.getAsJsonObject();
            Assert.assertFalse(service.has(FIELD_TEST_GENERATION_INSTRUCTION),
                    "Service should not have testGenerationInstruction");
        }
    }

    private boolean isGenericService(JsonObject service) {
        return service.has(FIELD_TYPE) &&
                TYPE_GENERIC.equals(service.get(FIELD_TYPE).getAsString());
    }

    @Override
    protected Object[] getConfigsList() {
        return new Object[0];
    }

    @Override
    @Test(enabled = false)
    public void test(Path config) throws IOException {
        // Not used - tests are defined as individual methods above
    }

    @Override
    protected String getResourceDir() {
        return "copilot_library";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return CopilotInstructionAugmentationTest.class;
    }

    @Override
    protected String getApiName() {
        return "getFilteredLibraries";
    }

    @Override
    protected String getServiceName() {
        return "copilotLibraryManager";
    }
}
