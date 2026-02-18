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

package io.ballerina.copilotagent.core;

import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.NodeVisitor;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.copilotagent.core.models.ServiceMemberMap;

/**
 * Visitor to extract service methods and populate the ServiceMemberMap.
 *
 * @since 1.5.0
 */
public class ServiceMethodExtractor extends NodeVisitor {

    private final ServiceMemberMap serviceMemberMap;

    public ServiceMethodExtractor(ServiceMemberMap serviceMemberMap) {
        this.serviceMemberMap = serviceMemberMap;
    }

    @Override
    public void visit(ServiceDeclarationNode serviceDeclarationNode) {
        serviceDeclarationNode.members().forEach(member -> member.accept(this));
    }

    @Override
    public void visit(FunctionDefinitionNode functionDefinitionNode) {
        String functionName = functionDefinitionNode.functionName().toSourceCode().trim();
        NodeList<Node> resourcePath = functionDefinitionNode.relativeResourcePath();
        StringBuilder keyBuilder = new StringBuilder(functionName);
        for (Node path : resourcePath) {
            keyBuilder.append(" ").append(path.toSourceCode().trim());
        }
        this.serviceMemberMap.putObjectMethod(keyBuilder.toString(), functionDefinitionNode);
    }
}
