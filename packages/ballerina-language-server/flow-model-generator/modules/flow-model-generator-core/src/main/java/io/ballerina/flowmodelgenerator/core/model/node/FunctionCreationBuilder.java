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

package io.ballerina.flowmodelgenerator.core.model.node;

import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;

/**
 * Represents the properties of function creation node.
 *
 * @since 2.0.0
 */
public class FunctionCreationBuilder extends DataMapperCreationBuilder {

    public static final String LABEL = "Function Definition";
    public static final String DESCRIPTION = "Define a function";

    public static final String FUNCTION_NAME_LABEL = "Function Name";
    public static final String FUNCTION_NAME_DOC = "Name of the function";

    public static final String PARAMETERS_DOC = "Input variables of the function";

    public static final String OUTPUT_DOC = "Output type of the function";

    @Override
    protected String getNameLabel() {
        return FUNCTION_NAME_LABEL;
    }

    @Override
    protected String getNameDoc() {
        return FUNCTION_NAME_DOC;
    }

    @Override
    protected String getOutputDoc() {
        return OUTPUT_DOC;
    }

    @Override
    protected String getParametersDoc() {
        return PARAMETERS_DOC;
    }

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata().node(NodeKind.FUNCTION_CREATION);
    }

    @Override
    protected void endSourceGeneration(SourceBuilder sourceBuilder, String returnBody) {
        sourceBuilder
                .token()
                .openBrace()
                .closeBrace();
    }
}
