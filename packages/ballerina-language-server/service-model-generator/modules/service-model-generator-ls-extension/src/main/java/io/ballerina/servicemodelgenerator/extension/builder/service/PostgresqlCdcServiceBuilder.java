/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package io.ballerina.servicemodelgenerator.extension.builder.service;

import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingFieldNode;
import io.ballerina.compiler.syntax.tree.NamedArgumentNode;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.util.ListenerUtil;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.POSTGRESQL;

/**
 * Builder class for PostgreSQL CDC service.
 *
 * @since 1.6.0
 */
public final class PostgresqlCdcServiceBuilder extends AbstractCdcServiceBuilder {

    private static final String CDC_POSTGRESQL_SERVICE_MODEL_LOCATION = "services/cdc_postgresql.json";
    private static final String POSTGRESQL_CDC_DRIVER_MODULE_NAME = "postgresql.cdc.driver";
    private static final String DISPLAY_LABEL = "PostgreSQL CDC";
    private static final Set<String> METADATA_KEYS = Set.of(
            KEY_HOST, KEY_PORT, KEY_USERNAME, KEY_PASSWORD,
            KEY_DATABASE, KEY_SCHEMAS, KEY_SECURE_SOCKET, KEY_OPTIONS,
            KEY_LIVENESS_INTERVAL, KEY_INTERNAL_SCHEMA_STORAGE, KEY_OFFSET_STORAGE
    );

    @Override
    protected String getCdcServiceModelLocation() {
        return CDC_POSTGRESQL_SERVICE_MODEL_LOCATION;
    }

    @Override
    protected String getCdcDriverModuleName() {
        return POSTGRESQL_CDC_DRIVER_MODULE_NAME;
    }

    @Override
    protected List<String> getListenerFields() {
        return List.of(
            KEY_LISTENER_VAR_NAME,
            KEY_HOST,
            KEY_PORT,
            KEY_USERNAME,
            KEY_PASSWORD,
            KEY_DATABASE,
            KEY_SCHEMAS,
            KEY_SECURE_SOCKET,
            KEY_OPTIONS
            // Note: NO KEY_DATABASE_INSTANCE (PostgreSQL doesn't use it)
        );
    }

    @Override
    public String kind() {
        return POSTGRESQL;
    }

    @Override
    protected String getDisplayLabel() {
        return DISPLAY_LABEL;
    }

    @Override
    protected Set<String> getMetadataKeys() {
        return METADATA_KEYS;
    }

    @Override
    protected void extractDatabaseConfigFields(NamedArgumentNode databaseArg, Map<String, Value> config) {
        if (!(databaseArg.expression() instanceof MappingConstructorExpressionNode mapping)) {
            return;
        }

        for (MappingFieldNode fieldNode : mapping.fields()) {
            if (!(fieldNode instanceof SpecificFieldNode field)) {
                continue;
            }
            String fieldName = field.fieldName().toSourceCode().trim();
            String fieldValue = field.valueExpr()
                    .map(expr -> expr.toSourceCode().trim()).orElse("");

            switch (fieldName) {
                case "hostname" -> config.put(KEY_HOST,
                        ListenerUtil.buildReadOnlyTextValue("Host",
                                "The hostname of the PostgreSQL Server", fieldValue));
                case "port" -> config.put(KEY_PORT,
                        ListenerUtil.buildReadOnlyNumberValue("Port",
                                "The port number of the PostgreSQL Server", fieldValue));
                case "username" -> config.put(KEY_USERNAME,
                        ListenerUtil.buildReadOnlyTextValue("Username",
                                "The username for the PostgreSQL Server connection", fieldValue));
                case "password" -> config.put(KEY_PASSWORD,
                        ListenerUtil.buildReadOnlyTextValue("Password",
                                "The password for the PostgreSQL Server connection", fieldValue));
                case "databaseName" -> config.put(KEY_DATABASE,
                        ListenerUtil.buildReadOnlyTextValue("Database",
                                "The PostgreSQL database name to capture changes from", fieldValue));
                case "includedSchemas" -> {
                    List<String> items = extractListValues(field);
                    config.put(KEY_SCHEMAS,
                            ListenerUtil.buildReadOnlyTextSetValue("Schemas",
                                    "A list of regular expressions that match names of schemas to capture changes from",
                                    items));
                }
                case "secure" -> config.put(KEY_SECURE_SOCKET,
                        ListenerUtil.buildReadOnlyTextValue("Secure Socket",
                                "SSL/TLS configuration for secure connection",
                                field.valueExpr().map(expr -> expr.toSourceCode().trim()).orElse("")));
                default -> {
                }
            }
        }
    }
}
