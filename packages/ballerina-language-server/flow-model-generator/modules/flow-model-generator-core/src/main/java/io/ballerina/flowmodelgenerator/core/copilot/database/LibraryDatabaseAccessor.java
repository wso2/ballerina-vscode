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

package io.ballerina.flowmodelgenerator.core.copilot.database;

import io.ballerina.modelgenerator.commons.SearchDatabaseManager;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Database accessor for library package information from the search-index database.
 * Handles database connections, queries, and resource management.
 *
 * @since 1.7.0
 */
public class LibraryDatabaseAccessor {

    private static final String MODE_CORE = "CORE";
    private static final String MODE_HEALTHCARE = "HEALTHCARE";

    private LibraryDatabaseAccessor() {
        // Prevent instantiation
    }

    /**
     * Loads distinct packages from the database based on the mode.
     * Returns a map with package name (org/package_name) as key and description as value.
     *
     * @param mode the filter mode: "CORE" (ballerina packages only),
     *             "Healthcare" (packages starting with 'health' + ballerina/http),
     *             "ALL" (all packages)
     * @return map of package names to descriptions
     * @throws SQLException if database query fails
     */
    public static Map<String, String> loadAllPackages(String mode) throws SQLException {
        Map<String, String> packageToDescriptionMap = new LinkedHashMap<>();

        String dbPath = getDatabasePath();

        // Build SQL query based on mode using StringBuilder
        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT DISTINCT org, package_name, description FROM Package WHERE package_name IS NOT NULL");

        if (MODE_CORE.equalsIgnoreCase(mode)) {
            // Load only ballerina packages
            sqlBuilder.append(" AND org = 'ballerina'");
        } else if (MODE_HEALTHCARE.equalsIgnoreCase(mode)) {
            // Load packages starting with 'health' and ballerina/http
            sqlBuilder.append(" AND (package_name LIKE 'health%' OR (org = 'ballerina' AND package_name = 'http'))");
        }
        sqlBuilder.append(" ORDER BY org, package_name;");

        String sql = sqlBuilder.toString();

        try (Connection conn = DriverManager.getConnection(dbPath);
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            populatePackageMap(packageToDescriptionMap, rs);
        }

        return packageToDescriptionMap;
    }

    /**
     * Gets the package description from the database for a given org and package name.
     *
     * @param org         the organization name
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
        } catch (SQLException e) {
            throw new RuntimeException("Error retrieving package description for " + org + "/" + packageName + ": " +
                    e.getMessage(), e);
        }

        return Optional.empty();
    }

    /**
     * Searches libraries by keywords across packages, types, connectors, and functions using BM25 ranking.
     * Searches in PackageFTS (package_name, description, keywords),
     * TypeFTS (description), ConnectorFTS (description), and FunctionFTS (description).
     * Returns a map with package name (org/package_name) as key and description as value,
     * ordered by relevance score (best matches first).
     *
     * @param keywords Array of search keywords
     * @return map of matching package names to descriptions, ordered by BM25 relevance score
     * @throws SQLException if database query fails
     */
    public static Map<String, String> searchLibrariesByKeywords(String[] keywords) throws SQLException {
        Map<String, String> packageToDescriptionMap = new LinkedHashMap<>();

        if (keywords == null || keywords.length == 0) {
            return packageToDescriptionMap;
        }

        // Format queries for different FTS table column structures
        String packageQuery = formatForPackageFTS(keywords);
        String typeConnectorFunctionQuery = formatForNameDescriptionFTS(keywords);

        // If no valid keywords after filtering, return empty
        if (packageQuery.isEmpty() && typeConnectorFunctionQuery.isEmpty()) {
            return packageToDescriptionMap;
        }

        // Union query to search across all FTS tables and aggregate results by package
        String sql = """
                SELECT p.org, p.package_name, p.description, MIN(score) as best_score
                FROM (
                    -- Search in PackageFTS (package_name, description, keywords)
                    SELECT p.id, bm25(PackageFTS) as score
                    FROM PackageFTS fts
                    INNER JOIN Package p ON fts.rowid = p.id
                    WHERE PackageFTS MATCH ?
                      AND p.org IS NOT NULL
                      AND p.package_name IS NOT NULL

                    UNION ALL

                    -- Search in TypeFTS (name, description)
                    SELECT p.id, bm25(TypeFTS) as score
                    FROM TypeFTS fts
                    INNER JOIN Type t ON fts.rowid = t.id
                    INNER JOIN Package p ON t.package_id = p.id
                    WHERE TypeFTS MATCH ?
                      AND p.org IS NOT NULL
                      AND p.package_name IS NOT NULL

                    UNION ALL

                    -- Search in ConnectorFTS (name, description)
                    SELECT p.id, bm25(ConnectorFTS) as score
                    FROM ConnectorFTS fts
                    INNER JOIN Connector c ON fts.rowid = c.id
                    INNER JOIN Package p ON c.package_id = p.id
                    WHERE ConnectorFTS MATCH ?
                      AND p.org IS NOT NULL
                      AND p.package_name IS NOT NULL

                    UNION ALL

                    -- Search in FunctionFTS (name, description)
                    SELECT p.id, bm25(FunctionFTS) as score
                    FROM FunctionFTS fts
                    INNER JOIN Function f ON fts.rowid = f.id
                    INNER JOIN Package p ON f.package_id = p.id
                    WHERE FunctionFTS MATCH ?
                      AND p.org IS NOT NULL
                      AND p.package_name IS NOT NULL
                ) AS combined
                INNER JOIN Package p ON combined.id = p.id
                GROUP BY p.org, p.package_name, p.description
                ORDER BY best_score
                LIMIT 9;
                """;

        String dbPath = getDatabasePath();
        try (Connection conn = DriverManager.getConnection(dbPath);
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            // Set the FTS queries - PackageFTS searches package_name, description, keywords
            // TypeFTS, ConnectorFTS, FunctionFTS search name and description
            stmt.setString(1, packageQuery);
            stmt.setString(2, typeConnectorFunctionQuery);
            stmt.setString(3, typeConnectorFunctionQuery);
            stmt.setString(4, typeConnectorFunctionQuery);

            try (ResultSet rs = stmt.executeQuery()) {
                populatePackageMap(packageToDescriptionMap, rs);
            }
        }

        return packageToDescriptionMap;
    }

