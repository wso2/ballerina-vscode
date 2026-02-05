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

package io.ballerina.flowmodelgenerator.core;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Database accessor for library package information from the search-index database.
 * Handles database connections, queries, and resource management.
 *
 * @since 1.0.1
 */
public class LibraryDatabaseAccessor {

    private static final String INDEX_FILE_NAME = "search-index.sqlite";

    private LibraryDatabaseAccessor() {
        // Prevent instantiation
    }

    /**
     * Loads all distinct packages from the database.
     * Returns a map with package name (org/package_name) as key and description as value.
     *
     * @return map of package names to descriptions
     * @throws IOException if database file access fails
     * @throws SQLException if database query fails
     */
    public static Map<String, String> loadAllPackages() throws IOException, SQLException {
        Map<String, String> packageToDescriptionMap = new LinkedHashMap<>();

        String dbPath = getDatabasePath();
        String sql = """
                SELECT DISTINCT org, package_name, description
                FROM Package
                WHERE org IS NOT NULL AND package_name IS NOT NULL
                ORDER BY org, package_name;
                """;

        try (Connection conn = DriverManager.getConnection(dbPath);
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                String org = rs.getString("org");
                String packageName = rs.getString("package_name");
                String description = rs.getString("description");

                // Create the full name as "org/package_name"
                String fullName = org + "/" + packageName;

                // Store only if not already present (handles duplicates)
                if (!packageToDescriptionMap.containsKey(fullName)) {
                    packageToDescriptionMap.put(fullName, description != null ? description : "");
                }
            }
        }

        return packageToDescriptionMap;
    }

    /**
     * Gets the package description from the database for a given org and package name.
     *
     * @param org the organization name
     * @param packageName the package name
     * @return Optional containing the description, or empty if not found
     */
    public static Optional<String> getPackageDescription(String org, String packageName) {
        try {
            String dbPath = getDatabasePath();
            String sql = """
                    SELECT description
                    FROM Package
                    WHERE org = ? AND package_name = ?
                    ORDER BY id DESC
                    LIMIT 1;
                    """;

            try (Connection conn = DriverManager.getConnection(dbPath);
                 PreparedStatement stmt = conn.prepareStatement(sql)) {

                stmt.setString(1, org);
                stmt.setString(2, packageName);

                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        String desc = rs.getString("description");
                        return Optional.ofNullable(desc);
                    }
                }
            }
        } catch (IOException | SQLException e) {
            throw new RuntimeException("Error retrieving package description for " + org + "/" + packageName + ": " +
                    e.getMessage(), e);
        }

        return Optional.empty();
    }

    /**
     * Gets the JDBC database path for the search-index.sqlite file.
     *
     * @return the JDBC database path
     * @throws IOException if database file cannot be accessed
     */
    public static String getDatabasePath() throws IOException {
        java.net.URL dbUrl = LibraryDatabaseAccessor.class.getClassLoader().getResource(INDEX_FILE_NAME);

        if (dbUrl == null) {
            throw new IOException("Database resource not found: " + INDEX_FILE_NAME);
        }

        // Copy database to temp directory
        Path tempDir = Files.createTempDirectory("search-index");
        Path tempFile = tempDir.resolve(INDEX_FILE_NAME);

        try (InputStream inputStream = dbUrl.openStream()) {
            Files.copy(inputStream, tempFile);
        }

        return "jdbc:sqlite:" + tempFile;
    }
}
