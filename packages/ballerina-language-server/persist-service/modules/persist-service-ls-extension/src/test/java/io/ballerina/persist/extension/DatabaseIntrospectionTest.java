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
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.Assert;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Tests for database introspection functionality of Persist Service.
 *
 * @since 1.5.0
 */
public class DatabaseIntrospectionTest extends AbstractLSTest {

    @BeforeClass
    public void setup() {
        // Verify Docker containers are running
        log.info("Starting database introspection tests...");
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        BufferedReader bufferedReader = Files.newBufferedReader(configJsonPath);
        TestConfig testConfig = gson.fromJson(bufferedReader, TestConfig.class);
        bufferedReader.close();

        DatabaseIntrospectionRequest request = new DatabaseIntrospectionRequest(
                sourceDir.resolve(testConfig.testProjectFolder()).toAbsolutePath().toString(),
                testConfig.name(),
                testConfig.dbSystem(),
                testConfig.host(),
                testConfig.port(),
                testConfig.user(),
                testConfig.password(),
                testConfig.database()
        );

        JsonObject response = getResponse(request);

        // Check if tables array exists in response
        if (!response.has("tables") || response.get("tables").isJsonNull()) {
            Assert.fail("Database introspection failed: No tables returned in response");
        }

        String[] tables = gson.fromJson(response.get("tables"), String[].class);
        assertResults(tables, testConfig, configJsonPath);
    }

    private void assertResults(String[] actualTables, TestConfig testConfig, Path configJsonPath) {
        boolean assertFailure = false;

        if (actualTables == null || actualTables.length == 0) {
            log.info("No tables found in the database.");
            assertFailure = true;
        }

        String[] expectedTables = testConfig.expectedTables();
        if (expectedTables != null && expectedTables.length > 0) {
            if (actualTables != null && actualTables.length != expectedTables.length) {
                log.info("The number of tables does not match the expected count.");
                log.info("Expected: " + String.join(", ", expectedTables));
                log.info("Actual: " + String.join(", ", actualTables));
                assertFailure = true;
            } else {
                // Check if all expected tables are present
                for (String expectedTable : expectedTables) {
                    boolean found = false;
                    if (actualTables != null) {
                        for (String actualTable : actualTables) {
                            if (actualTable.equalsIgnoreCase(expectedTable)) {
                                found = true;
                                break;
                            }
                        }
                    }
                    if (!found) {
                        log.info("Expected table '" + expectedTable + "' not found in actual tables.");
                        assertFailure = true;
                    }
                }
            }
        }

        if (assertFailure) {
            // Uncomment to update config file with actual results
            // TestConfig updatedConfig = new TestConfig(...);
            // updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
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
     * Represents the test configuration for database introspection test.
     *
     * @param description       The description of the test.
     * @param testProjectFolder The test project folder path.
     * @param name              Name of the database connector.
     * @param dbSystem          Database system type (mysql, postgresql, mssql).
     * @param host              Database host address.
     * @param port              Database port number.
     * @param user              Database username.
     * @param password          Database user password.
     * @param database          Name of the database to connect.
     * @param expectedTables    Expected table names in the database.
     */
    private record TestConfig(String description, String testProjectFolder, String name,
                              String dbSystem, String host, Integer port,
                              String user, String password, String database,
                              String[] expectedTables) {

        public String description() {
            return description == null ? "" : description;
        }
    }
}
