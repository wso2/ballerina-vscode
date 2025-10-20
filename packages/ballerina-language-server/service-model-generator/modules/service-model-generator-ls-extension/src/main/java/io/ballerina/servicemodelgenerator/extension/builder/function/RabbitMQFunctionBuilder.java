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

import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import org.eclipse.lsp4j.TextEdit;

import java.util.List;
import java.util.Map;

import static io.ballerina.servicemodelgenerator.extension.builder.service.RabbitMQServiceBuilder.PAYLOAD_FIELD_NAME;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.RABBITMQ;
import static io.ballerina.servicemodelgenerator.extension.util.DatabindUtil.processDataBindingParameter;

/**
 * Represents the RabbitMQ function builder of the service model generator.
 *
 * @since 1.3.0
 */
public final class RabbitMQFunctionBuilder extends AbstractFunctionBuilder {

    private static final String REQUIRED_PARAM_TYPE = "rabbitmq:AnydataMessage";

    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        processDataBindingParameter(context.function(), REQUIRED_PARAM_TYPE, PAYLOAD_FIELD_NAME, false);
        return super.updateModel(context);
    }

    @Override
    public String kind() {
        return RABBITMQ;
    }
}
