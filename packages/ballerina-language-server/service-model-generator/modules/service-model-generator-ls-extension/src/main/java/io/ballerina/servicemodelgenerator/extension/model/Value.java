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

import com.google.gson.JsonPrimitive;
import io.ballerina.modelgenerator.commons.ParameterMemberTypeData;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.DOUBLE_QUOTE;

/**
 * Represents model to show input field in the UI.
 *
 * @since 1.0.0
 */
public class Value {
    private MetaData metadata;
    private Codedata codedata;
    private String placeholder;
    private String valueType;
    private String valueTypeConstraint;
    private Object value;
    private List<Object> values;
    private List<Object> items;
    private List<Value> choices;
    private List<PropertyTypeMemberInfo> typeMembers;
    private Map<String, Value> properties;
    private final Map<String, String> imports;
    private boolean enabled;
    private boolean editable;
    private boolean optional;
    private boolean advanced;

    public Value(Value value) {
        this.metadata = value.metadata;
        this.enabled = value.enabled;
        this.editable = value.editable;
        this.value = value.value;
        this.values = value.values;
        this.valueType = value.valueType;
        this.valueTypeConstraint = value.valueTypeConstraint;
        this.placeholder = value.placeholder;
        this.optional = value.optional;
        this.advanced = value.advanced;
        this.properties = value.properties;
        this.items = value.items;
        this.codedata = value.codedata;
        this.choices = value.choices;
        this.typeMembers = value.typeMembers;
        this.imports = value.imports;
    }

    public Value(MetaData metadata, boolean enabled, boolean editable, Object value, List<Object> values,
                 String valueType, String valueTypeConstraint, String placeholder, boolean optional,
                 boolean advanced, Map<String, Value> properties, List<Object> items, Codedata codedata,
                 List<PropertyTypeMemberInfo> typeMembers, Map<String, String> imports) {
        this.metadata = metadata;
        this.enabled = enabled;
        this.editable = editable;
        this.value = value;
        this.values = values;
        this.valueType = valueType;
        this.valueTypeConstraint = valueTypeConstraint;
        this.placeholder = placeholder;
        this.optional = optional;
        this.advanced = advanced;
        this.properties = properties;
        this.items = items;
        this.codedata = codedata;
        this.typeMembers = typeMembers;
        this.imports = imports;
    }

    public MetaData getMetadata() {
        return metadata;
    }

