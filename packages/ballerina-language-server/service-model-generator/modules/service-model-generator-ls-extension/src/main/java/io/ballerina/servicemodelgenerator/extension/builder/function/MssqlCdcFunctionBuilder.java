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

import io.ballerina.servicemodelgenerator.extension.model.context.AddModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import io.ballerina.servicemodelgenerator.extension.util.DatabindUtil;
import org.eclipse.lsp4j.TextEdit;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static io.ballerina.servicemodelgenerator.extension.builder.service.MssqlCdcServiceBuilder.AFTER_ENTRY_FIELD;
import static io.ballerina.servicemodelgenerator.extension.builder.service.MssqlCdcServiceBuilder.TYPE_PREFIX;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.MSSQL;

/**
 * Represents the MSSQL CDC function builder of the service model generator.
 * Handles data binding for CDC event parameters (afterEntry and beforeEntry).
 *
 * @since 1.5.0
 */
public final class MssqlCdcFunctionBuilder extends AbstractFunctionBuilder {

    private static final String REQUIRED_PARAM_TYPE = "record {}";

    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        // Process databinding - handles type generation/update and parameter updates
        // Note: CDC uses record {} as the base type, not array type (isArray = false)
        Map<String, List<TextEdit>> databindEdits = DatabindUtil.processDatabindingUpdate(
                context, TYPE_PREFIX, REQUIRED_PARAM_TYPE, AFTER_ENTRY_FIELD, false);

        // Get edits for main file
        Map<String, List<TextEdit>> mainFileEdits = super.updateModel(context);

        // Merge both edits into a mutable map
        Map<String, List<TextEdit>> allEdits = new HashMap<>(mainFileEdits);
        allEdits.putAll(databindEdits);

        return allEdits;
    }

    @Override
    public Map<String, List<TextEdit>> addModel(AddModelContext context) throws Exception {
        // Process databinding when adding new functions
        Map<String, List<TextEdit>> databindEdits = DatabindUtil.processDatabindingForAdd(
                context, TYPE_PREFIX, REQUIRED_PARAM_TYPE, AFTER_ENTRY_FIELD, false);

        Map<String, List<TextEdit>> mainFileEdits = super.addModel(context);
        Map<String, List<TextEdit>> allEdits = new HashMap<>(mainFileEdits);
        allEdits.putAll(databindEdits);
        return allEdits;
    }

    @Override
    public String kind() {
        return MSSQL;
    }
}
