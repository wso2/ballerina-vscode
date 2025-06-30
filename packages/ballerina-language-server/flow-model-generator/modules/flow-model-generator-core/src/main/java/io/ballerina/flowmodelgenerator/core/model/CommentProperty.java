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

/**
 * Represents leading and trailing comments attached to token node.
 *
 * @param leadingComment  The leading comment of a node.
 * @param trailingComment The trailing comment of a node.
 * @since 1.1.0
 */
public record CommentProperty(String leadingComment,
                              String trailingComment) {

    public static class Builder<T> extends FacetedBuilder<T> {

        private String leadingComment;
        private String trailingComment;

        public Builder(T parentBuilder) {
            super(parentBuilder);
        }

        public Builder<T> leadingComment(String leadingComment) {
            this.leadingComment = leadingComment;
            return this;
        }

        public Builder<T> trailingComment(String trailingComment) {
            this.trailingComment = trailingComment;
            return this;
        }

        public CommentProperty build() {
            return new CommentProperty(leadingComment, trailingComment);
        }
    }
}
