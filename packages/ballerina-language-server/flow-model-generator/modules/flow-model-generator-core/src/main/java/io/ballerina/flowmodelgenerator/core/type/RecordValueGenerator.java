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

package io.ballerina.flowmodelgenerator.core.type;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Generates the record value for a type configuration.
 *
 * @since 1.0.0
 */
public class RecordValueGenerator {

    public static String generate(JsonObject json) {
        StringBuilder builder = new StringBuilder();
        generateValue(json, builder, 0);
        return builder.toString();
    }

    private static void generateValue(JsonObject json, StringBuilder builder, int indentLevel) {
        boolean hasTypeName = json.has("typeName");
        if (hasTypeName) {
            String typeName = json.get("typeName").getAsString();
            switch (typeName) {
                case "record" -> generateRecordValue(json, builder, indentLevel);
                case "union" -> generateUnionValue(json, builder, indentLevel);
                case "enum" -> generateEnumValue(json, builder, indentLevel);
                case "array" -> generateArrayValue(json, builder, indentLevel);
                default -> {
                    if (json.has("value") && !json.get("value").getAsString().isEmpty()) {
                        builder.append(json.get("value").getAsString());
                    } else if (json.has("defaultValue") &&
                            !json.get("defaultValue").getAsString().isEmpty()) {
                        builder.append(json.get("defaultValue").getAsString());
                    } else {
                        generateDefaultValue(json, builder, indentLevel);
                    }
                }
            }
        }
    }

    private static void generateEnumValue(JsonObject jsonObject, StringBuilder builder, int indentLevel) {
        if (jsonObject.has("members") && jsonObject.get("members").isJsonArray()) {
            JsonElement members = jsonObject.get("members");
            for (JsonElement member : members.getAsJsonArray()) {
                JsonObject memberObj = member.getAsJsonObject();
                if (memberObj.has("selected") && memberObj.get("selected").getAsBoolean()) {
                    if (memberObj.has("value") && !memberObj.get("value").getAsString().isEmpty()) {
                        builder.append(memberObj.get("value").getAsString());
                    } else {
                        generateDefaultValue(memberObj, builder, indentLevel);
                    }
                    break;
                }
            }
        }
    }

    private static void generateUnionValue(JsonObject union, StringBuilder builder, int indentLevel) {
        if (union.has("selected") && union.get("selected").getAsBoolean() &&
                union.has("value") && !union.get("value").getAsString().isEmpty()) {
            builder.append(union.get("value").getAsString());
            return;
        }

        // Only applicable for the FTP coordination config's `task:DatabaseConfig` union
        // type
        boolean needsExplicitTypeCast = isAmbiguousUnionModulePrefix(union);
        if (union.has("members")) {
            JsonElement members = union.get("members");
            if (members.isJsonArray()) {
                for (JsonElement member : members.getAsJsonArray()) {
                    JsonObject memberObj = member.getAsJsonObject();
                    if (memberObj.has("selected") && memberObj.get("selected").getAsBoolean()) {
                        if (needsExplicitTypeCast) {
                            memberObj.addProperty("explicitTypeCast",
                                    "task:" + memberObj.get("name").getAsString());
                        }
                        generateValue(memberObj, builder, indentLevel);
                        break;
                    }
                }
            }
        }
    }

    private static void generateArrayValue(JsonObject jsonObject, StringBuilder builder, int indentLevel) {
        if (jsonObject.has("selected") && !jsonObject.get("selected").getAsBoolean()) {
            return;
        }

        if (jsonObject.has("elements") && jsonObject.get("elements").isJsonArray()) {
            var elements = jsonObject.get("elements").getAsJsonArray();
            if (elements.isEmpty()) {
                builder.append("[]");
                return;
            }

            String indent = getIndent(indentLevel);
            String nextIndent = getIndent(indentLevel + 1);
            List<String> elementValues = new ArrayList<>();
            for (JsonElement element : elements) {
                JsonObject elementObj = element.getAsJsonObject();
                StringBuilder elementBuilder = new StringBuilder();
                generateValue(elementObj, elementBuilder, indentLevel + 1);
                String value = elementBuilder.toString().trim();
                if (!value.isEmpty()) {
                    elementValues.add(nextIndent + value);
                }
            }
            if (elementValues.isEmpty()) {
                builder.append("[]");
            } else {
                builder.append("[\n");
                builder.append(String.join(",\n", elementValues));
                builder.append("\n").append(indent).append("]");
            }
        } else if (jsonObject.has("value") && !jsonObject.get("value").getAsString().trim().isEmpty()) {
            builder.append(jsonObject.get("value").getAsString());
        } else {
            builder.append("[]");
        }
    }

