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

package io.ballerina.servicemodelgenerator.extension.model;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import com.google.gson.JsonPrimitive;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;
import com.google.gson.annotations.JsonAdapter;
import com.google.gson.reflect.TypeToken;
import io.ballerina.compiler.api.ModuleID;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.UnionTypeSymbol;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.ParameterMemberTypeData;
import org.ballerinalang.langserver.common.utils.CommonUtil;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Represents the type configuration of a property in the flow model.
 *
 * @since 1.5.0
 */
public class PropertyType {

    @JsonAdapter(FieldTypeSerializer.class)
    private final Value.FieldType fieldType;
    private final String ballerinaType;
    private final List<Object> options;
    private final List<PropertyTypeMemberInfo> typeMembers;
    private boolean selected;

    public PropertyType(Value.FieldType fieldType, String ballerinaType, List<Object> options,
                        List<PropertyTypeMemberInfo> typeMembers, boolean selected) {
        this.fieldType = fieldType;
        this.ballerinaType = ballerinaType;
        this.options = options;
        this.typeMembers = typeMembers;
        this.selected = selected;
    }

    public static PropertyType types(Value.FieldType fieldType) {
        return new Builder().fieldType(fieldType).build();
    }

    public static PropertyType types(Value.FieldType fieldType, List<Object> options) {
        return new Builder().fieldType(fieldType).options(options).build();
    }

    public static PropertyType types(Value.FieldType fieldType, String ballerinaType) {
        return new Builder().fieldType(fieldType).ballerinaType(ballerinaType).build();
    }

    public List<PropertyType> typeWithExpression(TypeSymbol typeSymbol, ModuleInfo moduleInfo) {
        return typeWithExpression(typeSymbol, moduleInfo, null, null);
    }

