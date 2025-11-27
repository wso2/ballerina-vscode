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

import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Path;

/**
 * Tests for PersistClientService.
 *
 * @since 1.5.0
 */
public class PersistClientServiceTest extends AbstractLSTest {

    /**
     * Test for database introspection.
     * Note: This test requires an actual database connection.
     * Consider using test containers or mocking for CI/CD environments.
     */
    @Test(enabled = false, description = "Test database introspection")
    public void testIntrospectDatabase() {
        // TODO: Implement test with test database or mocking
        // DatabaseIntrospectionRequest request = new DatabaseIntrospectionRequest();
        // request.setProjectPath(getConfigPath() + "/project");
        // request.setName("test_db");
        // request.setDbSystem("mysql");
        // request.setHost("localhost");
        // request.setPort(3306);
        // request.setUser("root");
        // request.setPassword("password");
        // request.setDatabase("test");

        // PersistClientService service = new PersistClientService();
        // CompletableFuture<DatabaseIntrospectionResponse> future = service.introspectDatabase(request);
        // DatabaseIntrospectionResponse response = future.get();

        // Assert.assertNotNull(response.getTables());
    }

    /**
     * Test for persist client generation.
     * Note: This test requires an actual database connection.
     * Consider using test containers or mocking for CI/CD environments.
     */
    @Test(enabled = false, description = "Test persist client generation")
    public void testGeneratePersistClient() {
        // TODO: Implement test with test database or mocking
        // PersistClientGeneratorRequest request = new PersistClientGeneratorRequest();
        // request.setProjectPath(getConfigPath() + "/project");
        // request.setName("test_db");
        // request.setDbSystem("mysql");
        // request.setHost("localhost");
        // request.setPort(3306);
        // request.setUser("root");
        // request.setPassword("password");
        // request.setDatabase("test");
        // request.setSelectedTables(new String[]{"users", "posts"});
        // request.setModule("test_db");

        // PersistClientService service = new PersistClientService();
        // CompletableFuture<PersistClientGeneratorResponse> future = service.generatePersistClient(request);
        // PersistClientGeneratorResponse response = future.get();

        // Assert.assertNotNull(response.getSource());
    }

    /**
     * Test for validation of empty database system.
     */
    @Test(description = "Test validation of empty database system")
    public void testValidationEmptyDbSystem() throws PersistClient.PersistClientException {
        PersistClient generator = new PersistClient(
                "/tmp/test", "test", "", "localhost", 3306, "root", "pass", "testdb");

        try {
            generator.introspectDatabaseTables();
            assert false : "Expected PersistClientException";
        } catch (PersistClient.PersistClientException e) {
            assert e.getMessage().contains("Database system cannot be null or empty");
        }
    }

    /**
     * Test for validation of invalid database system.
     */
    @Test(description = "Test validation of invalid database system")
    public void testValidationInvalidDbSystem() throws PersistClient.PersistClientException {
        PersistClient generator = new PersistClient(
                "/tmp/test", "test", "invalid", "localhost", 3306, "root", "pass", "testdb");

        try {
            generator.introspectDatabaseTables();
            assert false : "Expected PersistClientException";
        } catch (PersistClient.PersistClientException e) {
            assert e.getMessage().contains("Invalid database system");
        }
    }

    /**
     * Test for validation of invalid port.
     */
    @Test(description = "Test validation of invalid port")
    public void testValidationInvalidPort() throws PersistClient.PersistClientException {
        PersistClient generator = new PersistClient(
                "/tmp/test", "test", "mysql", "localhost", -1, "root", "pass", "testdb");

        try {
            generator.introspectDatabaseTables();
            assert false : "Expected PersistClientException";
        } catch (PersistClient.PersistClientException e) {
            assert e.getMessage().contains("port must be a positive number");
        }
    }

    @Override
    public void test(Path config) throws IOException {

    }

    @Override
    public String getResourceDir() {
        return "persist-generator";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return PersistClientServiceTest.class;
    }

    @Override
    protected String getApiName() {
        return "generatePersistClient";
    }
}

