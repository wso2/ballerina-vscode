package org.ballerinalang.diagramutil.connector.models.connector.reftypes;

import com.google.gson.annotations.Expose;
import org.ballerinalang.diagramutil.connector.models.connector.ReferenceType;

import java.util.ArrayList;
import java.util.List;

public class RefRecordType extends RefType {
    @Expose
    public List<ReferenceType.Field> fields = new ArrayList<>();

    public RefRecordType(String name) {
        super(name);
        this.typeName = "record";
    }
}
