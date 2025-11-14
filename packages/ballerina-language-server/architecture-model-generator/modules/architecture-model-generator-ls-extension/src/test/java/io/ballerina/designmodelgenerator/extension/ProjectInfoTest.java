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

package io.ballerina.designmodelgenerator.extension;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import io.ballerina.designmodelgenerator.extension.request.ProjectInfoRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

/**
 * Tests for getting project info.
 *
 * @since 1.4.2
 */
public class ProjectInfoTest extends AbstractLSTest {

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);
        ProjectInfoRequest request = new ProjectInfoRequest(getSourcePath(testConfig.source()));
        JsonObject response = getResponse(request);

        // Remove errorMsg and stacktrace fields before comparison (handled by getResponse)
        response.remove("errorMsg");
        response.remove("stacktrace");

        // Normalize URIs in actual response for comparison
        JsonElement normalizedResponse = normalizeUris(response, sourceDir);
        JsonElement expected = testConfig.output();

        if (!normalizedResponse.equals(expected)) {
            TestConfig updatedConfig =
                    new TestConfig(testConfig.description(), testConfig.source(), normalizedResponse.getAsJsonObject());
//            updateConfig(configJsonPath, updatedConfig);
            compareJsonElements(normalizedResponse, expected);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return ProjectInfoTest.class;
    }

    @Override
    protected String getResourceDir() {
        return "project_info";
    }

    @Override
    protected String getServiceName() {
        return "designModelService";
    }

    @Override
    protected String getApiName() {
        return "projectInfo";
    }

    /**
     * Normalizes URIs in the JSON response to relative paths for testing. Converts absolute file:// URIs to paths
     * relative to the source directory.
     *
     * @param element The JSON element to normalize
     * @param baseDir The base directory for relative path calculation
     * @return A new JsonElement with normalized URIs
     */
    private JsonElement normalizeUris(JsonElement element, Path baseDir) {
        if (element.isJsonObject()) {
            return normalizeUrisInObject(element.getAsJsonObject(), baseDir);
        } else if (element.isJsonArray()) {
            return normalizeUrisInArray(element.getAsJsonArray(), baseDir);
        }
        return element;
    }

    private JsonObject normalizeUrisInObject(JsonObject object, Path baseDir) {
        JsonObject normalized = new JsonObject();
        for (Map.Entry<String, JsonElement> entry : object.entrySet()) {
            String key = entry.getKey();
            JsonElement value = entry.getValue();

            if ("projectPath".equals(key) && value.isJsonPrimitive() && value.getAsJsonPrimitive().isString()) {
                // Convert absolute URI to relative path
                String uriString = value.getAsString();
                String relativePath = normalizeUriToRelativePath(uriString, baseDir);
                normalized.addProperty(key, relativePath);
            } else {
                // Recursively process nested elements
                normalized.add(key, normalizeUris(value, baseDir));
            }
        }
        return normalized;
    }

    private JsonArray normalizeUrisInArray(JsonArray array, Path baseDir) {
        JsonArray normalized = new JsonArray();
        for (JsonElement element : array) {
            normalized.add(normalizeUris(element, baseDir));
        }
        return normalized;
    }

    private String normalizeUriToRelativePath(String uriString, Path baseDir) {
        try {
            // Handle file:// URIs
            if (uriString.startsWith("file://")) {
                Path absolutePath = Paths.get(new URI(uriString));
                Path relativePath = baseDir.relativize(absolutePath);
                return relativePath.toString().replace('\\', '/');
            }
        } catch (Exception e) {
            // If conversion fails, return original URI
        }
        return uriString;
    }

    public record TestConfig(String description, String source, JsonObject output) {

    }
}
