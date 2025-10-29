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

package io.ballerina.flowmodelgenerator.core.expressioneditor.semantictokens;

/**
 * Token types for expression semantic tokens.
 *
 * @since 1.3.0
 */
public enum ExpressionTokenTypes {
    VARIABLE(0),    // Variable references
    PROPERTY(1),    // Record field access (obj.field)
    PARAMETER(2),   // Function call arguments (ALL arguments including literals)
    TYPE_CAST(3),   // Type cast expressions (<Type>)
    VALUE(4),       // Values in template expressions
    START_EVENT(5), // Start event token - zero length
    END_EVENT(6);   // End event token - zero length

    private final int id;

    ExpressionTokenTypes(int id) {
        this.id = id;
    }

    public int getId() {
        return id;
    }
}
