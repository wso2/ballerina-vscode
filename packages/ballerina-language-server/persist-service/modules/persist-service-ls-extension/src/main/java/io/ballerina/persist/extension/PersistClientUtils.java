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

package io.ballerina.persist.extension;

import io.ballerina.servicemodelgenerator.extension.model.Value;

import java.util.Map;

/**
 * Utility class for the Persist client LS extension.
 *
 * @since 1.7.0
 */
public final class PersistClientUtils {

    private PersistClientUtils() {
    }

    /**
     * Holds the resolved database connection credentials extracted from a properties map.
     *
     * @param dbSystem  The database system type (e.g. "MySQL", "PostgreSQL")
     * @param host      The database host
     * @param port      The database port, or {@code null} if not specified / invalid
     * @param user      The database user
     * @param password  The database password
     * @param database  The database name
     */
    public record DatabaseCredentials(String dbSystem, String host, Integer port,
                                      String user, String password, String database) {
    }

    /**
     * Extracts database connection credentials from a credential properties map.
     *
     * @param properties Map of credential property values keyed by property label
     * @return A {@link DatabaseCredentials} record populated from the given properties
     */
    public static DatabaseCredentials extractDatabaseCredentials(Map<String, Value> properties) {
        String dbSystem = findPropertyValue(properties, CredentialsIntrospector.DATABASE_TYPE_KEY);
        String host = findPropertyValue(properties, CredentialsIntrospector.HOST_KEY);
        String portStr = findPropertyValue(properties, CredentialsIntrospector.PORT_KEY);
        String user = findPropertyValue(properties, CredentialsIntrospector.USER_KEY);
        String password = findPropertyValue(properties, CredentialsIntrospector.PASSWORD_KEY);
        String database = findPropertyValue(properties, CredentialsIntrospector.DATABASE_KEY);
        Integer port = parsePort(portStr);
        return new DatabaseCredentials(dbSystem, host, port, user, password, database);
    }

    private static String findPropertyValue(Map<String, Value> properties, String key) {
        if (properties == null) {
            return null;
        }
        Value prop = properties.get(key);
        if (prop == null) {
            return null;
        }
        String val = prop.getValueString();
        return val != null && !val.isEmpty() ? val : null;
    }

    private static Integer parsePort(String portStr) {
        if (portStr == null || portStr.isEmpty()) {
            return null;
        }
        try {
            return Integer.parseInt(portStr);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

