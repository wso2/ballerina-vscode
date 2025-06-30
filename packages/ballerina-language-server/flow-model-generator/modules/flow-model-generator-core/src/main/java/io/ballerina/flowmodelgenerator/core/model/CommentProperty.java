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
public class CommentProperty {

    private String leadingComment;
    private String trailingComment;

    public CommentProperty() {
    }

    public CommentProperty(String leadingComment, String trailingComment) {
        this.leadingComment = leadingComment;
        this.trailingComment = trailingComment;
    }

    public String getLeadingComment() {
        return leadingComment;
    }

    public void setLeadingComment(String leadingComment) {
        this.leadingComment = leadingComment;
    }

    public String getTrailingComment() {
        return trailingComment;
    }

    public void setTrailingComment(String trailingComment) {
        this.trailingComment = trailingComment;
    }
}
