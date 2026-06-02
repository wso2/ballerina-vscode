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

package io.ballerina.servicemodelgenerator.extension.builder.function;

import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.context.AddModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import org.eclipse.lsp4j.TextEdit;

import java.util.List;
import java.util.Map;

import static io.ballerina.servicemodelgenerator.extension.builder.service.AbstractCdcServiceBuilder.AFTER_ENTRY_FIELD;
import static io.ballerina.servicemodelgenerator.extension.builder.service.AbstractCdcServiceBuilder.BEFORE_ENTRY_FIELD;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.DATA_BINDING;

/**
 * Represents the CDC function builder of the service model generator. Shared across all CDC database variants
 * (MySQL, MSSQL, PostgreSQL, etc.) — the database identifier is supplied via the constructor, since the only
 * per-database difference is the value returned from {@link #kind()}.
 * <p>
 * Handles special-case logic for the {@code onUpdate} function which has two databinding parameters
 * ({@code beforeEntry} and {@code afterEntry}) that must share the same type.
 * </p>
 *
 * @since 1.6.0
 */
public final class CdcFunctionBuilder extends AbstractFunctionBuilder {

    private static final String ON_UPDATE_FUNCTION = "onUpdate";

    private final String kind;

    public CdcFunctionBuilder(String kind) {
        this.kind = kind;
    }

    @Override
    public Map<String, List<TextEdit>> addModel(AddModelContext context) throws Exception {
        Function function = context.function();
        if (ON_UPDATE_FUNCTION.equals(function.getName().getValue())) {
            expandDatabindingParams(function);
        }
        return super.addModel(context);
    }

    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        Function function = context.function();
        if (ON_UPDATE_FUNCTION.equals(function.getName().getValue())) {
            expandDatabindingParams(function);
        }
        return super.updateModel(context);
    }

    /**
     * Expands the single databinding parameter (afterEntry) to two parameters (beforeEntry and afterEntry) for the
     * onUpdate function. This is called before code generation to ensure both parameters are present in the generated
     * signature with the same type.
     * <p>
     * This method looks for the case where afterEntry is enabled (visible in UI) and beforeEntry is disabled (hidden
     * from UI). It then enables beforeEntry and copies the type from afterEntry.
     * </p>
     *
     * @param function The onUpdate function to process
     */
    private void expandDatabindingParams(Function function) {
        List<Parameter> parameters = function.getParameters();
        Parameter beforeEntry = null;
        Parameter afterEntry = null;

        for (Parameter param : parameters) {
            if (!DATA_BINDING.equals(param.getKind())) {
                continue;
            }
            String paramName = param.getName().getValue();
            if (BEFORE_ENTRY_FIELD.equals(paramName)) {
                beforeEntry = param;
            } else if (AFTER_ENTRY_FIELD.equals(paramName)) {
                afterEntry = param;
            }
        }

        if (beforeEntry != null && afterEntry != null && !beforeEntry.isEnabled() && afterEntry.isEnabled()) {
            beforeEntry.setEnabled(true);
            beforeEntry.getType().setValue(afterEntry.getType().getValue());
        }
    }

    @Override
    public String kind() {
        return kind;
    }
}
