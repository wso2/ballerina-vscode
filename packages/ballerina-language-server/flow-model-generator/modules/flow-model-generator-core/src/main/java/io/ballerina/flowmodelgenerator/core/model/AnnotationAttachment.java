package io.ballerina.flowmodelgenerator.core.model;

import java.util.Map;

/**
 * @param modulePrefix  module prefix
 * @param name          annotation name
 * @param properties    properties of the annotation attachment
 */
public record AnnotationAttachment(String modulePrefix, String name, Map<String, Property> properties) {

    private String propertiesToString() {
        if (properties == null || properties.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("{");
        int count = 0;
        for (Map.Entry<String, Property> entry : properties.entrySet()) {
            sb.append(entry.getKey()).append(": ").append(entry.getValue().toString());
            count++;
            if (count < properties.size()) {
                sb.append(";").append(System.lineSeparator());
            }
        }
        sb.append("}");
        return sb.toString();
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
