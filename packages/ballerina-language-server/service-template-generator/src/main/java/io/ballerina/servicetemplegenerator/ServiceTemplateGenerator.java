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

package io.ballerina.servicetemplegenerator;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import io.ballerina.centralconnector.CentralAPI;
import io.ballerina.centralconnector.RemoteCentral;
import io.ballerina.centralconnector.response.Function;
import io.ballerina.centralconnector.response.Listener;
import io.ballerina.centralconnector.response.Listeners;
import io.ballerina.servicetemplegenerator.model.ServiceTemplates;

import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;

public class ServiceTemplateGenerator {

    private static final java.lang.reflect.Type typeToken =
            new TypeToken<Map<String, List<PackageMetadataInfo>>>() {
            }.getType();

    private static final java.lang.reflect.Type typeToken2 =
            new TypeToken<Map<String, Map<String, Map<String, List<ListenerData>>>>>() {
            }.getType();

    private static final Gson gson = new Gson();

    public static final String PACKAGE_JSON = "packages.json";
    public static final String SERVICE_TEMPLATES_JSON = "service_templates.json";
    public static final String FLOW_MODEL_GENERATOR_DIR =
            "flow-model-generator/modules/flow-model-index-generator/src/main/resources";
    public static final String SERVICE_TEMPLATE_GENERATOR_DIR = "service-template-generator/src/main/resources";
    public static final List<String> MODULE_PREFIX_EXCLUDED = List.of("data.", "jballerina.", "lang.");

