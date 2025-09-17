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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.VARIABLE_NAME_KEY;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getValueString;

/**
 * Represents a model use to render a Listener in UI.
 *
 * @since 1.0.0
 */
public class Listener {
    private final String id;
    private final String name;
    private final String type;
    private final String displayName;
    private final String description;
    private final String moduleName;
    private final String orgName;
    private final String version;
    private final String packageName;
    private final String listenerProtocol;
    private final String icon;
    private Map<String, Value> properties;
    private Codedata codedata;

    public Listener(String id, String name, String type, String displayName, String description,
                    String moduleName, String orgName, String version,
                    String packageName, String listenerProtocol, String icon, Map<String, Value> properties,
                    Codedata codedata) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.displayName = displayName;
        this.description = description;
        this.moduleName = moduleName;
        this.orgName = orgName;
        this.version = version;
        this.packageName = packageName;
        this.listenerProtocol = listenerProtocol;
        this.icon = icon;
        this.properties = properties;
        this.codedata = codedata;
    }

    public boolean isListenerInitProperty(Value value) {
        Codedata codedata = value.getCodedata();
        return Objects.nonNull(codedata) && Objects.nonNull(codedata.getType()) &&
                codedata.getType().equals("LISTENER_INIT_PARAM");
    }

    public boolean isRequiredArgument(Value value) {
        Codedata codedata = value.getCodedata();
        return Objects.nonNull(codedata) && Objects.nonNull(codedata.getArgType()) &&
                codedata.getArgType().equals("REQUIRED");
    }

    public String getDeclaration() {
        List<String> params = new ArrayList<>();
        StringBuilder listenerDeclaration = new StringBuilder();
        listenerDeclaration.append("listener ");
        listenerDeclaration.append(listenerProtocol);
        listenerDeclaration.append(":Listener ");
        listenerDeclaration.append(getValueString(getVariableNameProperty()));
        listenerDeclaration.append(" = new ");
        listenerDeclaration.append("(");
        properties.forEach((key, value) -> { // TODO: Order could go wrong here
            if (value.isEnabledWithValue() && isListenerInitProperty(value)) {
                if (isRequiredArgument(value)) {
                    params.add(getValueString(value));
                } else {
                    params.add(String.format("%s = %s", key, getValueString(value)));
                }
            }
        });
        listenerDeclaration.append(String.join(", ", params));
        listenerDeclaration.append(");");
        return listenerDeclaration.toString();
    }

    public String getOrgName() {
        return orgName;
    }

    public String getModuleName() {
        return moduleName;
    }

    public Value getProperty(String key) {
        return properties.get(key);
    }

    public Value getVariableNameProperty() {
        return properties.get(VARIABLE_NAME_KEY);
    }

    public Map<String, Value> getProperties() {
        return properties;
    }

    public String getListenerProtocol() {
        return listenerProtocol;
    }

    public String getIcon() {
        return icon;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public String getVersion() {
        return version;
    }

    public String getPackageName() {
        return packageName;
    }

    public Codedata getCodedata() {
        return codedata;
    }

    public void setCodedata(Codedata codedata) {
        this.codedata = codedata;
    }

    public void setProperties(Map<String, Value> properties) {
        this.properties = properties;
    }

    public static class ListenerBuilder {
        private String id;
        private String name;
        private String type;
        private String displayName;
        private String description;
        private String moduleName;
        private String orgName;
        private String version;
        private String packageName;
        private String listenerProtocol;
        private String icon;
        private Map<String, Value> properties;
        private Codedata codedata;

        public ListenerBuilder setId(String id) {
            this.id = id;
            return this;
        }

        public ListenerBuilder setName(String name) {
            this.name = name;
            return this;
        }

        public ListenerBuilder setType(String type) {
            this.type = type;
            return this;
        }

        public ListenerBuilder setDisplayName(String displayName) {
            this.displayName = displayName;
            return this;
        }

        public ListenerBuilder setDescription(String description) {
            this.description = description;
            return this;
        }

        public ListenerBuilder setModuleName(String moduleName) {
            this.moduleName = moduleName;
            return this;
        }

        public ListenerBuilder setOrgName(String orgName) {
            this.orgName = orgName;
            return this;
        }

        public ListenerBuilder setVersion(String version) {
            this.version = version;
            return this;
        }

        public ListenerBuilder setPackageName(String packageName) {
            this.packageName = packageName;
            return this;
        }

        public ListenerBuilder setListenerProtocol(String listenerProtocol) {
            this.listenerProtocol = listenerProtocol;
            return this;
        }

        public ListenerBuilder setIcon(String icon) {
            this.icon = icon;
            return this;
        }

        public ListenerBuilder setProperties(Map<String, Value> properties) {
            this.properties = properties;
            return this;
        }

        public ListenerBuilder setCodedata(Codedata codedata) {
            this.codedata = codedata;
            return this;
        }

        public Listener build() {
            return new Listener(id, name, type, displayName, description, moduleName, orgName,
                    version, packageName, listenerProtocol, icon, properties, codedata);
        }
    }
}
