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

package io.ballerina.flowmodelgenerator.core.converters.utils;

import com.google.gson.JsonPrimitive;
import io.ballerina.compiler.syntax.tree.AbstractNodeFactory;
import io.ballerina.compiler.syntax.tree.ArrayTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.Token;
import io.ballerina.compiler.syntax.tree.TypeDescriptorNode;

import java.util.List;
import java.util.Map;

/**
 * Util methods for JSON to record direct converter.
 *
 * @since 1.0.0
 */
public final class JsonToRecordMapperConverterUtils {

    private JsonToRecordMapperConverterUtils() {
    }

    /**
     * This method returns an alternative fieldName if the given filedName is already exist.
     *
     * @param fieldName          Field name of the JSON Object/Array
     * @param isArrayField       To denote whether given field is an array or not
     *                           (unused, kept for backward compatibility)
     * @param existingFieldNames The list of already existing field names
     * @param updatedFieldNames  The list of updated field names
     * @return {@link List<String>} List of already existing Types
     */
    public static String getAndUpdateFieldNames(String fieldName, boolean isArrayField, List<String> existingFieldNames,
                                                Map<String, String> updatedFieldNames) {
        return DataMappingModelConverterUtils.getAndUpdateFieldNames(fieldName, existingFieldNames, updatedFieldNames);
    }

    /**
     * This method returns the SyntaxToken corresponding to the JsonPrimitive.
     *
     * @param value JsonPrimitive that has to be classified.
     * @return {@link Token} Classified Syntax Token.
     */
    public static Token getPrimitiveTypeName(JsonPrimitive value) {
        if (value.isString()) {
            return AbstractNodeFactory.createToken(SyntaxKind.STRING_KEYWORD);
        } else if (value.isBoolean()) {
            return AbstractNodeFactory.createToken(SyntaxKind.BOOLEAN_KEYWORD);
        } else if (value.isNumber()) {
            String strValue = value.getAsNumber().toString();
            if (strValue.contains(".")) {
                return AbstractNodeFactory.createToken(SyntaxKind.DECIMAL_KEYWORD);
            } else {
                return AbstractNodeFactory.createToken(SyntaxKind.INT_KEYWORD);
            }
        }
        return AbstractNodeFactory.createToken(SyntaxKind.ANYDATA_KEYWORD);
    }

    /**
     * This method returns the memberTypeDesc node of an ArrayTypeDescriptorNode.
     * Wrapper method for compatibility with JsonToRecordMapper that accepts TypeDescriptorNode.
     *
     * @param typeDescNode TypeDescriptorNode for which it has to be extracted.
     * @return {@link TypeDescriptorNode} The memberTypeDesc node of the ArrayTypeDescriptor node.
     */
    public static TypeDescriptorNode extractArrayTypeDescNode(TypeDescriptorNode typeDescNode) {
        if (typeDescNode.kind().equals(SyntaxKind.ARRAY_TYPE_DESC)) {
            return DataMappingModelConverterUtils.extractArrayTypeDescNode((ArrayTypeDescriptorNode) typeDescNode);
        } else {
            return typeDescNode;
        }
    }

}
