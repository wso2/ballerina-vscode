/*
 * Copyright (c) 2026, WSO2 LLC. (http://wso2.com) All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.ballerinalang.diagramutil;

import org.ballerinalang.diagramutil.connector.models.connector.Type;
import org.ballerinalang.diagramutil.connector.models.connector.TypeInfo;
import org.ballerinalang.diagramutil.connector.models.connector.types.ArrayType;
import org.ballerinalang.diagramutil.connector.models.connector.types.EnumType;
import org.ballerinalang.diagramutil.connector.models.connector.types.PrimitiveType;
import org.ballerinalang.diagramutil.connector.models.connector.types.RecordType;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.util.ArrayList;
import java.util.List;

/**
 * Tests {@link EnumType#copy()} to ensure enum members survive deep cloning.
 *
 * <p>Regression coverage for wso2/product-integrator#767 where enum fields inside
 * records cloned via {@link RecordType#copy()} (e.g. when building array elements
 * in {@code TypeSymbolAnalyzerFromTypeModel}) were silently reduced to a bare
 * {@link Type} without the {@code members} list, causing the field to disappear
 * from the record editor UI.
 */
public class EnumTypeCopyTest {

    @Test
    public void copyPreservesMembersAndIsDeep() {
        EnumType original = buildMatchingModeEnum();
        original.name = "matchingMode";
        original.selected = true;
        original.value = "\"ALL\"";

        EnumType copied = original.copy();

        Assert.assertNotSame(copied, original);
        Assert.assertEquals(copied.typeName, "enum");
        Assert.assertEquals(copied.name, "matchingMode");
        Assert.assertEquals(copied.value, "\"ALL\"");
        Assert.assertTrue(copied.selected);

        Assert.assertNotNull(copied.members, "enum members must be preserved");
        Assert.assertNotSame(copied.members, original.members, "members list must be cloned");
        Assert.assertEquals(copied.members.size(), 2);
        Assert.assertEquals(copied.members.get(0).typeName, "ALL");
        Assert.assertEquals(copied.members.get(1).typeName, "ANY");

        // Mutating the copy must not leak into the original.
        copied.members.get(0).selected = true;
        Assert.assertFalse(original.members.get(0).selected,
                "mutating copied member must not affect the original");
    }

    @Test
    public void copyHandlesNullMembers() {
        EnumType original = new EnumType(null);
        original.typeInfo = new TypeInfo("MatchingMode", "org", "source", null, "0.3.0");

        EnumType copied = original.copy();

        Assert.assertNotNull(copied.members, "null members should be normalised to empty list");
        Assert.assertTrue(copied.members.isEmpty());
        Assert.assertEquals(copied.typeInfo, original.typeInfo);
    }

    @Test
    public void copyHandlesEmptyMembers() {
        EnumType original = new EnumType(new ArrayList<>());

        EnumType copied = original.copy();

        Assert.assertNotNull(copied.members);
        Assert.assertTrue(copied.members.isEmpty());
    }

    @Test
    public void recordCopyPropagatesEnumMembersOnNestedField() {
        // Simulates the array-of-records-with-enum-field scenario: when RecordType.copy()
        // runs for an array element, a nested EnumType field must retain its members.
        EnumType enumField = buildMatchingModeEnum();
        enumField.name = "matchingMode";

        List<Type> fields = new ArrayList<>();
        fields.add(enumField);
        RecordType record = new RecordType(fields, (Type) null);
        record.name = "DependencyCondition";

        RecordType recordCopy = record.copy();

        Assert.assertNotSame(recordCopy, record);
        Assert.assertEquals(recordCopy.fields.size(), 1);

        Type copiedField = recordCopy.fields.get(0);
        Assert.assertTrue(copiedField instanceof EnumType,
                "enum field must remain an EnumType after RecordType.copy()");
        EnumType copiedEnum = (EnumType) copiedField;
        Assert.assertNotNull(copiedEnum.members);
        Assert.assertEquals(copiedEnum.members.size(), 2);
        Assert.assertEquals(copiedEnum.members.get(0).typeName, "ALL");
        Assert.assertEquals(copiedEnum.members.get(1).typeName, "ANY");
    }

    @Test
    public void arrayCopyPropagatesEnumMembersOnRecordMember() {
        // Full end-to-end shape: ArrayType<Record{ enum }> cloned via ArrayType.copy().
        EnumType enumField = buildMatchingModeEnum();
        enumField.name = "matchingMode";

        List<Type> fields = new ArrayList<>();
        fields.add(enumField);
        RecordType record = new RecordType(fields, (Type) null);
        ArrayType array = new ArrayType(record);

        ArrayType arrayCopy = array.copy();
        RecordType copiedMember = (RecordType) arrayCopy.memberType;
        EnumType copiedEnum = (EnumType) copiedMember.fields.get(0);

        Assert.assertNotNull(copiedEnum.members);
        Assert.assertEquals(copiedEnum.members.size(), 2);
        Assert.assertEquals(copiedEnum.members.get(0).typeName, "ALL");
    }

    private static EnumType buildMatchingModeEnum() {
        List<Type> members = new ArrayList<>();
        members.add(new PrimitiveType("ALL"));
        members.add(new PrimitiveType("ANY"));
        EnumType enumType = new EnumType(members);
        enumType.typeInfo = new TypeInfo("MatchingMode", "org", "source", null, "0.3.0");
        return enumType;
    }
}
