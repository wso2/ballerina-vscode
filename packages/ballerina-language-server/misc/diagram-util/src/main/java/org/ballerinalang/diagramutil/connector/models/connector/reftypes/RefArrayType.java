package org.ballerinalang.diagramutil.connector.models.connector.reftypes;

import com.google.gson.annotations.Expose;

public class RefArrayType extends RefType {
    @Expose
    public RefType elementType;

    public RefArrayType(String name) {
        super(name);
        this.typeName = "array";
    }
}
