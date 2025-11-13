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

package io.ballerina.designmodelgenerator.extension.response;

import java.util.List;

/**
 * Represents the response for the projectInfo API.
 *
 * @since 1.4.2
 */
public class ProjectInfoResponse extends AbstractResponse {

    private String projectKind;    // Enum value as string: BUILD_PROJECT, WORKSPACE_PROJECT, etc.
    private String name;           // Package name from packageName().value()
    private String title;          // Project title (from Ballerina.toml or name fallback)
    private String uri;            // Project root as URI string
    private List<ProjectInfoResponse> children;  // Only populated for workspace projects (recursive)

    public String getProjectKind() {
        return projectKind;
    }

    public void setProjectKind(String projectKind) {
        this.projectKind = projectKind;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getUri() {
        return uri;
    }

    public void setUri(String uri) {
        this.uri = uri;
    }

    public List<ProjectInfoResponse> getChildren() {
        return children;
    }

    public void setChildren(List<ProjectInfoResponse> children) {
        this.children = children;
    }
}
