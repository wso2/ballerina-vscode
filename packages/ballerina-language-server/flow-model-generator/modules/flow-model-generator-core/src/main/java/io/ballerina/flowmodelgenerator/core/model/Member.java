/*
 *  Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com)
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

import java.util.List;
import java.util.Map;


/**
 * Represents a member of a type construct.
 *
 * @param kind                  Kind of the member.
 * @param refs                  References to the type descriptor.
 * @param type                  Display name for the type.
 * @param name                  Name of the member.
 * @param defaultValue          Default value of the member.
 * @param optional              Whether the member is optional.
 * @param readonly              Whether the member is readonly.
 * @param isGraphqlId           Whether the member is a graphql ID
 * @param docs                  Documentation of the member
 * @param annotationAttachments Annotations of the member.
 * @param imports               Imports of the member.
 * @since 1.0.0
 */
public record Member(
        MemberKind kind,
        List<String> refs,
        Object type,
        String name,
        String defaultValue,
        boolean optional,
        boolean readonly,
        boolean isGraphqlId,
        String docs,
        List<AnnotationAttachment> annotationAttachments,
        Map<String, String> imports
) {
    public static class MemberBuilder extends AbstractBuilder {
        private Member.MemberKind kind;
        private List<String> refs;
        private Object type;
        private String name;
        private String defaultValue;
        private boolean optional = false;
        private boolean readonly = false;
        private boolean isGraphqlId = false;
        private String docs;

        public MemberBuilder() {
        }

        public MemberBuilder kind(Member.MemberKind kind) {
            this.kind = kind;
            return this;
        }

        public MemberBuilder refs(List<String> refs) {
            this.refs = refs;
            return this;
        }

        public MemberBuilder type(Object type) {
            this.type = type;
            return this;
        }

        public MemberBuilder name(String name) {
            this.name = name;
            return this;
        }

        public MemberBuilder defaultValue(String defaultValue) {
            this.defaultValue = defaultValue;
            return this;
        }

        public MemberBuilder optional(boolean optional) {
            this.optional = optional;
            return this;
        }

        public MemberBuilder readonly(boolean readonly) {
            this.readonly = readonly;
            return this;
        }

        public MemberBuilder isGraphqlId(boolean isGraphqlId) {
            this.isGraphqlId = isGraphqlId;
            return this;
        }

        public MemberBuilder docs(String docs) {
            this.docs = docs;
            return this;
        }

        public Member build() {
            Member member = new Member(
                    kind, refs != null ? List.copyOf(refs) : null,
                    type, name, defaultValue, optional, readonly, isGraphqlId, docs,
                    annotationAttachments != null ? List.copyOf(annotationAttachments) : null,
                    imports != null ? Map.copyOf(imports) : null
            );
            this.kind = null;
            this.refs = null;
            this.type = null;
            this.name = null;
            this.defaultValue = null;
            this.optional = false;
            this.readonly = false;
            this.isGraphqlId = false;
            this.docs = null;
            this.annotationAttachments = null;
            this.imports = null;
            return member;
        }
    }

    public enum MemberKind {
        FIELD, TYPE, NAME
    }
}
