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

/**
 * Represents a workflow send event operation node (sendEvent).
 * This is a specialized function call for workflow event operations.
 *
 * @since 2.0.0
 */
public class SendEventBuilder extends FunctionCall {

    public static final String LABEL = "Send Event";
    public static final String DESCRIPTION = "Send an event to an existing workflow instance";

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL).description(DESCRIPTION);
        codedata().node(NodeKind.SEND_EVENT);
    }
}

