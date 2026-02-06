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

import io.ballerina.compiler.api.symbols.ConstantSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.values.ConstantValue;
import io.ballerina.flowmodelgenerator.core.model.Type;
import io.ballerina.flowmodelgenerator.core.model.TypeDef;
import io.ballerina.modelgenerator.commons.TypeDefData;

import java.util.Optional;

/**
 * Handler for processing CONSTANT symbols from semantic model.
 *
 * @since 1.0.1
 */
public class ConstantSymbolHandler {

    private ConstantSymbolHandler() {
    }

    public static Optional<TypeDef> process(ConstantSymbol constantSymbol,
                                             String org,
                                             String packageName) {
        if (!constantSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
            return Optional.empty();
        }

        TypeDefData constantData = TypeDefDataBuilder.buildFromConstant(constantSymbol);
        TypeDef typeDef = LibraryModelConverter.typeDefDataToModel(constantData, org, packageName);

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

        return Optional.of(typeDef);
    }
}