    /**
     * Populates the package map from a ResultSet containing org, package_name, and description columns.
     * Iterates through all rows and adds packages to the map using "org/package_name" as the key.
     * Skips duplicates (if a package already exists in the map, it won't be overwritten).
     *
     * @param packageMap the map to populate
     * @param rs         the ResultSet containing package data
     * @throws SQLException if database access error occurs
     */
    private static void populatePackageMap(Map<String, String> packageMap, ResultSet rs) throws SQLException {
        while (rs.next()) {
            String org = rs.getString("org");
            String packageName = rs.getString("package_name");
            String description = rs.getString("description");

            // Create the full name as "org/package_name"
            String fullName = org + "/" + packageName;

            // Store only if not already present (handles duplicates)
            if (!packageMap.containsKey(fullName)) {
                packageMap.put(fullName, description != null ? description : "");
            }
        }
    }

    /**
     * Formats keywords for PackageFTS which searches in package_name, description, and keywords columns.
     * Uses column filters to explicitly search across all three columns.
     *
     * @param keywords array of pre-filtered keywords
     * @return FTS5-formatted query string with column filters
     */
    private static String formatForPackageFTS(String[] keywords) {
        List<String> tokens = new ArrayList<>();

        for (String keyword : keywords) {
            if (keyword == null || keyword.trim().isEmpty()) {
                continue;
            }

            // Search in package_name, description, and keywords columns
            tokens.add("{package_name description keywords}: " + keyword.trim());
        }

        // Combine tokens with OR operator
        return String.join(" OR ", tokens);
    }

    /**
     * Formats keywords for TypeFTS, ConnectorFTS, and FunctionFTS which search in name and description columns.
     * Uses column filters to explicitly search across name and description.
     *
     * @param keywords array of pre-filtered keywords
     * @return FTS5-formatted query string with column filters
     */
    private static String formatForNameDescriptionFTS(String[] keywords) {
        List<String> tokens = new ArrayList<>();

        for (String keyword : keywords) {
            if (keyword == null || keyword.trim().isEmpty()) {
                continue;
            }

            // Search in name and description columns
            tokens.add("{name description}: " + keyword.trim());
        }

        // Combine tokens with OR operator
        return String.join(" OR ", tokens);
    }

    private static String getDatabasePath() {
        return SearchDatabaseManager.getInstance().getDbPath();
    }
}