    public void setMetadata(MetaData metadata) {
        this.metadata = metadata;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean isEnabledWithValue() {
        return enabled && ((value != null && ((value instanceof String && !((String) value).isEmpty())
                || (value instanceof JsonPrimitive jsonPrimitive && !jsonPrimitive.getAsString().isEmpty())))
                || (values != null && !values.isEmpty()));
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isEditable() {
        return editable;
    }

    public void setEditable(boolean editable) {
        this.editable = editable;
    }

    public String getValue() {
        if (Objects.nonNull(values) && !values.isEmpty()) {
            if (values.getFirst() instanceof String) {
                return String.join(", ", values.stream().map(v -> (String) v).toList());
            }
            if (values.getFirst() instanceof JsonPrimitive) {
                return String.join(", ", values.stream().map(v -> (JsonPrimitive) v)
                        .map(JsonPrimitive::getAsString).toList());
            }
        }
        if (value instanceof String) {
            return (String) value;
        }
        if (value instanceof Boolean) {
            return String.valueOf(value);
        }
        if (value instanceof JsonPrimitive) {
            return ((JsonPrimitive) value).getAsString();
        }
        return null;
    }

    public String getLiteralValue() {
        String valueStr = getValue();
        if (valueStr != null && valueStr.startsWith(DOUBLE_QUOTE) && valueStr.endsWith(DOUBLE_QUOTE)) {
            return valueStr;
        }
        return DOUBLE_QUOTE + valueStr + DOUBLE_QUOTE;
    }

    public Object getValueAsObject() {
        return value;
    }

    public List<String> getValues() {
        if (Objects.nonNull(values) && !values.isEmpty()) {
            Object firstValue = values.getFirst();
            if (firstValue instanceof String) {
                return values.stream().map(v -> (String) v).toList();
            }
            return values.stream().map(v -> (JsonPrimitive) v).map(JsonPrimitive::getAsString).toList();
        }
        return null;
    }

    public List<Object> getValuesAsObjects() {
        return values;
    }

    public void setValue(Object value) {
        this.value = value;
    }

    public void setValues(List<Object> values) {
        this.values = values;
    }

    public void addValue(String value) {
        if (Objects.isNull(this.values)) {
            this.values = List.of(value);
        } else {
            this.values.add(value);
        }
    }

    public String getValueType() {
        return valueType;
    }

    public void setValueType(String valueType) {
        this.valueType = valueType;
    }

    public String getValueTypeConstraint() {
        return valueTypeConstraint;
    }

    public void setValueTypeConstraint(String valueTypeConstraint) {
        this.valueTypeConstraint = valueTypeConstraint;
    }

    public String getPlaceholder() {
        return placeholder;
    }

    public void setPlaceholder(String placeholder) {
        this.placeholder = placeholder;
    }

    public boolean isOptional() {
        return optional;
    }

    public void setOptional(boolean optional) {
        this.optional = optional;
    }

    public boolean isAdvanced() {
        return advanced;
    }

    public void setAdvanced(boolean advanced) {
        this.advanced = advanced;
    }

    public Map<String, Value> getProperties() {
        return properties;
    }

    public void setProperties(Map<String, Value> properties) {
        this.properties = properties;
    }

    public List<String> getItems() {
        return items.stream().map(Object::toString).toList();
    }

    public void setItems(List<Object> items) {
        this.items = items;
    }

    public Codedata getCodedata() {
        return codedata;
    }

    public void setCodedata(Codedata codedata) {
        this.codedata = codedata;
    }

    public List<Value> getChoices() {
        return choices;
    }

    public void setChoices(List<Value> choices) {
        this.choices = choices;
    }

    public Value getProperty(String key) {
        return properties.get(key);
    }

    public List<PropertyTypeMemberInfo> getTypeMembers() {
        return typeMembers;
    }

    public void setTypeMembers(List<PropertyTypeMemberInfo> typeMembers) {
        this.typeMembers = typeMembers;
    }

    public Map<String, String> getImports() {
        return imports;
    }

    public static class ValueBuilder {
        private MetaData metadata;
        private Codedata codedata;
        private Object value;
        private List<Object> values;
        private String valueType;
        private String valueTypeConstraint;
        private String placeholder;
        private List<Object> items;
        private Map<String, Value> properties;
        private List<PropertyTypeMemberInfo> typeMembers;
        private Map<String, String> imports;
        private boolean enabled = false;
        private boolean editable = false;
        private boolean optional = false;
        private boolean advanced = false;

        public ValueBuilder metadata(String label, String description) {
            this.metadata = new MetaData(label, description);
            return this;
        }

        public ValueBuilder setMetadata(MetaData metadata) {
            this.metadata = metadata;
            return this;
        }

        public ValueBuilder enabled(boolean enabled) {
            this.enabled = enabled;
            return this;
        }

        public ValueBuilder editable(boolean editable) {
            this.editable = editable;
            return this;
        }

        public ValueBuilder value(Object value) {
            this.value = value;
            return this;
        }

        public ValueBuilder valueType(String valueType) {
            this.valueType = valueType;
            return this;
        }

        public ValueBuilder setValueTypeConstraint(String valueTypeConstraint) {
            this.valueTypeConstraint = valueTypeConstraint;
            return this;
        }

        public ValueBuilder setPlaceholder(String placeholder) {
            this.placeholder = placeholder;
            return this;
        }

        public ValueBuilder optional(boolean optional) {
            this.optional = optional;
            return this;
        }

        public ValueBuilder setAdvanced(boolean advanced) {
            this.advanced = advanced;
            return this;
        }

        public ValueBuilder setProperties(Map<String, Value> properties) {
            this.properties = properties;
            return this;
        }

        public ValueBuilder setItems(List<Object> items) {
            this.items = items;
            return this;
        }

        public ValueBuilder setCodedata(Codedata codedata) {
            this.codedata = codedata;
            return this;
        }

        public ValueBuilder setValues(List<Object> values) {
            this.values = values;
            return this;
        }

        public ValueBuilder setTypeMembers(List<ParameterMemberTypeData> typeMembers) {
            this.typeMembers = typeMembers.stream().map(memberType -> new PropertyTypeMemberInfo(memberType.type(),
                    memberType.packageInfo(), memberType.kind(), false)).toList();
            return this;
        }

        public ValueBuilder setMembers(List<PropertyTypeMemberInfo> typeMembers) {
            this.typeMembers = typeMembers;
            return this;
        }

        public ValueBuilder setImports(Map<String, String> imports) {
            this.imports = imports;
            return this;
        }

        public ValueBuilder addImport(String key, String value) {
            if (this.imports == null) {
                this.imports = new HashMap<>();
            }
            this.imports.put(key, value);
            return this;
        }

        public Value build() {
            return new Value(metadata, enabled, editable, value, values, valueType, valueTypeConstraint,
                    placeholder, optional, advanced, properties, items, codedata, typeMembers, imports);
        }
    }
}
