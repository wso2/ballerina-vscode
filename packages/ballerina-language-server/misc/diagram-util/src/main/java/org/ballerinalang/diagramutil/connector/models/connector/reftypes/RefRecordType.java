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
import org.ballerinalang.diagramutil.connector.models.connector.ReferenceType;

import java.util.ArrayList;
import java.util.List;

/**
 * Reference-based record type model.
 */
public class RefRecordType extends RefType {
    @Expose
    public List<ReferenceType.Field> fields = new ArrayList<>();

    public RefRecordType(String name) {
        super(name);
        this.typeName = "record";
    }

    @Override
    public RefRecordType clone() {
        RefRecordType copy = (RefRecordType) super.clone();
        copy.fields = new ArrayList<>();
        for (ReferenceType.Field field : this.fields) {
            copy.fields.add(new ReferenceType.Field(
                    field.fieldName(),
                    field.type().clone(),
                    field.optional(),
                    field.defaultValue()
            ));
        }
        return copy;
    }

}
