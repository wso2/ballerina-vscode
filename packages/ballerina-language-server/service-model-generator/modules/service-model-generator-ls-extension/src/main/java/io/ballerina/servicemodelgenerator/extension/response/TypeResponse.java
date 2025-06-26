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

package io.ballerina.servicemodelgenerator.extension.response;

import java.util.List;

/**
 * Represents a response type in the service model generator.
 * This record holds information about the category, label, type, and status code of the response.
 *
 * @param completions A list of type completions, each containing details about a specific type.
 */
public record TypeResponse(List<TypeCompletion> completions) {

    public record TypeCompletion(String category, String label, String type, String statusCode) {
    }
}
