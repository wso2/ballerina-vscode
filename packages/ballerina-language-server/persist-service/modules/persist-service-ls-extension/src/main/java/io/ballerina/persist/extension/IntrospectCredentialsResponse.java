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

import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.Value;

import java.util.List;

/**
 * Represents the response for credential introspection of an existing persist connection.
 *
 * @since 1.7.0
 */
public class IntrospectCredentialsResponse {
    private CredentialsData data;
    private String errorMsg;

    public IntrospectCredentialsResponse() {
    }

    public CredentialsData getData() {
        return data;
    }

    public void setData(CredentialsData data) {
        this.data = data;
    }

    public String getErrorMsg() {
        return errorMsg;
    }

    public void setError(Throwable e) {
        this.errorMsg = e.getLocalizedMessage();
    }

    /**
     * Holds the introspected credential data for a persist connection.
     *
     * @param metadata      Metadata describing the connection (label, description)
     * @param properties    List of credential property values (dbSystem, host, port, user, password, database)
     * @param targetModule  The fully-qualified target module name (e.g., "myapp.testdb")
     * @param modelFilePath The relative path to the persist model file (e.g., "persist/testdb/model.bal")
     */
    public record CredentialsData(MetaData metadata, List<Value> properties,
                                  String targetModule, String modelFilePath) {
    }
}
