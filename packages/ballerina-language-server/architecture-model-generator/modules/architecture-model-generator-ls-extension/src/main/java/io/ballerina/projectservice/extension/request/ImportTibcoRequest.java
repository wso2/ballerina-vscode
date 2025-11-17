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

package io.ballerina.projectservice.extension.request;

import java.util.Map;

/**
 * Request to import a Tibco project.
 *
 * @param orgName     The organization name for the Ballerina package.
 * @param packageName The name of the Ballerina package to be created.
 * @param sourcePath  The file system path to the root of the Tibco project to be imported.
 * @param parameters  Additional parameters for the migration process.
 * @since 1.2.0
 */
public record ImportTibcoRequest(String orgName, String packageName, String sourcePath,
                                 Map<String, String> parameters) {
}
