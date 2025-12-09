/*
 *  Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com) All Rights Reserved.
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

package io.ballerina.architecturemodelgenerator.extension;

import io.ballerina.projectservice.extension.response.ImportMuleResponse;

/**
 * Utils for component generation testings.
 *
 * @since 1.0.0
 */
public class TestUtils {

    public static String replaceStdLibVersionStrings(String source) {
        return source
                .replaceAll("ballerina/http:\\d+.\\d+.\\d+", "")
                .replaceAll("ballerina/http:http:\\d+.\\d+.\\d+", "")
                .replaceAll("ballerina/grpc:\\d+.\\d+.\\d+", "")
                .replaceAll("ballerina/time:\\d+.\\d+.\\d+", "");
    }

    /**
     * Checks if the actual response contains the expected content. Validates the presence of key content rather than
     * exact matching.
     *
     * @param actual   The actual tool response
     * @param expected The expected tool response
     * @return true if all expected content is present in the actual response
     */
    public static boolean contentMatches(ImportMuleResponse actual, ImportMuleResponse expected) {
        // Check error field - should match exactly
        if ((actual.error() == null && expected.error() != null) ||
                (actual.error() != null && !actual.error().equals(expected.error()))) {
            return false;
        }

        // Check if textEdits has the same number of keys
        int expectedSize = expected.textEdits() != null ? expected.textEdits().size() : 0;
        int actualSize = actual.textEdits() != null ? actual.textEdits().size() : 0;
        if (actualSize != expectedSize) {
            return false;
        }

        // Check if report exists
        if ((expected.report() != null && !expected.report().isEmpty()) &&
                (actual.report() == null || actual.report().isEmpty())) {
            return false;
        }

        // Check if jsonReport is equal
        return objectsEqual(actual.jsonReport(), expected.jsonReport());
    }

    /**
     * Compares two objects for equality, handling nulls.
     */
    private static boolean objectsEqual(Object obj1, Object obj2) {
        if (obj1 == null && obj2 == null) {
            return true;
        }
        if (obj1 == null || obj2 == null) {
            return false;
        }
        return obj1.equals(obj2);
    }

}
