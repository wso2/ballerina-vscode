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

package io.ballerina.servicemodelgenerator.extension.model;

import java.util.HashMap;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_EXPRESSION;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_HEADER_SET;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_IDENTIFIER;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_SINGLE_SELECT;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_TYPE;

/**
 * Represents a HTTP response.
 *
 * @since 1.0.0
 */
public class HttpResponse {
    private Value statusCode;
    private Value body;
    private Value name;
    private Value type;
    private Value headers;
    private boolean enabled = true;
    private boolean editable = false;
    private boolean advanced = false;
    private boolean isHttpResponseType = false;

    public HttpResponse() {
    }

    public HttpResponse(Value statusCode, Value body, Value name, Value type, Value headers) {
        this.statusCode = statusCode;
        this.body = body;
        this.name = name;
        this.type = type;
        this.headers = headers;
    }

    public HttpResponse(String type) {
        this.type = createValue(type, VALUE_TYPE_EXPRESSION, true);
    }

    public HttpResponse(String statusCode, String body, String name) {
        this.statusCode = createValue(statusCode, VALUE_TYPE_SINGLE_SELECT, true);
        this.body = createValue(body, VALUE_TYPE_EXPRESSION, true);
        this.name = createValue(name, VALUE_TYPE_EXPRESSION, true);
    }

    public HttpResponse(String statusCode, String type) {
        this.statusCode = createValue(statusCode, VALUE_TYPE_SINGLE_SELECT, true);
        this.body = createOptionalValue(type, VALUE_TYPE_TYPE, true);
        this.name = createOptionalValue("", VALUE_TYPE_IDENTIFIER, true);
        this.type = createOptionalValue(body, VALUE_TYPE_TYPE, true);
        this.headers = createOptionalValue("", VALUE_TYPE_HEADER_SET, true);
    }

    public HttpResponse(String statusCode, String type, String body, Object headers, boolean editable) {
        this.statusCode = createValue(statusCode, VALUE_TYPE_SINGLE_SELECT, editable);
        this.body =  createOptionalValue(body, VALUE_TYPE_TYPE, editable);
        this.name = createOptionalValue("", VALUE_TYPE_IDENTIFIER, editable);
        this.type = createOptionalValue(type, VALUE_TYPE_TYPE, editable);
        this.headers = createOptionalValue(headers, VALUE_TYPE_HEADER_SET, editable);
        this.editable = editable;
    }

    public HttpResponse(String statusCode, String type, boolean editable) {
        this.statusCode = createValue(statusCode, VALUE_TYPE_SINGLE_SELECT, editable);
        this.body = createOptionalValue("", VALUE_TYPE_TYPE, editable);
        this.name = createOptionalValue("", VALUE_TYPE_IDENTIFIER, editable);
        this.type = createOptionalValue(type, VALUE_TYPE_TYPE, editable);
        this.headers = createOptionalValue("", VALUE_TYPE_HEADER_SET, editable);
        this.editable = editable;
    }

    public static HttpResponse getAnonResponse(String code, String typeStr) {
        Value statusCode = createValue(code, VALUE_TYPE_SINGLE_SELECT, true);
        Value body = createValue("", VALUE_TYPE_EXPRESSION, true);
        Value name = createValue("", VALUE_TYPE_EXPRESSION, true);
        Value type = createValue(typeStr, VALUE_TYPE_EXPRESSION, true);
        Value headers = createValue("", VALUE_TYPE_HEADER_SET, true);
        return new HttpResponse(statusCode, body, name, type, headers);
    }

    private static Value createValue(Object value, String valueType, boolean editable) {
        return new Value.ValueBuilder()
                .value(value)
                .valueType(valueType)
                .editable(editable)
                .enabled(true)
                .setImports(new HashMap<>())
                .build();
    }

    private static Value createOptionalValue(Object value, String valueType, boolean editable) {
        return new Value.ValueBuilder()
                .value(value)
                .valueType(valueType)
                .editable(editable)
                .enabled(true)
                .optional(true)
                .setImports(new HashMap<>())
                .build();
    }


    public Value getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(Value statusCode) {
        this.statusCode = statusCode;
    }

    public Value getBody() {
        return body;
    }

    public void setBody(Value body) {
        this.body = body;
    }

    public Value getName() {
        return name;
    }

    public void setName(Value name) {
        this.name = name;
    }

    public Value getType() {
        return type;
    }

    public void setType(Value type) {
        this.type = type;
    }

    public void setEditable(boolean editable) {
        this.editable = editable;
    }

    public void setAdvanced(boolean advanced) {
        this.advanced = advanced;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Value getHeaders() {
        return headers;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean isAdvanced() {
        return advanced;
    }

    public boolean isEditable() {
        return editable;
    }

    public boolean isHttpResponseType() {
        return isHttpResponseType;
    }

    public void setHttpResponseType(boolean httpResponseType) {
        isHttpResponseType = httpResponseType;
    }
}
