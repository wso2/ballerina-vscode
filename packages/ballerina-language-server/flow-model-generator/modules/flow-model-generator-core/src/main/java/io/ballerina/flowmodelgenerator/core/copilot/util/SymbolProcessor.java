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

package io.ballerina.flowmodelgenerator.core.copilot.util;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.ConstantSymbol;
import io.ballerina.compiler.api.symbols.Documentation;
import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.MethodSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.values.ConstantValue;
import io.ballerina.flowmodelgenerator.core.copilot.builder.TypeDefDataBuilder;
import io.ballerina.flowmodelgenerator.core.copilot.model.Client;
import io.ballerina.flowmodelgenerator.core.copilot.model.LibraryFunction;
import io.ballerina.flowmodelgenerator.core.copilot.model.Type;
import io.ballerina.flowmodelgenerator.core.copilot.model.TypeDef;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.FunctionDataBuilder;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.TypeDefData;

import java.util.ArrayList;
import java.util.List;

import static io.ballerina.flowmodelgenerator.core.copilot.util.LibraryModelConverter.functionDataToModel;
import static io.ballerina.flowmodelgenerator.core.copilot.util.LibraryModelConverter.initMethodToModel;
import static io.ballerina.flowmodelgenerator.core.copilot.util.LibraryModelConverter.typeDefDataToModel;

/**
 * Processes module symbols and extracts structured data (clients, functions, typedefs).
 *
 * @since 1.7.0
 */
public class SymbolProcessor {

    private SymbolProcessor() {
        // Prevent instantiation
    }

    /**
     * Result class to hold processed symbols.
     */
    public static class SymbolProcessingResult {
        private final List<Client> clients;
        private final List<LibraryFunction> functions;
        private final List<TypeDef> typeDefs;

        public SymbolProcessingResult() {
            this.clients = new ArrayList<>();
            this.functions = new ArrayList<>();
            this.typeDefs = new ArrayList<>();
        }

        public List<Client> getClients() {
            return clients;
        }

        public List<LibraryFunction> getFunctions() {
            return functions;
        }

        public List<TypeDef> getTypeDefs() {
            return typeDefs;
        }
    }

    /**
     * Processes module symbols and returns structured result with extracted data.
     *
     * @param semanticModel the semantic model containing the symbols
     * @param moduleInfo    the module information
     * @param org           the organization name
     * @param packageName   the package name
     * @return SymbolProcessingResult containing clients, functions, and typedefs
     */
    public static SymbolProcessingResult processModuleSymbols(SemanticModel semanticModel,
                                                              ModuleInfo moduleInfo,
                                                              String org,
                                                              String packageName) {
        SymbolProcessingResult result = new SymbolProcessingResult();

        for (Symbol symbol : semanticModel.moduleSymbols()) {
            if (symbol instanceof ClassSymbol classSymbol) {
                processClassSymbol(classSymbol, semanticModel, moduleInfo, org, packageName, result);
            } else if (symbol instanceof FunctionSymbol functionSymbol) {
                processFunctionSymbol(functionSymbol, semanticModel, moduleInfo, org, packageName, result);
            } else if (symbol instanceof TypeDefinitionSymbol typeDefSymbol) {
                processTypeDefSymbol(typeDefSymbol, org, packageName, result);
            } else if (symbol instanceof ConstantSymbol constantSymbol) {
                processConstantSymbol(constantSymbol, org, packageName, result);
            }
        }
        return result;
    }

