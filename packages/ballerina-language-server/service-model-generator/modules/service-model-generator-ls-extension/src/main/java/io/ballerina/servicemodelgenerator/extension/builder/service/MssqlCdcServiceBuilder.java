/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
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

/**
 * Builder class for Microsoft SQL Server CDC service.
 *
 * @since 1.5.0
 */
public final class MssqlCdcServiceBuilder extends AbstractCdcServiceBuilder {

    private static final String CDC_MSSQL_SERVICE_MODEL_LOCATION = "services/cdc_mssql.json";
    private static final String MSSQL_CDC_DRIVER_MODULE_NAME = "mssql.cdc.driver";
    private static final String KEY_DATABASE_INSTANCE = "databaseInstance";
    private static final String KEY_DATABASES = "databases";

    @Override
    protected String getCdcServiceModelLocation() {
        return CDC_MSSQL_SERVICE_MODEL_LOCATION;
    }

    @Override
    protected String getCdcDriverModuleName() {
        return MSSQL_CDC_DRIVER_MODULE_NAME;
    }

    @Override
    protected List<String> getListenerFields() {
        return List.of(
            KEY_LISTENER_VAR_NAME,
            KEY_HOST,
            KEY_PORT,
            KEY_USERNAME,
            KEY_PASSWORD,
            KEY_DATABASES,
            KEY_SCHEMAS,
            KEY_DATABASE_INSTANCE,  // MSSQL-specific field
            KEY_SECURE_SOCKET,
            KEY_OPTIONS
        );
    }

    @Override
    public String kind() {
        return "mssql";
    }
}
