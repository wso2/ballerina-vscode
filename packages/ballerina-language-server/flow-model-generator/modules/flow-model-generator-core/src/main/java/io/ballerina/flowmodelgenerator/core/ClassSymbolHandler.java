/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.flowmodelgenerator.core;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.flowmodelgenerator.core.model.Client;
import io.ballerina.flowmodelgenerator.core.model.LibraryFunction;
import io.ballerina.flowmodelgenerator.core.model.TypeDef;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.FunctionDataBuilder;
import io.ballerina.modelgenerator.commons.ModuleInfo;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Handler for processing CLASS symbols from semantic model.
 * Extracts client classes and normal classes with their methods.
 *
 * @since 1.0.1
 */
public class ClassSymbolHandler {

    private ClassSymbolHandler() {
        // Prevent instantiation
    }

    /**
     * Processes a CLASS symbol and returns either a Client or TypeDef.
     *
     * @param classSymbol the class symbol to process
     * @param semanticModel the semantic model
     * @param moduleInfo the module information
     * @param org the organization name
     * @param packageName the package name
     * @return Optional containing either Client or TypeDef, or empty if not public
     */
    public static Optional<Object> process(ClassSymbol classSymbol,
                                            SemanticModel semanticModel,
                                            ModuleInfo moduleInfo,
                                            String org,
                                            String packageName) {
        // Process only PUBLIC classes: CLIENT classes (connectors) and normal classes
        if (!classSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
            return Optional.empty();
        }

        boolean isClient = classSymbol.qualifiers().contains(Qualifier.CLIENT);
        String className = classSymbol.getName().orElse(isClient ? "Client" : "Class");

        FunctionData.Kind classKind = isClient ? FunctionData.Kind.CONNECTOR : FunctionData.Kind.CLASS_INIT;

        FunctionData classData = new FunctionDataBuilder()
                .semanticModel(semanticModel)
                .moduleInfo(moduleInfo)
                .name(className)
                .parentSymbol(classSymbol)
                .functionResultKind(classKind)
                .build();

        List<LibraryFunction> functions = new ArrayList<>();

        // Add the constructor/init function first
        LibraryFunction constructor = LibraryModelConverter.functionDataToModel(classData, org, packageName);
        constructor.setName("init");  // Override name to "init" for constructor
        functions.add(constructor);

        // Then add all other methods (remote functions, resource functions, etc.)
        List<FunctionData> classMethods = new FunctionDataBuilder()
                .semanticModel(semanticModel)
                .moduleInfo(moduleInfo)
                .parentSymbolType(className)
                .parentSymbol(classSymbol)
                .buildChildNodes();

        for (FunctionData method : classMethods) {
            LibraryFunction methodFunc = LibraryModelConverter.functionDataToModel(method, org, packageName);
            functions.add(methodFunc);
        }

        if (isClient) {
            Client client = new Client(className, classData.description());
            client.setFunctions(functions);
            return Optional.of(client);
        } else {
            TypeDef typeDef = new TypeDef();
            typeDef.setName(className);
            typeDef.setDescription(classData.description());
            typeDef.setFunctions(functions);
            return Optional.of(typeDef);
        }
    }
}
