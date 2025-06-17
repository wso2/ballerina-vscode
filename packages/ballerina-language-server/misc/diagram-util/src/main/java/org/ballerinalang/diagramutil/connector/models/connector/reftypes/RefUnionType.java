/*
 *  Copyright (c) 2025, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  WSO2 Inc. licenses this file to you under the Apache License,
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
package org.ballerinalang.diagramutil.connector.models.connector.reftypes;

import com.google.gson.annotations.Expose;
import org.ballerinalang.diagramutil.connector.models.connector.RefType;

import java.util.ArrayList;
import java.util.List;

/**
 * Union type model.
 */
public class RefUnionType extends RefType {
    @Expose
    public List<RefType> members;

    public RefUnionType() {
        this.typeName = "union";
        this.members = new ArrayList<>();
    }

    public RefUnionType(List<RefType> members) {
        this.typeName = "union";
        this.members = members;
    }

    public RefUnionType(RefUnionType unionType) {
        this.typeName = unionType.typeName;
        this.members = unionType.members;
        this.name = unionType.name;
        this.optional = unionType.optional;
        this.typeInfo = unionType.typeInfo;
        this.defaultable = unionType.defaultable;
        this.defaultValue = unionType.defaultValue;
        this.displayAnnotation = unionType.displayAnnotation;
        this.documentation = unionType.documentation;
    }

    public RefUnionType(RefUnionType unionType, boolean isFullType) {
        this.typeName = unionType.typeName;
        this.name = unionType.name;
        this.optional = unionType.optional;
        this.typeInfo = unionType.typeInfo;
        this.defaultable = unionType.defaultable;
        this.defaultValue = unionType.defaultValue;
        this.displayAnnotation = unionType.displayAnnotation;
        this.documentation = unionType.documentation;
        if (isFullType) {
            this.members = unionType.members;
        }
    }
}
