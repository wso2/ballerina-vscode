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
import io.ballerina.compiler.api.symbols.ConstantSymbol;
import io.ballerina.compiler.api.symbols.EnumSymbol;
import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.flowmodelgenerator.core.model.Client;
import io.ballerina.flowmodelgenerator.core.model.LibraryFunction;
import io.ballerina.flowmodelgenerator.core.model.TypeDef;
import io.ballerina.modelgenerator.commons.ModuleInfo;

import java.util.ArrayList;
import java.util.List;

/**
 * Coordinator for processing module symbols using strategy pattern.
 * Dispatches symbol processing to specific handlers based on symbol kind.
 *
 * @since 1.0.1
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
     * @param moduleInfo the module information
     * @param org the organization name
     * @param packageName the package name
     * @return SymbolProcessingResult containing clients, functions, and typedefs
     */
    public static SymbolProcessingResult processModuleSymbols(SemanticModel semanticModel,
                                                                ModuleInfo moduleInfo,
                                                                String org,
                                                                String packageName) {
        SymbolProcessingResult result = new SymbolProcessingResult();

        for (Symbol symbol : semanticModel.moduleSymbols()) {
            switch (symbol.kind()) {
                case CLASS:
                    ClassSymbolHandler.process(
                            (ClassSymbol) symbol,
                            semanticModel,
                            moduleInfo,
                            org,
                            packageName
                    ).ifPresent(obj -> {
                        if (obj instanceof Client client) {
                            result.getClients().add(client);
                        } else if (obj instanceof TypeDef typeDef) {
                            result.getTypeDefs().add(typeDef);
                        }
                    });
                    break;

                case FUNCTION:
                    FunctionSymbolHandler.process(
                            (FunctionSymbol) symbol,
                            semanticModel,
                            moduleInfo,
                            org,
                            packageName
                    ).ifPresent(result.getFunctions()::add);
                    break;

                case TYPE_DEFINITION:
                    TypeDefSymbolHandler.process(
                            (TypeDefinitionSymbol) symbol,
                            org,
                            packageName
                    ).ifPresent(result.getTypeDefs()::add);
                    break;

                case ENUM:
                    EnumSymbolHandler.process(
                            (EnumSymbol) symbol,
                            org,
                            packageName
                    ).ifPresent(result.getTypeDefs()::add);
                    break;

                case CONSTANT:
                    ConstantSymbolHandler.process(
                            (ConstantSymbol) symbol,
                            org,
                            packageName
                    ).ifPresent(result.getTypeDefs()::add);
                    break;

                default:
                    // Skip other symbol types
                    break;
            }
        }

        return result;
    }
}