    /**
     * Processes a CLASS symbol (client or regular class).
     */
    private static void processClassSymbol(ClassSymbol classSymbol,
                                           SemanticModel semanticModel,
                                           ModuleInfo moduleInfo,
                                           String org,
                                           String packageName,
                                           SymbolProcessingResult result) {
        // Process only PUBLIC classes: CLIENT classes (connectors) and normal classes
        if (!classSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
            return;
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
        LibraryFunction constructor = functionDataToModel(classData, org, packageName);
        functions.add(initMethodToModel(classSymbol, constructor));

        // Then add all other methods (remote functions, resource functions, etc.)
        List<FunctionData> classMethods = new FunctionDataBuilder()
                .semanticModel(semanticModel)
                .moduleInfo(moduleInfo)
                .parentSymbolType(className)
                .parentSymbol(classSymbol)
                .buildChildNodes();

        // Get method symbols for adding return documentation
        var methodSymbols = classSymbol.methods();

        for (FunctionData method : classMethods) {
            LibraryFunction methodFunc = functionDataToModel(method, org, packageName);

            // Add return description from method documentation
            MethodSymbol methodSymbol = methodSymbols.get(method.name());
            if (methodSymbol != null && methodSymbol.documentation().isPresent()) {
                methodSymbol.documentation().ifPresent(doc -> {
                    String returnDesc = doc.returnDescription().orElse("");
                    if (!returnDesc.isEmpty() && methodFunc.getReturnInfo() != null) {
                        methodFunc.getReturnInfo().setDescription(returnDesc);
                    }
                });
            }

            functions.add(methodFunc);
        }

        if (isClient) {
            Client client = new Client(className, classData.description());
            client.setFunctions(functions);
            result.getClients().add(client);
        } else {
            TypeDef typeDef = new TypeDef();
            typeDef.setName(className);
            typeDef.setDescription(classData.description());
            typeDef.setFunctions(functions);
            result.getTypeDefs().add(typeDef);
        }
    }

    /**
     * Processes a FUNCTION symbol (module-level function).
     */
    private static void processFunctionSymbol(FunctionSymbol functionSymbol,
                                              SemanticModel semanticModel,
                                              ModuleInfo moduleInfo,
                                              String org,
                                              String packageName,
                                              SymbolProcessingResult result) {
        if (!functionSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
            return;
        }

        FunctionData functionData = new FunctionDataBuilder()
                .semanticModel(semanticModel)
                .moduleInfo(moduleInfo)
                .functionSymbol(functionSymbol)
                .build();

        LibraryFunction function = functionDataToModel(functionData, org, packageName);

        // Add return description from function symbol's documentation
        functionSymbol.documentation()
                .flatMap(Documentation::returnDescription)
                .ifPresent(returnDesc -> {
                    if (function.getReturnInfo() != null) {
                        function.getReturnInfo().setDescription(returnDesc);
                    }
                });

        result.getFunctions().add(function);
    }

    /**
     * Processes a TYPE_DEFINITION symbol.
     */
    private static void processTypeDefSymbol(TypeDefinitionSymbol typeDefSymbol,
                                             String org,
                                             String packageName,
                                             SymbolProcessingResult result) {
        if (!typeDefSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
            return;
        }

        TypeDefData typeDefData = TypeDefDataBuilder.buildFromTypeDefinition(typeDefSymbol);
        TypeDef typeDef = typeDefDataToModel(typeDefData, org, packageName);
        result.getTypeDefs().add(typeDef);
    }

    /**
     * Processes a CONSTANT symbol.
     */
    private static void processConstantSymbol(ConstantSymbol constantSymbol,
                                              String org,
                                              String packageName,
                                              SymbolProcessingResult result) {
        if (!constantSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
            return;
        }

        TypeDefData constantData = TypeDefDataBuilder.buildFromConstant(constantSymbol);
        TypeDef typeDef = typeDefDataToModel(constantData, org, packageName);

        // Add varType using ConstantValue
        String varTypeName = "";
        Object constValue = constantSymbol.constValue();
        if (constValue instanceof ConstantValue constantValue) {
            varTypeName = constantValue.valueType().typeKind().getName();
        }

        // Fallback to type descriptor if constValue is null or not ConstantValue
        if (varTypeName.isEmpty()) {
            TypeSymbol typeSymbol = constantSymbol.typeDescriptor();
            if (typeSymbol != null && !typeSymbol.signature().isEmpty()) {
                varTypeName = typeSymbol.signature();
            }
        }

        Type varType = new Type(varTypeName);
        typeDef.setVarType(varType);

        result.getTypeDefs().add(typeDef);
    }
}
