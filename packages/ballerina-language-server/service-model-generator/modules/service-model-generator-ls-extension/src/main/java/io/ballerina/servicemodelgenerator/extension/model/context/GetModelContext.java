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

package io.ballerina.servicemodelgenerator.extension.model.context;

import java.util.Locale;

/**
 * GetModelContext class to hold the context parameters for getting a service model.
 * This context is used to identify the specific service model based on organization,
 * package, module, service type, and function type.
 *
 * @param orgName      Name of the organization
 * @param packageName  Name of the package
 * @param moduleName   Name of the module
 * @param serviceType  Type of the service
 * @param functionType Type of the function
 * @since 1.2.0
 */
public record GetModelContext(String orgName, String packageName, String moduleName, String serviceType,
                              String functionType) {
    public GetModelContext {
        orgName = (orgName != null) ? orgName.toLowerCase(Locale.US) : null;
        packageName = (packageName != null) ? packageName.toLowerCase(Locale.US) : null;
        moduleName = (moduleName != null) ? moduleName.toLowerCase(Locale.US) : null;
        serviceType = (serviceType != null) ? serviceType.toLowerCase(Locale.US) : null;
        functionType = (functionType != null) ? functionType.toLowerCase(Locale.US) : null;
    }

    public static GetModelContext fromOrgAndModule(String orgName, String moduleName) {
        return new GetModelContext(orgName, moduleName, moduleName, null, null);
    }

    public static GetModelContext fromServiceAndFunctionType(String serviceType, String functionType) {
        return new GetModelContext(null, null, null, serviceType, functionType);
    }
}

