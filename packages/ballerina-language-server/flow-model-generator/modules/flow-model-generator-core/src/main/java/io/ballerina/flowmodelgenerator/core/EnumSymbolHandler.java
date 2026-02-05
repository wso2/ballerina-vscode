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

import io.ballerina.compiler.api.symbols.EnumSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.flowmodelgenerator.core.model.TypeDef;
import io.ballerina.modelgenerator.commons.TypeDefData;

import java.util.Optional;

/**
 * Handler for processing ENUM symbols from semantic model.
 *
 * @since 1.0.1
 */
public class EnumSymbolHandler {

    private EnumSymbolHandler() {
    }

    public static Optional<TypeDef> process(EnumSymbol enumSymbol,
                                             String org,
                                             String packageName) {
        if (!enumSymbol.qualifiers().contains(Qualifier.PUBLIC)) {
            return Optional.empty();
        }

        TypeDefData enumData = TypeDefDataBuilder.buildFromEnum(enumSymbol);
        TypeDef typeDef = LibraryModelConverter.typeDefDataToModel(enumData, org, packageName);
        return Optional.of(typeDef);
    }
}
