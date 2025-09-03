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

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Represents a model unifying service initialization and listener creation.
 *
 * @since 1.3.0
 */
public class ServiceInitModel {
    private final String id;
    private final String displayName;
    private final String description;
    private final String orgName;
    private final String packageName;
    private final String moduleName;
    private final String version;
    private final String type;
    private final String icon;
    private final Map<String, Value> properties = new LinkedHashMap<>();

    public ServiceInitModel(String id, String displayName, String description, String orgName,
                            String packageName, String moduleName, String version, String type, String icon) {
        this.id = id;
        this.displayName = displayName;
        this.description = description;
        this.orgName = orgName;
        this.packageName = packageName;
        this.moduleName = moduleName;
        this.version = version;
        this.type = type;
        this.icon = icon;
    }

    public String getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public String getOrgName() {
        return orgName;
    }

    public String getPackageName() {
        return packageName;
    }

    public String getModuleName() {
        return moduleName;
    }

    public String getVersion() {
        return version;
    }

    public String getType() {
        return type;
    }

    public String getIcon() {
        return icon;
    }

    public Map<String, Value> getProperties() {
        return properties;
    }

    public void addProperty(String key, Value value) {
        this.properties.put(key, value);
    }

    public static class Builder {
        private String id;
        private String displayName;
        private String description;
        private String orgName;
        private String packageName;
        private String moduleName;
        private String version;
        private String type;
        private String icon;

        public Builder setId(String id) {
            this.id = id;
            return this;
        }

        public Builder setDisplayName(String displayName) {
            this.displayName = displayName;
            return this;
        }

        public Builder setDescription(String description) {
            this.description = description;
            return this;
        }

        public Builder setOrgName(String orgName) {
            this.orgName = orgName;
            return this;
        }

        public Builder setPackageName(String packageName) {
            this.packageName = packageName;
            return this;
        }

        public Builder setModuleName(String moduleName) {
            this.moduleName = moduleName;
            return this;
        }

        public Builder setVersion(String version) {
            this.version = version;
            return this;
        }

        public Builder setType(String type) {
            this.type = type;
            return this;
        }

        public Builder setIcon(String icon) {
            this.icon = icon;
            return this;
        }

        public ServiceInitModel build() {
            return new ServiceInitModel(id, displayName, description, orgName, packageName,
                    moduleName, version, type, icon);
        }
    }
}