    public static void main(String[] args) {
        CentralAPI centralApi = RemoteCentral.getInstance();

        try (FileReader reader = new FileReader(Path.of(FLOW_MODEL_GENERATOR_DIR)
                .resolve(PACKAGE_JSON).toString(), StandardCharsets.UTF_8)) {
            Map<String, List<PackageMetadataInfo>> packagesMap = gson.fromJson(reader, typeToken);

            List<ServiceTemplates.ServiceTemplate> serviceTemplateList = new ArrayList<>();
            Map<String, Map<String, Map<String, List<ListenerData>>>> listenersMap = new HashMap<>();
            for (Map.Entry<String, List<PackageMetadataInfo>> pkgMap : packagesMap.entrySet()) {
                String orgName = pkgMap.getKey();
                for (PackageMetadataInfo pkgInfo : pkgMap.getValue()) {
                    String moduleName = pkgInfo.name();
                    if (skipModule(moduleName)) {
                        continue;
                    }

                    String version = pkgInfo.version();
                    Listeners listeners = centralApi.listeners(orgName, moduleName, version);
                    List<ListenerData> listenerDataList = genListenerData(listeners);
                    if (listenerDataList.isEmpty()) {
                        continue;
                    }
                    listenersMap
                            .computeIfAbsent(orgName, k -> new HashMap<>())
                            .computeIfAbsent(moduleName, k -> new HashMap<>())
                            .put(version, listenerDataList);

                    Thread.sleep(3000);
                }
            }

            String destinationPath = Path.of(SERVICE_TEMPLATE_GENERATOR_DIR)
                    .resolve(SERVICE_TEMPLATES_JSON)
                    .toString();
            try (FileWriter writer = new FileWriter(destinationPath, StandardCharsets.UTF_8)) {
                gson.toJson(listenersMap, writer);
            } catch (IOException e) {
                Logger.getGlobal().log(Level.SEVERE, "Failed to write packages to JSON file", e);
            }
        } catch (IOException e) {
            Logger.getGlobal().log(Level.SEVERE, "Error reading packages JSON file: " + e.getMessage());
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }

    private static List<ListenerData> genListenerData(Listeners listeners) {
        List<ListenerData> listenerDataList = new ArrayList<>();
        for (Listener listener : listeners.listeners()) {
            Function initMethod = listener.initMethod();
            List<String> listenerArgs = new ArrayList<>();
            int index = 2;
            for (Function.Parameter parameter : initMethod.parameters()) {
                Function.Type type = parameter.type();
                Optional<String> arg = genDefaultValue(genType(type), true);
                arg.ifPresent(listenerArgs::add);
                index = index + 1;
            }
            String args = String.join(",", listenerArgs);
            ListenerData listenerData = new ListenerData(listener.name(), args, index);
            listenerDataList.add(listenerData);
        }
        return listenerDataList;
    }

    private static boolean skipModule(String moduleName) {
        for (String modulePrefix : MODULE_PREFIX_EXCLUDED) {
            if (moduleName.startsWith(modulePrefix)) {
                return true;
            }
        }
        return false;
    }

    private static Optional<String> genDefaultValue(Type type, boolean isTopLevel) {
        if (type.isInclusion() || type.isRestParam()) {
            return Optional.empty();
        }

        if (type.isArrayType()) {
            if (isTopLevel) {
                Type elementType = type.elementType();
                return genDefaultValue(elementType, false);
            }
            return Optional.of("[]");
        } else if (isUnionType(type)) {
            return genDefaultValue(type.memberTypes().getFirst(), false);
        } else if (type.isTuple()) {
            if (isTopLevel) {
                List<String> typesStr = new ArrayList<>();
                for (Type memberType : type.memberTypes()) {
                    Optional<String> s = genDefaultValue(memberType, false);
                    if (s.isEmpty()) {
                        return Optional.of("[]");
                    }
                    typesStr.add(s.get());
                }
                return Optional.of("[" + String.join(", ", typesStr) + "]");
            }
            return Optional.of("[]");
        } else if (isObjectType(type)) {
            return Optional.of("new ()");
        } else if (isRecordType(type)) {
            return Optional.of("{}");
        } else if (isErrorType(type)) {
            return Optional.of("error(\"\")");
        } else if (isBuiltInType(type)) {
            String name = type.name();
            if (name.startsWith("int")) {
                return Optional.of("0");
            } else if (name.equals("float")) {
                return Optional.of("0.0");
            } else if (name.equals("boolean")) {
                return Optional.of("false");
            } else if (name.equals("decimal")) {
                return Optional.of("0.0d");
            } else if (name.startsWith("string")) {
                return Optional.of("\"\"");
            } else {
                return Optional.of("\"\"");
            }
        } else {
            return Optional.of("\"\"");
        }
    }

    private static boolean isUnionType(Type type) {
        return !type.memberTypes().isEmpty();
    }

    private static boolean isBuiltInType(Type type) {
        return type.category() != null && type.category().equals("builtin");
    }

    private static boolean isErrorType(Type type) {
        return type.category() != null && type.category().equals("errors");
    }

    private static boolean isRecordType(Type type) {
        return type.category() != null && type.category().equals("records");
    }

    private static boolean isObjectType(Type type) {
        return type.category() != null && type.category().equals("objectTypes");
    }

    private static Type genType(Function.Type type) {
        return new Type(
                type.name(),
                type.category(),
                type.isInclusion(),
                type.isArrayType(),
                type.isTuple(),
                type.isRestParam(),
                type.isPublic(),
                genTypes(type.memberTypes()),
                genType(type.elementType()));
    }

    private static Type genType(Function.ElementType type) {
        if (type == null) {
            return null;
        }

        return new Type(
                type.name(),
                type.category(),
                type.isInclusion(),
                type.isArrayType(),
                type.isTuple(),
                type.isRestParam(),
                type.isPublic(),
                genTypes(type.memberTypes()),
                null);
    }

    private static List<Type> genTypes(List<Function.Type> types) {
        List<Type> t = new ArrayList<>();
        for (Function.Type type : types) {
            t.add(genType(type));
        }
        return t;
    }

    record PackageMetadataInfo(String name, String version) {
    }

    private record Type(
            String name,
            String category,
            boolean isInclusion,
            boolean isArrayType,
            boolean isTuple,
            boolean isRestParam,
            boolean isPublic,
            List<Type> memberTypes,
            Type elementType
    ) {
    }

    private record ListenerData(
            String symbolName,
            String args,
            int index
    ) {
    }
}