    /**
     * Returns the module prefix for the {@code task:DatabaseConfig} union type used
     * in the FTP
     * coordination config, or {@code null} if this is not that union. Both members
     * ({@code MysqlConfig} and {@code PostgresqlConfig}) are structurally
     * identical, so the
     * compiler requires an explicit type cast like {@code <task:MysqlConfig>}.
     */
    private static boolean isAmbiguousUnionModulePrefix(JsonObject union) {
        if (!union.has("name") || !"databaseConfig".equals(union.get("name").getAsString())
                || !union.has("typeInfo") || !union.get("typeInfo").isJsonObject()) {
            return false;
        }
        JsonObject typeInfo = union.get("typeInfo").getAsJsonObject();
        if ("task".equals(typeInfo.has("moduleName") ? typeInfo.get("moduleName").getAsString() : null)
                && "DatabaseConfig".equals(typeInfo.has("name") ? typeInfo.get("name").getAsString() : null)) {
            return true;
        }
        return false;
    }

    private static void generateRecordValue(JsonObject jsonObject, StringBuilder builder, int indentLevel) {
        if (jsonObject.has("selected") && !jsonObject.get("selected").getAsBoolean()) {
            return;
        }

        // Add explicit type cast if specified (for ambiguous union record types)
        if (jsonObject.has("explicitTypeCast") && !jsonObject.get("explicitTypeCast").getAsString().isEmpty()) {
            builder.append("<").append(jsonObject.get("explicitTypeCast").getAsString()).append("> ");
        }

        String indent = getIndent(indentLevel);
        String nextIndent = getIndent(indentLevel + 1);

        builder.append("{\n");
        List<String> fieldValues = new ArrayList<>();
        if (jsonObject.has("fields")) {
            JsonElement fields = jsonObject.get("fields");
            if (fields.isJsonArray()) {
                for (JsonElement field : fields.getAsJsonArray()) {
                    JsonObject fieldObj = field.getAsJsonObject();
                    if (fieldObj.has("selected") && fieldObj.get("selected").getAsBoolean()) {
                        String fieldName = fieldObj.get("name").getAsString();
                        StringBuilder fieldValueBuilder = new StringBuilder();
                        generateValue(fieldObj, fieldValueBuilder, indentLevel + 1);
                        String fieldValue = nextIndent + fieldName + ": " + fieldValueBuilder.toString().trim();
                        fieldValues.add(fieldValue);
                    }
                }
            }
        }

        if (!fieldValues.isEmpty()) {
            builder.append(String.join(",\n", fieldValues));
        }
        builder.append("\n").append(indent).append("}");
    }

    private static void generateDefaultValue(JsonObject jsonObject, StringBuilder builder, int indentLevel) {
        if (!jsonObject.has("typeName")) {
            return;
        }
        String typeName = jsonObject.get("typeName").getAsString();
        switch (typeName) {
            case "record" -> generateRecordValue(jsonObject, builder, indentLevel);
            case "union" -> generateUnionValue(jsonObject, builder, indentLevel);
            case "array" -> builder.append("[]");
            case "enum" -> {
                if (jsonObject.has("members") && jsonObject.get("members").isJsonArray()) {
                    JsonElement members = jsonObject.get("members");
                    if (!members.getAsJsonArray().isEmpty()) {
                        generateDefaultValue(members.getAsJsonArray().get(0).getAsJsonObject(), builder, indentLevel);
                    } else {
                        builder.append("\"\"");
                    }
                }
            }
            case "error" -> builder.append("error(\"Custom Error\")");
            case "map" -> builder.append("{}");
            case "object" -> builder.append("object {}");
            case "stream" -> builder.append("new;");
            case "table" -> builder.append("table []");
            default -> {
                switch (typeName) {
                    case "any", "anydata", "json" -> builder.append("()");
                    case "xml" -> builder.append("xml ``");
                    case "string" -> builder.append("\"\"");
                    case "string:Char" -> builder.append("\"a\"");
                    case "int", "byte" -> builder.append("0");
                    case "float" -> builder.append("0.0");
                    case "decimal" -> builder.append("0.0d");
                    case "boolean" -> builder.append("false");
                    default -> builder.append("\"%s\"".formatted(typeName));
                }
            }
        }
    }

    private static String getIndent(int indentLevel) {
        return "    ".repeat(Math.max(0, indentLevel));
    }
}
