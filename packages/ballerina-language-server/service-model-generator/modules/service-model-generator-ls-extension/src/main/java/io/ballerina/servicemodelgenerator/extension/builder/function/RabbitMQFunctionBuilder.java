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

package io.ballerina.servicemodelgenerator.extension.builder.function;

import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import org.eclipse.lsp4j.TextEdit;

import java.util.List;
import java.util.Map;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.RABBITMQ;

/**
 * Represents the RabbitMQ function builder of the service model generator.
 *
 * @since 1.2.0
 */
public final class RabbitMQFunctionBuilder extends AbstractFunctionBuilder {

    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        // Process data binding parameter before calling super.updateModel
        processDataBindingParameter(context);
        return super.updateModel(context);
    }

    /**
     * Processes the data binding parameter for RabbitMQ functions.
     * If a data binding parameter is enabled, it generates the inline anonymous record type
     * and sets it as the type of the first parameter, then disables the data binding parameter.
     *
     * @param context the update model context
     */
    private void processDataBindingParameter(UpdateModelContext context) {
        List<Parameter> parameters = context.function().getParameters();
        if (parameters.isEmpty()) {
            return;
        }

        // Find the DATA_BINDING parameter
        Parameter dataBindingParam = null;
        for (Parameter param : parameters) {
            if ("DATA_BINDING".equals(param.getKind()) && param.isEnabled()) {
                dataBindingParam = param;
                break;
            }
        }

        if (dataBindingParam == null) {
            return;
        }

        // Get the data binding type and parameter name
        String dataBindingType = dataBindingParam.getType().getValue();
        String paramName = dataBindingParam.getName().getValue();

        if (dataBindingType == null || dataBindingType.isEmpty()) {
            return;
        }

        // Generate the inline anonymous record type
        // Format: record {*rabbitmq:AnydataMessage; <DataBindingType> content;}
        String inlineRecordType = String.format("record {*rabbitmq:AnydataMessage; %s content;}", dataBindingType);

        // Find the first regular parameter and update its type
        for (Parameter param : parameters) {
            if (!"DATA_BINDING".equals(param.getKind())) {
                // Update the parameter type to the inline record
                param.getType().setValue(inlineRecordType);
                param.setEnabled(true);
//                // Update the parameter name
//                param.getName().setValue(paramName);
                break;
            }
        }

        // Disable the DATA_BINDING parameter
        dataBindingParam.setEnabled(false);
    }

    @Override
    public String kind() {
        return RABBITMQ;
    }
}