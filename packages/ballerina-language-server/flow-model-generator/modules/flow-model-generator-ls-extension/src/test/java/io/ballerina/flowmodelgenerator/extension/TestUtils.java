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

package io.ballerina.flowmodelgenerator.extension;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.Map;
import java.util.Set;

/**
 * A utility class containing general-purpose helper methods used in testing scenarios.
 *
 * @since 1.1.0
 */
public final class TestUtils {

    private TestUtils() {
    }

    /**
     * Compares two {@link JsonElement}s for equality after removing a specified key from both.
     *
     * @param expected     the expected JsonElement
     * @param actual       the actual JsonElement
     * @param keysToIgnore the list of key to remove recursively before comparison
     * @return {@code true} if both JSON structures are equal after pruning the key, {@code false} otherwise
     * @since 1.1.0
     */
    public static boolean assertJsonEqualsIgnoringKey(JsonElement expected, JsonElement actual,
                                                      Set<String> keysToIgnore) {
        if (expected == null || actual == null) {
            return expected == actual;
        }
        JsonElement prunedExpected = pruneJsonKeys(expected, keysToIgnore);
        JsonElement prunedActual = pruneJsonKeys(actual, keysToIgnore);
        return prunedExpected.equals(prunedActual);
    }

    /**
     * Recursively removes all occurrences of the specified key from the given JsonElement.
     *
     * @param element      the JsonElement to process
     * @param keysToIgnore the key to be removed
     * @return a new JsonElement with the specified key removed
     */
    private static JsonElement pruneJsonKeys(JsonElement element, Set<String> keysToIgnore) {
        if (element.isJsonObject()) {
            JsonObject inputObject = element.getAsJsonObject();
            JsonObject result = new JsonObject();
            for (Map.Entry<String, JsonElement> entry : inputObject.entrySet()) {
                if (!keysToIgnore.contains(entry.getKey())) {
                    result.add(entry.getKey(), pruneJsonKeys(entry.getValue(), keysToIgnore));
                }
            }
            return result;
        } else if (element.isJsonArray()) {
            JsonArray inputArray = element.getAsJsonArray();
            JsonArray result = new JsonArray();
            for (JsonElement item : inputArray) {
                result.add(pruneJsonKeys(item, keysToIgnore));
            }
            return result;
        } else {
            return element; // primitive or null
        }
    }
}
