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

package io.ballerina.flowmodelgenerator.core.model;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Abstract builder class for common builder functionality.
 */
public abstract class AbstractBuilder {
    protected List<AnnotationAttachment> annotationAttachments;
    protected Map<String, String> imports;

    public AbstractBuilder annotationAttachments(List<AnnotationAttachment> annotationAttachments) {
        this.annotationAttachments = annotationAttachments;
        return this;
    }

    public AbstractBuilder imports(Map<String, String> imports) {
        this.imports = imports;
        return this;
    }

    public AbstractBuilder addImport(String key, String value) {
        if (this.imports == null) {
            this.imports = new HashMap<>();
        }
        this.imports.putIfAbsent(key, value);
        return this;
    }
}