    public static List<PropertyType> typeWithExpression(TypeSymbol typeSymbol, ModuleInfo moduleInfo,
                                         Node value, SemanticModel semanticModel) {
        if (typeSymbol == null) {
            return List.of();
        }
        String ballerinaType = CommonUtils.getTypeSignature(typeSymbol, moduleInfo);

        // Handle the primitive input types
        Optional<PropertyType> propertyType = handlePrimitiveType(typeSymbol, ballerinaType);

        List<PropertyType> propertyTypes = new ArrayList<>();
        TypeSymbol rawType = CommonUtil.getRawType(typeSymbol);
        // Handle union of singleton types as single-select options
        if (propertyType.isEmpty() && rawType instanceof UnionTypeSymbol unionTypeSymbol) {
            List<TypeSymbol> typeSymbols = unionTypeSymbol.memberTypeDescriptors();
            List<Object> options = new ArrayList<>();
            boolean allSingletons = true;
            for (TypeSymbol symbol : typeSymbols) {
                if (CommonUtil.getRawType(symbol).typeKind() == TypeDescKind.SINGLETON) {
                    options.add(CommonUtils.removeQuotes(symbol.signature()));
                } else {
                    allSingletons = false;
                    break;
                }
            }

            // If all the member types are singletons, treat it as a single-select option
            if (allSingletons) {
                PropertyType propType = new Builder()
                        .fieldType(Value.FieldType.SINGLE_SELECT)
                        .options(options)
                        .ballerinaType(ballerinaType)
                        .build();
                propertyTypes.add(propType);
            } else {
                // Handle union of primitive types by defining an input type for each primitive type
                for (TypeSymbol ts : typeSymbols) {
                    Optional<PropertyType> propType = handlePrimitiveType(ts,
                            CommonUtils.getTypeSignature(ts, moduleInfo));
                    propType.ifPresent(propertyTypes::add);
                }
                // group by the fieldType
                propertyTypes.stream()
                        .collect(java.util.stream.Collectors.groupingBy(PropertyType::fieldType))
                        .forEach((fieldType, groupedTypes) -> {
                            if (groupedTypes.size() > 1) {
                                // merge the ballerina types
                                String mergedBallerinaType = groupedTypes.stream()
                                        .map(PropertyType::ballerinaType)
                                        .distinct()
                                        .reduce((a, b) -> a + "|" + b)
                                        .orElse("");
                                // remove the existing types
                                propertyTypes.removeIf(t -> t.fieldType() == fieldType);

                                List<PropertyTypeMemberInfo> distinctMembers = null;
                                if (fieldType == Value.FieldType.RECORD_MAP_EXPRESSION) {
                                    distinctMembers = new ArrayList<>(groupedTypes.stream()
                                            .filter(t -> t.typeMembers() != null)
                                            .flatMap(t -> t.typeMembers().stream())
                                            .distinct()
                                            .toList());
                                }

                                // add the merged type
                                propertyTypes.add(new PropertyType(fieldType, mergedBallerinaType, null,
                                        distinctMembers, false));
                            }
                        });
            }
        } else {
            propertyType.ifPresent(propertyTypes::add);
        }

        // All the ballerina types will have a default to expression type
        PropertyType expressionType = new Builder()
                .fieldType(Value.FieldType.EXPRESSION)
                .ballerinaType(ballerinaType)
                .build();
        propertyTypes.add(expressionType);

        // get value node kind
        // from the node kind map its belonging prop kind
        // filter the prop type list and set the selected flag to true
        if (value != null) {
            Value.FieldType matchingValueType = findMatchingValueType(value);
            // if matching type is mapping_expression_set
            // need to check if it's a map or a record if its a map then need to set the matching type
            if (matchingValueType == Value.FieldType.MAPPING_EXPRESSION_SET) {
                Optional<TypeSymbol> paramType = semanticModel.typeOf(value);
                if (paramType.isPresent() && paramType.get().typeKind() == TypeDescKind.RECORD) {
                    matchingValueType = Value.FieldType.RECORD_MAP_EXPRESSION;
                }
                Value.FieldType finalMatchingValueType = matchingValueType;
                propertyTypes.stream()
                        .filter(propType -> propType.fieldType() == finalMatchingValueType)
                        .findFirst()
                        .ifPresent(propType -> {
                            propType.selected(true);
                            if (propType.fieldType() == Value.FieldType.RECORD_MAP_EXPRESSION) {
                                String selectedType = getSelectedType(value, semanticModel);
                                if (selectedType != null) {
                                    propType.typeMembers().stream().filter(typeMember ->
                                            typeMember.type().equals(selectedType)).forEach(t -> t.selected(true));
                                }
                            }
                        });
            } else if (matchingValueType == Value.FieldType.EXPRESSION) {
                boolean foundMatch = false;
                PropertyType expressionPropType = null;
                for (PropertyType propType : propertyTypes) {
                    if (propType.fieldType() == Value.FieldType.SINGLE_SELECT) {
                        String valueStr = value.toSourceCode().trim();
                        for (Object option : propType.options()) {
                            // need to check option is not an instance of structure
                            if (option.equals(valueStr)) {
                                propType.selected(true);
                                foundMatch = true;
                                break;
                            }
                        }
                    }
                    if (propType.fieldType() == Value.FieldType.EXPRESSION) {
                        expressionPropType = propType;
                    }
                }
                if (!foundMatch && expressionPropType != null) {
                    expressionPropType.selected(true);
                }
            } else {
                Value.FieldType finalMatchingValueType = matchingValueType;
                propertyTypes.stream()
                        .filter(propType -> propType.fieldType() == finalMatchingValueType)
                        .findFirst()
                        .ifPresent(propType -> propType.selected(true));
            }
        }
        return propertyTypes;
    }

    private static Optional<PropertyType> handlePrimitiveType(TypeSymbol typeSymbol, String ballerinaType) {
        TypeSymbol rawType = CommonUtil.getRawType(typeSymbol);
        return switch (rawType.typeKind()) {
            case INT, INT_SIGNED8, INT_UNSIGNED8, INT_SIGNED16, INT_UNSIGNED16,
                 INT_SIGNED32, INT_UNSIGNED32, BYTE, FLOAT, DECIMAL ->
                    Optional.of(PropertyType.types(Value.FieldType.NUMBER, ballerinaType));
            case STRING, STRING_CHAR -> Optional.of(PropertyType.types(Value.FieldType.TEXT, ballerinaType));
            case BOOLEAN -> Optional.of(PropertyType.types(Value.FieldType.FLAG, ballerinaType));
            case ARRAY -> Optional.of(PropertyType.types(Value.FieldType.EXPRESSION_SET, ballerinaType));
            case MAP -> Optional.of(PropertyType.types(Value.FieldType.MAPPING_EXPRESSION_SET, ballerinaType));
            case RECORD -> {
                if (typeSymbol.typeKind() != TypeDescKind.RECORD && typeSymbol.getModule().isPresent()) {
                    // not an anonymous record
                    String type = ballerinaType;
                    String[] typeParts = ballerinaType.split(":");
                    if (typeParts.length > 1) {
                        type = typeParts[1];
                    }
                    ModuleID id = typeSymbol.getModule().get().id();
                    String packageIdentifier = "%s:%s:%s".formatted(id.orgName(), id.moduleName(), id.version());
                    PropertyType propertyType = new PropertyType.Builder()
                            .fieldType(Value.FieldType.RECORD_MAP_EXPRESSION)
                            .ballerinaType(ballerinaType)
                            .setTypeMembers(List.of(new ParameterMemberTypeData(type, "RECORD_TYPE",
                                    packageIdentifier, id.packageName())))
                            .build();
                    yield Optional.of(propertyType);
                }
                yield Optional.empty();
            }
            default -> Optional.empty();
        };
    }

