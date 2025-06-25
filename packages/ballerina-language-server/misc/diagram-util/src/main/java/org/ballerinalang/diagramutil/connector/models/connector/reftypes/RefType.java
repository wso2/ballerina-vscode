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

/**
 * Reference-based type model.
 */
import com.google.gson.annotations.Expose;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class RefType {
    public Set<String> dependentTypeHashes = new HashSet<>();
    @Expose
    public String hashCode;
    @Expose
    public String name;
    @Expose
    public String typeName;
    @Expose
    public Map<String, RefType> dependentTypes;

    public RefType(String name) {
        this.name = name;
    }
}
