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
import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.flowmodelgenerator.core.model.LibraryFunction;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.FunctionDataBuilder;
import io.ballerina.modelgenerator.commons.ModuleInfo;

import java.util.Optional;

/**
 * Handler for processing FUNCTION symbols from semantic model.
 * Extracts module-level functions.
 *
 * @since 1.0.1
 */
public class FunctionSymbolHandler {

    private FunctionSymbolHandler() {
        // Prevent instantiation
    }

    /**
     * Processes a FUNCTION symbol and returns a Function model.
     *
     * @param functionSymbol the function symbol to process
     * @param semanticModel the semantic model
     * @param moduleInfo the module information
     * @param org the organization name
     * @param packageName the package name
     * @return Optional containing Function, or empty if not public
     */
    public static Optional<LibraryFunction> process(FunctionSymbol functionSymbol,
                                              SemanticModel semanticModel,
                                              ModuleInfo moduleInfo,
                                              String org,
                                              String packageName) {
        if (!functionSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
            return Optional.empty();
        }

        FunctionData functionData = new FunctionDataBuilder()
                .semanticModel(semanticModel)
                .moduleInfo(moduleInfo)
                .functionSymbol(functionSymbol)
                .build();

        LibraryFunction function = LibraryModelConverter.functionDataToModel(functionData, org, packageName);
        return Optional.of(function);
    }
}
