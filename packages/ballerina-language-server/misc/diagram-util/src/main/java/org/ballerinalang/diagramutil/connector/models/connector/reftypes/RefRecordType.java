/*
 *  Copyright (c) 2021, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Record type model.
 */
public class RefRecordType extends RefType {
    @Expose
    public List<RefType> fields;
    @Expose
    public boolean hasRestType;
    @Expose
    public RefType restType;

    public RefRecordType(List<RefType> fields, Optional<RefType> restType) {
        this.typeName = "record";
        this.fields = fields;
        if (restType.isPresent()) {
            this.hasRestType = true;
            this.restType = restType.get();
        }
    }

    public RefRecordType(List<RefType> fields, RefType restType) {
        this.typeName = "record";
        this.fields = fields;
        this.restType = restType;
        if (restType != null) {
            this.hasRestType = true;
        }
    }

    public RefRecordType(List<RefType> fields, RefType restType, Map<String, RefType> dependentTypes){
        this.typeName = "record";
        this.fields = fields;
        this.restType = restType;
        if (restType != null) {
            this.hasRestType = true;
        }
        this.dependentTypes = dependentTypes;
    }

    public RefRecordType(RefRecordType recordType) {
        this.typeName = recordType.typeName;
        this.name = recordType.name;
        this.fields = recordType.fields;
        this.optional = recordType.optional;
        this.typeInfo = recordType.typeInfo;
        this.defaultable = recordType.defaultable;
        this.defaultValue = recordType.defaultValue;
        this.displayAnnotation = recordType.displayAnnotation;
        this.documentation = recordType.documentation;
        this.restType = recordType.restType;
        if (restType != null) {
            this.hasRestType = true;
        }
    }
}
