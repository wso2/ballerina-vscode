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

package io.ballerina.flowmodelgenerator.core.utils;

import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.modelgenerator.commons.CommonUtils;

import java.util.Map;
import java.util.Optional;

/**
 * Utility class for flow node and properties related operations.
 *
 * @since 1.0.0
 */
public class FlowNodeUtil {

    /**
     * Check whether the given flow node has the check key flag set.
     *
     * @param flowNode flow node to check
     * @return true if the check key flag is set, false otherwise
     */
    public static boolean hasCheckKeyFlagSet(FlowNode flowNode) {
        Map<String, Property> properties = flowNode.properties();
        return properties != null &&
                properties.containsKey(Property.CHECK_ERROR_KEY) &&
                properties.get(Property.CHECK_ERROR_KEY).value().equals(true);
    }

    /**
     * Check weather the given position is within a do clause.
     *
     * @param context template context
     * @return true if the context is within a do clause, false otherwise
     */
    public static boolean withinDoClause(NodeBuilder.TemplateContext context) {
        return CommonUtils.withinDoClause(context.workspaceManager(), context.filePath(),
                context.codedata().lineRange());
    }

    /**
     * Get the property key for a given key. If the key is a reserved property key, append an underscore to it.
     *
     * @param key the key to check
     * @return the property key
     */
    public static String getPropertyKey(String key) {
        if (Property.RESERVED_PROPERTY_KEYS.contains(key)) {
            return "$" + key;
        }
        return key;
    }

    /**
     * Copies a property value from one FlowNode to another.
     *
     * @param targetNode        the node to update
     * @param sourceNode        the node to copy from
     * @param targetPropertyKey the property key in the target node
     * @param sourcePropertyKey the property key in the source node
     */
    public static void copyPropertyValue(FlowNode targetNode, FlowNode sourceNode, String targetPropertyKey,
                                         String sourcePropertyKey) {
        Property targetProperty = targetNode.properties().get(targetPropertyKey);
        Optional<Property> sourceProperty = sourceNode.getProperty(sourcePropertyKey);

        if (targetProperty == null || sourceProperty.isEmpty() ||
                sourceProperty.get().value() == null) {
            return;
        }

        Property updatedProperty = createUpdatedProperty(targetProperty, sourceProperty.get().value());
        targetNode.properties().put(targetPropertyKey, updatedProperty);
    }

    /**
     * Creates an updated property with a new value while preserving metadata.
     *
     * @param <T>              the type of the new value
     * @param originalProperty the original property
     * @param newValue         the new value to set
     * @return the updated property
     */
    public static <T> Property createUpdatedProperty(Property originalProperty, T newValue) {
        if (originalProperty == null) {
            throw new IllegalArgumentException("Original property cannot be null");
        }

        Property.Builder<T> builder = new Property.Builder<T>(null)
                .type(Property.ValueType.valueOf(originalProperty.valueType()))
                .typeConstraint(originalProperty.valueTypeConstraint())
                .value(newValue);

        if (originalProperty.codedata() != null) {
            builder.codedata()
                    .kind(originalProperty.codedata().kind())
                    .originalName(originalProperty.codedata().originalName());
        }

        return builder.build();
    }

    /**
     * Adds a property to a NodeBuilder by copying all attributes from an existing property with an optional custom
     * value.
     *
     * @param nodeBuilder the node builder to add the property to
     * @param key         the property key
     * @param property    the existing property to copy from
     * @param customValue the custom value to use instead of the property's original value, or null to use original
     */
    public static void addPropertyFromTemplate(NodeBuilder nodeBuilder, String key, Property property,
                                               String customValue, boolean isHidden) {
        if (nodeBuilder == null || key == null || property == null) {
            throw new IllegalArgumentException("NodeBuilder, key, and property cannot be null");
        }

        if (property.metadata() == null) {
            throw new IllegalArgumentException("Property metadata cannot be null");
        }

        Object valueToUse = customValue != null ? customValue : property.value();
        boolean hidden = isHidden || property.hidden();

        nodeBuilder.properties().custom()
                .metadata()
                    .label(property.metadata().label())
                    .description(property.metadata().description())
                    .stepOut()
                .type(Property.ValueType.valueOf(property.valueType()))
                .placeholder(property.placeholder())
                .value(valueToUse)
                .defaultValue(property.defaultValue())
                .typeConstraint(property.valueTypeConstraint())
                .imports(property.imports() != null ? property.imports().toString() : null)
                .optional(property.optional())
                .editable(property.editable())
                .advanced(property.advanced())
                .hidden(hidden)
                .modified(property.modified())
                .codedata()
                    .kind(property.codedata() != null ? property.codedata().kind() : "")
                    .stepOut()
                .stepOut()
                .addProperty(key);
    }

