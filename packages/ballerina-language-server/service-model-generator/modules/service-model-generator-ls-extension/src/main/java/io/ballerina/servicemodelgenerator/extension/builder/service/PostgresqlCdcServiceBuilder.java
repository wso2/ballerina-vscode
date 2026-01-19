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

import java.util.List;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.POSTGRESQL;

/**
 * Builder class for PostgreSQL CDC service.
 *
 * @since 1.6.0
 */
public final class PostgresqlCdcServiceBuilder extends AbstractCdcServiceBuilder {

    private static final String CDC_POSTGRESQL_SERVICE_MODEL_LOCATION = "services/cdc_postgresql.json";
    private static final String POSTGRESQL_CDC_DRIVER_MODULE_NAME = "postgresql.cdc.driver";

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
}
