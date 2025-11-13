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

import com.google.gson.JsonObject;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import io.ballerina.projectservice.core.ProjectMigrationNotification;
import io.ballerina.projectservice.extension.request.ImportMuleRequest;
import io.ballerina.projectservice.extension.response.ImportMuleResponse;
import org.ballerinalang.langserver.commons.client.ExtendedLanguageClient;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.testng.Assert;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

/**
 * Test class for multi-root Mule import functionality with per-project notification capture.
 * <p>
 * This test validates that multi-root migrations properly send per-project notifications via the client callback before
 * returning the final workspace-level response.
 * <p>
 * Test resources are located in src/test/resources/import-mule/config/ JSON configurations include expected output and
 * expected project notifications.
 * <p>
 * To update test configurations when the migration tool output changes, developers can uncomment the updateConfig()
 * calls in this test.
 *
 * @since 1.2.0
 */
public class ImportMultiRootMigrationTest extends AbstractLSTest {

    private ExtendedLanguageClient mockClient;

    @BeforeClass(dependsOnMethods = {"init"})
    public void setupMockClient() {
        // Create and inject mock client into language server context to capture notifications
        mockClient = Mockito.mock(ExtendedLanguageClient.class);
        languageServer.getServerContext().put(ExtendedLanguageClient.class, mockClient);
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        BufferedReader bufferedReader = Files.newBufferedReader(configJsonPath);
        TestConfig testConfig = gson.fromJson(bufferedReader, TestConfig.class);
        bufferedReader.close();

        // Verify this is a multi-root test scenario
        Map<String, String> parameters = testConfig.parameters();
        Assert.assertNotNull(parameters, "Test parameters should not be null");
        String multiRootValue = parameters.getOrDefault("multiRoot", "false");
        Assert.assertEquals(multiRootValue, "true",
                "ImportMultiRootMigrationTest is for multi-root migrations. Use multiRoot=true in parameters.");

        // Execute multi-root import request
        ImportMuleRequest request = new ImportMuleRequest("ballerina", "",
                sourceDir.resolve(testConfig.projectPath()).toAbsolutePath().toString(),
                parameters);
        JsonObject response = getResponse(request).getAsJsonObject();

        // Parse responses
        ImportMuleResponse actualToolResponse = gson.fromJson(response, ImportMuleResponse.class);
        ImportMuleResponse expectedToolResponse = gson.fromJson(testConfig.output(), ImportMuleResponse.class);

        // Capture all pushMigratedProject notifications
        ArgumentCaptor<ProjectMigrationNotification> notificationCaptor =
                ArgumentCaptor.forClass(ProjectMigrationNotification.class);
        Mockito.verify(mockClient, Mockito.atLeastOnce()).pushMigratedProject(notificationCaptor.capture());

        List<ProjectMigrationNotification> capturedNotifications = notificationCaptor.getAllValues();

        // Validate captured notifications
        Assert.assertFalse(capturedNotifications.isEmpty(),
                "At least one project notification should be captured for multi-root migration");

        boolean notificationsMatch = validateProjectNotifications(capturedNotifications, testConfig.notifications());
        validateRootLevelResponse(actualToolResponse);

        // Verify final response matches expected output
        if (!actualToolResponse.equals(expectedToolResponse) || !notificationsMatch) {
            compareJsonElements(gson.toJsonTree(actualToolResponse),
                    gson.toJsonTree(expectedToolResponse));
            TestConfig updatedConfig = new TestConfig(testConfig.description(),
                    testConfig.projectPath(), testConfig.parameters(), response, capturedNotifications);
            // updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    /**
     * Validates that captured notifications match expected notifications from the test configuration.
     *
     * @param capturedNotifications The notifications captured from client calls
     * @param expectedNotifications The expected notifications from the test config
     * @return true if all notifications match, false otherwise
     */
    private boolean validateProjectNotifications(List<ProjectMigrationNotification> capturedNotifications,
                                                 List<ProjectMigrationNotification> expectedNotifications) {
        Assert.assertEquals(capturedNotifications.size(), expectedNotifications.size(),
                String.format("Expected %d notifications but got %d",
                        expectedNotifications.size(), capturedNotifications.size()));

        // Build a map of captured notifications by project name for easier comparison
        Map<String, ProjectMigrationNotification> capturedByProject = new java.util.HashMap<>();
        for (ProjectMigrationNotification notification : capturedNotifications) {
            capturedByProject.put(notification.projectName(), notification);
        }

        boolean allMatch = true;

        // Validate each expected notification
        for (ProjectMigrationNotification expected : expectedNotifications) {
            String projectName = expected.projectName();
            Assert.assertTrue(capturedByProject.containsKey(projectName),
                    "Expected notification for project: " + projectName);

            ProjectMigrationNotification actual = capturedByProject.get(projectName);

            // Validate text edits are present and non-empty
            Map<String, String> actualEdits = actual.textEdits();
            Map<String, String> expectedEdits = expected.textEdits();
            Assert.assertNotNull(actualEdits, "Text edits should not be null for project: " + projectName);
            Assert.assertFalse(actualEdits.isEmpty(),
                    "Text edits should not be empty for project: " + projectName);

            // Compare text edits
            if (!actualEdits.equals(expectedEdits)) {
                allMatch = false;
                compareJsonElements(gson.toJsonTree(actualEdits), gson.toJsonTree(expectedEdits));
            }

            // Validate report is present and contains expected content
            String actualReport = actual.report();
            Assert.assertNotNull(actualReport, "Report should not be null for project: " + projectName);
            Assert.assertFalse(actualReport.isEmpty(),
                    "Report should not be empty for project: " + projectName);
            Assert.assertTrue(actualReport.contains("<!DOCTYPE html") ||
                            actualReport.contains("<html") ||
                            actualReport.contains("Migration"),
                    "Report should contain migration information for project: " + projectName);
        }

        return allMatch;
    }

    /**
     * Validates that the final response contains only root-level edits and not project-specific files.
     *
     * @param response The final import response
     */
    private void validateRootLevelResponse(ImportMuleResponse response) {
        Assert.assertNotNull(response, "Response should not be null");

        Map<String, String> textEdits = response.textEdits();
        Assert.assertNotNull(textEdits, "Response should contain text edits");

        // Root-level response should contain workspace-level files like Ballerina.toml
        Assert.assertTrue(textEdits.containsKey("Ballerina.toml"),
                "Root response should contain workspace Ballerina.toml");
        Assert.assertTrue(textEdits.containsKey("aggregate_migration_report.html"),
                "Root response should contain aggregate migration report");
    }

    @Override
    protected String getResourceDir() {
        return "import-mule-multiroot";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return ImportMultiRootMigrationTest.class;
    }

    @Override
    protected String getServiceName() {
        return "projectService";
    }

    @Override
    protected String getApiName() {
        return "importMule";
    }

    /**
     * Test configuration that includes both response output and expected notifications. This allows comprehensive
     * testing of multi-root migrations including client-side notification handling.
     *
     * @param description   Description of the test case
     * @param projectPath   Path to the Mule project(s)
     * @param parameters    Parameters for Mule import (must include multiRoot=true)
     * @param output        Expected output response as a JSON object
     * @param notifications Expected project notifications (array of ProjectMigrationNotification)
     */
    private record TestConfig(String description, String projectPath, Map<String, String> parameters,
                              JsonObject output, List<ProjectMigrationNotification> notifications) {

        public String description() {
            return description == null ? "" : description;
        }

        public Map<String, String> parameters() {
            return parameters == null ? Map.of() : parameters;
        }

        public List<ProjectMigrationNotification> notifications() {
            return notifications == null ? List.of() : notifications;
        }
    }
}