    private static Value.FieldType findMatchingValueType(Node node) {
        return switch (node.kind()) {
            case STRING_TEMPLATE_EXPRESSION -> Value.FieldType.TEXT;
            case NUMERIC_LITERAL -> Value.FieldType.NUMBER;
            case TRUE_KEYWORD, FALSE_KEYWORD, BOOLEAN_LITERAL -> Value.FieldType.FLAG;
            case LIST_BINDING_PATTERN, LIST_CONSTRUCTOR -> Value.FieldType.EXPRESSION_SET;
            case MAPPING_BINDING_PATTERN, MAPPING_CONSTRUCTOR -> Value.FieldType.MAPPING_EXPRESSION_SET;
            default -> Value.FieldType.EXPRESSION;
        };
    }

    private static String getSelectedType(Node node, SemanticModel semanticModel) {
        if (node != null) {
            Optional<TypeSymbol> paramType = semanticModel.typeOf(node);
            if (paramType.isPresent()) {
                if (paramType.get().getModule().isPresent()) {
                    ModuleID id = paramType.get().getModule().get().id();
                    return CommonUtils.getTypeSignature(paramType.get(), ModuleInfo.from(id));
                } else {
                    return CommonUtils.getTypeSignature(paramType.get(), null);
                }
            }
        }
        return null;
    }

    public Value.FieldType fieldType() {
        return fieldType;
    }

    public String ballerinaType() {
        return ballerinaType;
    }

    public List<Object> options() {
        return options;
    }

    public List<PropertyTypeMemberInfo> typeMembers() {
        return typeMembers;
    }

    public boolean selected() {
        return selected;
    }

    public void selected(boolean selected) {
        this.selected = selected;
    }

    public static class Builder {
        private Value.FieldType fieldType;
        private String ballerinaType;
        private List<Object> options;
        private List<PropertyTypeMemberInfo> typeMembers;
        private boolean selected = false;

        public Builder() {
        }

        public Builder fieldType(Value.FieldType fieldType) {
            this.fieldType = fieldType;
            return this;
        }

        public Builder ballerinaType(String ballerinaType) {
            this.ballerinaType = ballerinaType;
            return this;
        }

        public Builder options(List<Object> options) {
            this.options = options;
            return this;
        }

        public Builder setTypeMembers(List<ParameterMemberTypeData> typeMembers) {
            this.typeMembers = typeMembers.stream().map(memberType -> new PropertyTypeMemberInfo(memberType.type(),
                    memberType.packageInfo(), memberType.kind(), false)).toList();
            return this;
        }

        public Builder setMembers(List<PropertyTypeMemberInfo> typeMembers) {
            this.typeMembers = typeMembers;
            return this;
        }

        public Builder selected(boolean selected) {
            this.selected = selected;
            return this;
        }

        public PropertyType build() {
            return new PropertyType(fieldType, ballerinaType, options, typeMembers, selected);
        }
    }

    /**
     * Deserialize a list of PropertyType from a JSON string.
     *
     * @param jsonString the JSON string representing the list of PropertyType
     * @return the list of PropertyType objects
     */
    public static List<PropertyType> deserializeTypes(String jsonString) {
        JsonElement jsonElement = JsonParser.parseString(jsonString);
        Gson gson = new Gson();
        if (jsonElement.isJsonArray()) {
            JsonArray jsonArray = jsonElement.getAsJsonArray();
            Type listType = new TypeToken<List<PropertyType>>() { }.getType();
            return gson.fromJson(jsonArray, listType);
        }
        return new ArrayList<>();
    }

    public static class FieldTypeSerializer implements JsonSerializer<Value.FieldType> {
        @Override
        public JsonElement serialize(Value.FieldType src, Type typeOfSrc, JsonSerializationContext context) {
            return new JsonPrimitive(src.name());
        }
    }
}