    /**
     * Adds a simple string property to a NodeBuilder with the specified configuration.
     *
     * @param nodeBuilder the node builder to add the property to
     * @param key         the property key
     * @param label       the property label
     * @param description the property description
     * @param placeholder the placeholder text
     * @param value       the property value
     */
    public static void addStringProperty(NodeBuilder nodeBuilder, String key, String label, String description,
                                         String placeholder, String value) {
        if (nodeBuilder == null || key == null) {
            throw new IllegalArgumentException("NodeBuilder and key cannot be null");
        }

        nodeBuilder.properties().custom()
                .metadata()
                    .label(label != null ? label : "")
                    .description(description != null ? description : "")
                    .stepOut()
                .value(value != null && !value.isEmpty() ? value : "")
                .defaultValue("")
                .type(Property.ValueType.STRING)
                .placeholder(placeholder != null ? placeholder : "")
                .optional(true)
                .editable()
                .codedata()
                    .kind("REQUIRED")
                    .stepOut()
                .stepOut()
                .addProperty(key);
    }

    /**
     * Creates a default template context for node builders with the specified codedata.
     *
     * @param sourceBuilder the source builder containing workspace and file information
     * @param codedata      the codedata to use for the template context
     * @return the created template context
     */
    public static NodeBuilder.TemplateContext createDefaultTemplateContext(SourceBuilder sourceBuilder,
                                                                           Codedata codedata) {
        if (sourceBuilder == null || codedata == null) {
            throw new IllegalArgumentException("SourceBuilder and codedata cannot be null");
        }

        if (sourceBuilder.flowNode == null || sourceBuilder.flowNode.codedata() == null ||
                sourceBuilder.flowNode.codedata().lineRange() == null) {
            throw new IllegalArgumentException("SourceBuilder must have valid flowNode with codedata and lineRange");
        }

        return new NodeBuilder.TemplateContext(
                sourceBuilder.workspaceManager,
                sourceBuilder.filePath,
                sourceBuilder.flowNode.codedata().lineRange().startLine(),
                codedata,
                null
        );
    }

    /**
     * Copies common properties from source FlowNode to target FlowNode, excluding variable and type properties. Only
     * copies properties that have non-null and non-empty values in the source node.
     *
     * @param targetNode the node to copy properties to
     * @param sourceNode the node to copy properties from
     */
    public static void copyCommonProperties(FlowNode targetNode, FlowNode sourceNode) {
        if (targetNode.properties() == null || sourceNode.properties() == null) {
            return;
        }

        for (Map.Entry<String, Property> targetPropertyEntry : targetNode.properties().entrySet()) {
            String propertyName = targetPropertyEntry.getKey();

            // Skip copying variable and type properties
            if (Property.VARIABLE_KEY.equals(propertyName) || Property.TYPE_KEY.equals(propertyName)) {
                continue;
            }

            Optional<Property> sourceProperty = sourceNode.getProperty(propertyName);

            // Only copy if source property exists and has a non-empty string value
            if (sourceProperty.isPresent()) {
                Property srcProp = sourceProperty.get();
                if (srcProp.value() != null && !srcProp.value().toString().isEmpty()) {
                    copyPropertyValue(targetNode, sourceNode, propertyName, propertyName);
                }
            }
        }
    }
}
