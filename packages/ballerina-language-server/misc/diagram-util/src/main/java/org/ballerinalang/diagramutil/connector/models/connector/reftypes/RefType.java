package org.ballerinalang.diagramutil.connector.models.connector.reftypes;

import com.google.gson.annotations.Expose;
import org.ballerinalang.diagramutil.connector.models.connector.ReferenceType;

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
