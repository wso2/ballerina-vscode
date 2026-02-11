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

package io.ballerina.flowmodelgenerator.core;

import java.util.HashMap;
import java.util.Map;

/**
 * Utility class to replace generic lang type parameters with their super types.
 *
 * @since 1.7.0
 */
public class TypeParameterReplacer {

    private static final Map<String, String> TYPE_PARAMETER_REPLACEMENTS = new HashMap<>();

    static {
        // lang.array type parameter replacements
        TYPE_PARAMETER_REPLACEMENTS.put("array:Type1", "(any|error)");
        TYPE_PARAMETER_REPLACEMENTS.put("array:Type", "(any|error)");
        TYPE_PARAMETER_REPLACEMENTS.put("array:AnydataType", "(anydata|error)");

        // lang.error type parameter replacements
        TYPE_PARAMETER_REPLACEMENTS.put("error:DetailType", "error:Detail");

        // lang.map type parameter replacements
        TYPE_PARAMETER_REPLACEMENTS.put("map:Type1", "map<any|error>");
        TYPE_PARAMETER_REPLACEMENTS.put("map:Type", "map<any|error>");

        // lang.stream type parameter replacements
        TYPE_PARAMETER_REPLACEMENTS.put("stream:Type1", "(any|error)");
        TYPE_PARAMETER_REPLACEMENTS.put("stream:Type", "(any|error)");
        TYPE_PARAMETER_REPLACEMENTS.put("stream:ErrorType", "error");
        TYPE_PARAMETER_REPLACEMENTS.put("stream:CompletionType", "error");

        // lang.xml type parameter replacements
        TYPE_PARAMETER_REPLACEMENTS.put("xml:XmlType", "xml");
        TYPE_PARAMETER_REPLACEMENTS.put("xml:ItemType",
                "(xml:Element|xml:Comment|xml:ProcessingInstruction|xml:Text)");

        // lang.table type parameter replacements
        TYPE_PARAMETER_REPLACEMENTS.put("table:MapType1", "map<any|error>");
        TYPE_PARAMETER_REPLACEMENTS.put("table:MapType", "map<any|error>");
        TYPE_PARAMETER_REPLACEMENTS.put("table:KeyType", "anydata");
        TYPE_PARAMETER_REPLACEMENTS.put("table:Type", "(any|error)");

        // lang.value type parameter replacements
        TYPE_PARAMETER_REPLACEMENTS.put("value:AnydataType", "anydata");
        TYPE_PARAMETER_REPLACEMENTS.put("value:Type", "(any|error)");
    }

    /**
     * Replaces type parameters in a string value.
     *
     * @param original the original string
     * @return the string with type parameters replaced
     */
    public static String replaceTypeParameters(String original) {
        if (original == null || original.isEmpty()) {
            return original;
        }

        String result = original;

        // Replace each type parameter with its super type
        for (Map.Entry<String, String> entry : TYPE_PARAMETER_REPLACEMENTS.entrySet()) {
            String oldType = entry.getKey();
            String newType = entry.getValue();

            if (result.contains(oldType)) {
                // If the old type is found, replace it with the new type
                result = result.replace(oldType, newType);
            }
        }

        return result;
    }
}
