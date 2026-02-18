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

package io.ballerina.flowmodelgenerator.extension.request;

/**
 * A request to retrieve all available libraries.
 *
 * @param mode The mode to determine which context file to read ("CORE" or "HEALTHCARE" or "ALL")
 *
 * @since 1.0.1
 */
public record GetAllLibrariesRequest(String mode) {

    /**
     * Default constructor with ALL mode.
     */
    public GetAllLibrariesRequest() {
        this("ALL");
    }
}
