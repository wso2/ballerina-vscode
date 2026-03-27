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

package io.ballerina.flowmodelgenerator.extension;

import io.ballerina.centralconnector.CentralAPI;
import io.ballerina.centralconnector.response.ConnectorResponse;
import io.ballerina.centralconnector.response.ConnectorsResponse;
import io.ballerina.centralconnector.response.FunctionResponse;
import io.ballerina.centralconnector.response.FunctionsResponse;
import io.ballerina.centralconnector.response.Listeners;
import io.ballerina.centralconnector.response.PackageResponse;
import io.ballerina.centralconnector.response.SymbolResponse;

import java.util.Map;

/**
 * A {@link CentralAPI} implementation that always fails, forcing callers to fall back to the local search database.
 * Used in tests to ensure deterministic results independent of the remote Ballerina Central.
 *
 * @since 1.7.0
 */
public class OfflineCentralAPI implements CentralAPI {

    @Override
    public PackageResponse searchPackages(Map<String, String> queryMap) {
        throw new UnsupportedOperationException("Central API is disabled for testing");
    }

    @Override
    public SymbolResponse searchSymbols(Map<String, String> queryMap) {
        throw new UnsupportedOperationException("Central API is disabled for testing");
    }

    @Override
    public FunctionsResponse functions(String organization, String name, String version) {
        throw new UnsupportedOperationException("Central API is disabled for testing");
    }

    @Override
    public Listeners listeners(String organization, String name, String version) {
        throw new UnsupportedOperationException("Central API is disabled for testing");
    }

    @Override
    public FunctionResponse function(String organization, String name, String version, String functionName) {
        throw new UnsupportedOperationException("Central API is disabled for testing");
    }

    @Override
    public ConnectorsResponse connectors(Map<String, String> queryMap) {
        throw new UnsupportedOperationException("Central API is disabled for testing");
    }

    @Override
    public ConnectorResponse connector(String id) {
        throw new UnsupportedOperationException("Central API is disabled for testing");
    }

    @Override
    public ConnectorResponse connector(String organization, String name, String version, String clientName) {
        throw new UnsupportedOperationException("Central API is disabled for testing");
    }

    @Override
    public String latestPackageVersion(String org, String name) {
        throw new UnsupportedOperationException("Central API is disabled for testing");
    }

    @Override
    public boolean hasAuthorizedAccess() {
        return false;
    }
}
