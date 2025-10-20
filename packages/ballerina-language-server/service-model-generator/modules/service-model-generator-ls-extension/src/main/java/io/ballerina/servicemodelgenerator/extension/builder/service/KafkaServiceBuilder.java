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

package io.ballerina.servicemodelgenerator.extension.builder.service;

import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.KAFKA;
import static io.ballerina.servicemodelgenerator.extension.util.DatabindUtil.addDataBindingParam;

/**
 * Builder class for Kafka service.
 *
 * @since 1.3.0
 */
public final class KafkaServiceBuilder extends AbstractServiceBuilder {

    private static final String ON_CONSUMER_RECORD = "onConsumerRecord";
    public static final String PAYLOAD_FIELD_NAME = "value";

    @Override
    public Service getModelFromSource(ModelFromSourceContext context) {
        Service service = super.getModelFromSource(context);
        addDataBindingParam(service, ON_CONSUMER_RECORD, context, PAYLOAD_FIELD_NAME);
        return service;
    }

    @Override
    public String kind() {
        return KAFKA;
    }
}
