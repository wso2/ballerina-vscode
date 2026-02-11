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
 * Test cases for getFilteredLibrariesFromSemanticModel method.
 * Tests the functionality of retrieving filtered libraries using the semantic model.
 * Specifically focuses on verifying internal and external link references.
 *
 * @since 1.0.0
 */
public class GetFilteredLibrariesFromSemanticModel extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("get_filtered_libraries_from_semantic_api.json")},
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        // Create request with library names to filter
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
            // Verify that each returned library matches the expected library structure
            for (int i = 0; i < actualLibraries.size(); i++) {
                JsonObject actualLibrary = actualLibraries.get(i).getAsJsonObject();
                Library expectedLibrary = testConfig.expectedLibraries().get(i);

                if (!actualLibrary.has("name")) {
                    log.info("Library object at index " + i + " missing 'name' field");
                    assertFailure = true;
                    break;
                }

                String actualLibraryName = actualLibrary.get("name").getAsString();
                if (!actualLibraryName.equals(expectedLibrary.name())) {
                    log.info("Library mismatch at index " + i + ": expected '" + expectedLibrary.name() +
                            "', got '" + actualLibraryName + "'");
                    assertFailure = true;
                    break;
                }

                // Verify complete library structure (should have typeDefs, clients, functions)
                if (!actualLibrary.has("typeDefs") || !actualLibrary.has("clients") ||
                        !actualLibrary.has("functions")) {
                    log.info("Library '" + actualLibraryName + "' missing required fields");
                    assertFailure = true;
                    break;
                }

                // Verify links in the library
                if (!verifyLinksInLibrary(actualLibrary)) {
                    log.info("Link verification failed for library: " + actualLibraryName);
                    assertFailure = true;
                    break;
                }
            }
        }

        if (assertFailure) {
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    /**
     * Verifies that all links in a library have proper structure.
     * Internal links should have recordName but NOT libraryName.
     * External links should have both recordName and libraryName.
     */
    private boolean verifyLinksInLibrary(JsonObject library) {
        // Verify links in typeDefs
        if (library.has("typeDefs")) {
            if (!verifyLinksInTypeDefs(library.getAsJsonArray("typeDefs"))) {
                return false;
            }
        }

        // Verify links in clients
        if (library.has("clients")) {
            JsonArray clients = library.getAsJsonArray("clients");
            for (JsonElement clientElement : clients) {
                JsonObject client = clientElement.getAsJsonObject();
                if (client.has("functions")) {
                    if (verifyLinksInFunctions(client.getAsJsonArray("functions"))) {
                        return false;
                    }
                }
            }
        }

        // Verify links in functions
        if (library.has("functions")) {
            if (verifyLinksInFunctions(library.getAsJsonArray("functions"))) {
                return false;
            }
        }

        return true;
    }

    /**
     * Verifies links in type definitions.
     */
    private boolean verifyLinksInTypeDefs(JsonArray typeDefs) {
        for (JsonElement typeDefElement : typeDefs) {
            JsonObject typeDef = typeDefElement.getAsJsonObject();

            if (typeDef.has("fields")) {
                JsonArray fields = typeDef.getAsJsonArray("fields");
                for (JsonElement fieldElement : fields) {
                    JsonObject field = fieldElement.getAsJsonObject();
                    if (field.has("type")) {
                        JsonObject typeObj = field.getAsJsonObject("type");
                        if (typeObj.has("links")) {
                            if (verifyLinkStructure(typeObj.getAsJsonArray("links"))) {
                                return false;
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

    /**
     * Verifies links in functions.
     */
    private boolean verifyLinksInFunctions(JsonArray functions) {
        for (JsonElement funcElement : functions) {
            JsonObject func = funcElement.getAsJsonObject();

            // Check links in parameters
            if (func.has("parameters")) {
                JsonArray parameters = func.getAsJsonArray("parameters");
                for (JsonElement paramElement : parameters) {
                    JsonObject param = paramElement.getAsJsonObject();
                    if (param.has("type")) {
                        JsonObject typeObj = param.getAsJsonObject("type");
                        if (typeObj.has("links")) {
                            if (verifyLinkStructure(typeObj.getAsJsonArray("links"))) {
                                return true;
                            }
                        }
                    }
                }
            }

            // Check links in return type
            if (func.has("return")) {
                JsonObject returnObj = func.getAsJsonObject("return");
                if (returnObj.has("type")) {
                    JsonObject typeObj = returnObj.getAsJsonObject("type");
                    if (typeObj.has("links")) {
                        if (verifyLinkStructure(typeObj.getAsJsonArray("links"))) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * Verifies the structure of link objects.
     * Internal links must have recordName but NOT libraryName.
     * External links must have both recordName and libraryName.
     */
    private boolean verifyLinkStructure(JsonArray links) {
        for (JsonElement linkElement : links) {
            JsonObject link = linkElement.getAsJsonObject();

            if (!link.has("category")) {
                log.info("Link missing 'category' field");
                return true;
            }

            String category = link.get("category").getAsString();

            if ("internal".equals(category)) {
                if (!link.has("recordName")) {
                    log.info("Internal link missing 'recordName' field");
                    return true;
                }
                if (link.has("libraryName")) {
                    log.info("Internal link should NOT have 'libraryName' field");
                    return true;
                }
            } else if ("external".equals(category)) {
                if (!link.has("recordName")) {
                    log.info("External link missing 'recordName' field");
                    return true;
                }
                if (!link.has("libraryName")) {
                    log.info("External link missing 'libraryName' field");
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Test internal links - types that reference other types within the same package.
     * For example, in ballerina/http, OAuth2GrantConfig has internal links to other http types.
     */
    @Test
    public void testInternalLinks() throws IOException {
        GetSelectedLibrariesRequest request = new GetSelectedLibrariesRequest(
                new String[]{"ballerina/http"}
        );
        JsonElement response = getResponse(request);
        JsonArray libraries = response.getAsJsonObject().getAsJsonArray("libraries");

        Assert.assertFalse(libraries.isEmpty(), "Response should not be empty for ballerina/http");

        JsonObject httpLibrary = libraries.get(0).getAsJsonObject();
        Assert.assertEquals(httpLibrary.get("name").getAsString(), "ballerina/http");

        // Count internal links
        int internalLinkCount = countLinksInLibrary(httpLibrary, "internal");

        // ballerina/http should have internal links (e.g., OAuth2GrantConfig references other http types)
        Assert.assertTrue(internalLinkCount > 0,
                "ballerina/http should have internal links between its own types");
    }

    /**
     * Test external links - types that reference types from other packages.
     * For example, ballerina/http uses types from ballerina/auth.
     */
    @Test
    public void testExternalLinks() throws IOException {
        GetSelectedLibrariesRequest request = new GetSelectedLibrariesRequest(
                new String[]{"ballerina/http"}
        );
        JsonElement response = getResponse(request);
        JsonArray libraries = response.getAsJsonObject().getAsJsonArray("libraries");

        Assert.assertFalse(libraries.isEmpty(), "Response should not be empty");

        JsonObject library = libraries.get(0).getAsJsonObject();

        // Count external links
        int externalLinkCount = countLinksInLibrary(library, "external");

        // ballerina/http should have external links (e.g., to ballerina/auth types)
        Assert.assertTrue(externalLinkCount > 0,
                "ballerina/http should have external links to other libraries");

        // Verify that external links have proper libraryName
        boolean hasValidExternalLink = hasValidExternalLinks(library);
        Assert.assertTrue(hasValidExternalLink,
                "External links should have valid libraryName field");
    }

    /**
     * Test that multiple libraries are retrieved correctly with proper link references.
     * When requesting both ballerina/http and ballerina/io, both should be returned.
     */
    @Test
    public void testMultipleLibrariesWithLinks() throws IOException {
        GetSelectedLibrariesRequest request = new GetSelectedLibrariesRequest(
                new String[]{"ballerina/http", "ballerina/io"}
        );
        JsonElement response = getResponse(request);
        JsonArray libraries = response.getAsJsonObject().getAsJsonArray("libraries");

        // Should return both libraries
        Assert.assertTrue(libraries.size() >= 2,
                "Should return at least 2 libraries when both are requested");

        // Verify both libraries are present
        boolean hasHttp = false;
        boolean hasIo = false;

        for (JsonElement libElement : libraries) {
            JsonObject lib = libElement.getAsJsonObject();
            String libName = lib.get("name").getAsString();
            if ("ballerina/http".equals(libName)) {
                hasHttp = true;
                // Verify structure
                Assert.assertTrue(lib.has("description"), "ballerina/http should have description");
                Assert.assertTrue(lib.has("typeDefs"), "ballerina/http should have typeDefs");
                Assert.assertTrue(lib.has("clients"), "ballerina/http should have clients");
                Assert.assertTrue(lib.has("functions"), "ballerina/http should have functions");

                // Verify links
                Assert.assertTrue(verifyLinksInLibrary(lib),
                        "ballerina/http should have valid link structure");
            } else if ("ballerina/io".equals(libName)) {
                hasIo = true;
                // Verify structure
                Assert.assertTrue(lib.has("description"), "ballerina/io should have description");
                Assert.assertTrue(lib.has("typeDefs"), "ballerina/io should have typeDefs");
                Assert.assertTrue(lib.has("functions"), "ballerina/io should have functions");

                // Verify links
                Assert.assertTrue(verifyLinksInLibrary(lib),
                        "ballerina/io should have valid link structure");
            }
        }

        Assert.assertTrue(hasHttp, "Response should include ballerina/http");
        Assert.assertTrue(hasIo, "Response should include ballerina/io");
    }

    /**
     * Counts the number of links of a specific category in a library.
     */
    private int countLinksInLibrary(JsonObject library, String category) {
        int count = 0;

        // Count in typeDefs
        if (library.has("typeDefs")) {
            count += countLinksInTypeDefs(library.getAsJsonArray("typeDefs"), category);
        }

        // Count in clients
        if (library.has("clients")) {
            JsonArray clients = library.getAsJsonArray("clients");
            for (JsonElement clientElement : clients) {
                JsonObject client = clientElement.getAsJsonObject();
                if (client.has("functions")) {
                    count += countLinksInFunctions(client.getAsJsonArray("functions"), category);
                }
            }
        }

        // Count in functions
        if (library.has("functions")) {
            count += countLinksInFunctions(library.getAsJsonArray("functions"), category);
        }

        return count;
    }

    /**
     * Counts links in type definitions.
     */
    private int countLinksInTypeDefs(JsonArray typeDefs, String category) {
        int count = 0;
        for (JsonElement typeDefElement : typeDefs) {
            JsonObject typeDef = typeDefElement.getAsJsonObject();

            if (typeDef.has("fields")) {
                JsonArray fields = typeDef.getAsJsonArray("fields");
                for (JsonElement fieldElement : fields) {
                    JsonObject field = fieldElement.getAsJsonObject();
                    if (field.has("type")) {
                        JsonObject typeObj = field.getAsJsonObject("type");
                        if (typeObj.has("links")) {
                            count += countLinksByCategory(typeObj.getAsJsonArray("links"), category);
                        }
                    }
                }
            }
        }
        return count;
    }

    /**
     * Counts links in functions.
     */
    private int countLinksInFunctions(JsonArray functions, String category) {
        int count = 0;
        for (JsonElement funcElement : functions) {
            JsonObject func = funcElement.getAsJsonObject();

            // Count in parameters
            if (func.has("parameters")) {
                JsonArray parameters = func.getAsJsonArray("parameters");
                for (JsonElement paramElement : parameters) {
                    JsonObject param = paramElement.getAsJsonObject();
                    if (param.has("type")) {
                        JsonObject typeObj = param.getAsJsonObject("type");
                        if (typeObj.has("links")) {
                            count += countLinksByCategory(typeObj.getAsJsonArray("links"), category);
                        }
                    }
                }
            }

            // Count in return type
            if (func.has("return")) {
                JsonObject returnObj = func.getAsJsonObject("return");
                if (returnObj.has("type")) {
                    JsonObject typeObj = returnObj.getAsJsonObject("type");
                    if (typeObj.has("links")) {
                        count += countLinksByCategory(typeObj.getAsJsonArray("links"), category);
                    }
                }
            }
        }
        return count;
    }

    /**
     * Counts links of a specific category.
     */
    private int countLinksByCategory(JsonArray links, String category) {
        int count = 0;
        for (JsonElement linkElement : links) {
            JsonObject link = linkElement.getAsJsonObject();
            if (link.has("category") && link.get("category").getAsString().equals(category)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Checks if a library has valid external links with proper libraryName.
     */
    private boolean hasValidExternalLinks(JsonObject library) {
        // Check in typeDefs
        if (library.has("typeDefs")) {
            if (hasValidExternalLinksInTypeDefs(library.getAsJsonArray("typeDefs"))) {
                return true;
            }
        }

        // Check in clients
        if (library.has("clients")) {
            JsonArray clients = library.getAsJsonArray("clients");
            for (JsonElement clientElement : clients) {
                JsonObject client = clientElement.getAsJsonObject();
                if (client.has("functions")) {
                    if (hasValidExternalLinksInFunctions(client.getAsJsonArray("functions"))) {
                        return true;
                    }
                }
            }
        }

        // Check in functions
        if (library.has("functions")) {
            return hasValidExternalLinksInFunctions(library.getAsJsonArray("functions"));
        }

        return false;
    }

    /**
     * Checks for valid external links in type definitions.
     */
    private boolean hasValidExternalLinksInTypeDefs(JsonArray typeDefs) {
        for (JsonElement typeDefElement : typeDefs) {
            JsonObject typeDef = typeDefElement.getAsJsonObject();

            if (typeDef.has("fields")) {
                JsonArray fields = typeDef.getAsJsonArray("fields");
                for (JsonElement fieldElement : fields) {
                    JsonObject field = fieldElement.getAsJsonObject();
                    if (field.has("type")) {
                        JsonObject typeObj = field.getAsJsonObject("type");
                        if (typeObj.has("links")) {
                            JsonArray links = typeObj.getAsJsonArray("links");
                            for (JsonElement linkElement : links) {
                                JsonObject link = linkElement.getAsJsonObject();
                                if (link.has("category") &&
                                        link.get("category").getAsString().equals("external") &&
                                        link.has("recordName") &&
                                        link.has("libraryName")) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * Checks for valid external links in functions.
     */
    private boolean hasValidExternalLinksInFunctions(JsonArray functions) {
        for (JsonElement funcElement : functions) {
            JsonObject func = funcElement.getAsJsonObject();

            // Check in parameters
            if (func.has("parameters")) {
                JsonArray parameters = func.getAsJsonArray("parameters");
                for (JsonElement paramElement : parameters) {
                    JsonObject param = paramElement.getAsJsonObject();
                    if (param.has("type")) {
                        JsonObject typeObj = param.getAsJsonObject("type");
                        if (typeObj.has("links")) {
                            JsonArray links = typeObj.getAsJsonArray("links");
                            for (JsonElement linkElement : links) {
                                JsonObject link = linkElement.getAsJsonObject();
                                if (link.has("category") &&
                                        link.get("category").getAsString().equals("external") &&
                                        link.has("recordName") &&
                                        link.has("libraryName")) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }

            // Check in return type
            if (func.has("return")) {
                JsonObject returnObj = func.getAsJsonObject("return");
                if (returnObj.has("type")) {
                    JsonObject typeObj = returnObj.getAsJsonObject("type");
                    if (typeObj.has("links")) {
                        JsonArray links = typeObj.getAsJsonArray("links");
                        for (JsonElement linkElement : links) {
                            JsonObject link = linkElement.getAsJsonObject();
                            if (link.has("category") &&
                                    link.get("category").getAsString().equals("external") &&
                                    link.has("recordName") &&
                                    link.has("libraryName")) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    @Override
    protected String getResourceDir() {
        return "copilot_library";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return GetFilteredLibrariesFromSemanticModel.class;
    }

    @Override
    protected String getApiName() {
        return "getFilteredLibrariesFromSemanticModel";
    }

    @Override
    protected String getServiceName() {
        return "copilotLibraryManager";
    }

    /**
     * Test configuration record.
     *
     * @param description The description of the test
     * @param libNames Array of library names to filter
     * @param expectedLibraries The expected list of libraries
     */
    public record TestConfig(String description, List<String> libNames, List<Library> expectedLibraries) {
    }

    /**
     * Library record for expected library structure.
     *
     * @param name The library name
     * @param description The library description
     * @param typeDefs Type definitions
     * @param clients Client definitions
     * @param functions Function definitions
     */
    public record Library(String name, String description, List<Object> typeDefs, List<Object> clients,
                          List<Object> functions) {
    }
}
