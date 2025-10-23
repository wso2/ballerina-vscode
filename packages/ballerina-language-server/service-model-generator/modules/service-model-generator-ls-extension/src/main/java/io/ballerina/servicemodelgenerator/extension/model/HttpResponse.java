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
    private Value mediaType;
    private Value name;
    private Value type;
    private Value headers;
    private boolean enabled = true;
    private boolean editable = false;
    private boolean advanced = false;

    public HttpResponse(Value statusCode, Value body, Value mediaType, Value name, Value type, Value headers) {
        this.statusCode = statusCode;
        this.body = body;
        this.mediaType = mediaType;
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
        this.type = createOptionalValue(type, VALUE_TYPE_TYPE, true);
        this.headers = createOptionalValue("", VALUE_TYPE_HEADER_SET, true);
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

    public static class Builder {
        private Value statusCode;
        private Value body;
        private Value mediaType;
        private Value name;
        private Value type;
        private Value headers;

        public Builder statusCode(String statusCode, boolean editable) {
            this.statusCode = createValue(statusCode, VALUE_TYPE_SINGLE_SELECT, editable);
            return this;
        }

        public Builder body(String body, boolean editable) {
            this.body = createOptionalValue(body, VALUE_TYPE_TYPE, editable);
            return this;
        }

        public Builder mediaType(String mediaType, boolean editable) {
            this.mediaType = createValue(mediaType, VALUE_TYPE_EXPRESSION, editable);
            return this;
        }

        public Builder name(String name, boolean editable) {
            this.name = createOptionalValue(name, VALUE_TYPE_IDENTIFIER, editable);;
            return this;
        }

        public Builder type(String type, boolean editable) {
            this.type = createOptionalValue(type, VALUE_TYPE_TYPE, editable);
            return this;
        }

        public Builder headers(Object headers, boolean editable) {
            this.headers = createOptionalValue(headers, VALUE_TYPE_HEADER_SET, editable);
            return this;
        }

        public HttpResponse build() {
            if (mediaType == null) {
                this.mediaType = createValue("", VALUE_TYPE_EXPRESSION, true);
            }
            if (name == null) {
                this.name = createOptionalValue("", VALUE_TYPE_IDENTIFIER, true);
            }
            if (type == null) {
                this.type = createOptionalValue("", VALUE_TYPE_TYPE, true);
            }
            if (headers == null) {
                this.headers = createOptionalValue("", VALUE_TYPE_HEADER_SET, true);
            }
            if (body == null) {
                this.body = createOptionalValue("", VALUE_TYPE_EXPRESSION, true);
            }
            return new HttpResponse(statusCode, body, mediaType, name, type, headers);
        }
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

    public Value getMediaType() {
        return mediaType;
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
}
