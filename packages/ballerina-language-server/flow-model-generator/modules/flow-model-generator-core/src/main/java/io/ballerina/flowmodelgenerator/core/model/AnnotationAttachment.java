package io.ballerina.flowmodelgenerator.core.model;

import com.google.gson.Gson;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * @param modulePrefix module prefix
 * @param name         annotation name
 * @param properties   properties of the annotation attachment
 */
public record AnnotationAttachment(String modulePrefix, String name, Map<String, Property> properties) {

    private static final Gson gson = new Gson();
    private static final String LS = System.lineSeparator();

    private String propertiesToString() {
        if (properties == null || properties.isEmpty()) {
            return "";
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> propsMap = (Map<String, Object>) (Map<?, ?>) properties;
        return handleProperty(propsMap);
    }

    private String handleProperty(Map<?, ?> map) {
        if (map.containsKey("valueType") && map.containsKey("value")) {
            Property prop = gson.fromJson(gson.toJson(map), Property.class);
            return handleProperty(prop);
        }

        // Attributes of the annotation attachment
        List<String> values = new ArrayList<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            Object value = entry.getValue();
            if (value instanceof Map<?, ?>) {
                values.add(entry.getKey() + ": " + handleProperty((Map<String, Object>) value));
            } else if (value instanceof Property) {
                values.add(entry.getKey() + ": " + handleProperty((Property) value));
            }
        }
        return "{" + LS + String.join("," + LS, values) + LS + "}";
    }

    private String handleProperty(Property prop) {
        if (Property.ValueType.EXPRESSION.name().equals(prop.valueType())) {
            return prop.value().toString();
        }

        // Object with attributes
        if (Property.ValueType.MAPPING_EXPRESSION_SET.name().equals(prop.valueType())) {
            Map<String, Object> valueMap = (Map<String, Object>) prop.value();
            return handleProperty(valueMap);
        }

        return prop.value().toString(); // TODO: Return default values for each type
    }

    @Override
    public String toString() {
        if (name == null || name.isEmpty()) {
            return "";
        }

        if (modulePrefix == null || modulePrefix.isEmpty()) {
            return "@" + name + propertiesToString();
        }

        return "@" + modulePrefix + ":" + name + propertiesToString();
    }
}
