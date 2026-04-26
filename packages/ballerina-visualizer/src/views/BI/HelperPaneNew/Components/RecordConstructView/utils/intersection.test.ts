/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { TypeField } from "@wso2/ballerina-core";
import {
    isIntersectionRecord,
    unwrapIntersectionRecord,
} from "./intersection";

const plainRecord: TypeField = {
    typeName: "record",
    fields: [
        { typeName: "string", name: "name", optional: false, defaultable: false, selected: false },
        { typeName: "int", name: "id", optional: true, defaultable: false, selected: false },
    ],
    hasRestType: true,
    restType: { typeName: "anydata", optional: false, defaultable: false, isRestType: false, selected: false },
    optional: false,
    defaultable: false,
    selected: false,
};

const intersectionPet: TypeField = {
    typeName: "intersection",
    members: [
        { typeName: "readonly", optional: false, defaultable: false, selected: false },
        {
            typeName: "record",
            fields: [
                {
                    typeName: "array",
                    name: "photoUrls",
                    memberType: { typeName: "string", optional: false, defaultable: false, selected: false },
                    optional: false,
                    defaultable: false,
                    selected: false,
                },
                { typeName: "string", name: "name", optional: false, defaultable: false, selected: false },
                { typeName: "int", name: "id", optional: true, defaultable: false, selected: false },
            ],
            hasRestType: true,
            restType: { typeName: "anydata", optional: false, defaultable: false, isRestType: false, selected: false },
            optional: false,
            defaultable: false,
            selected: false,
        },
    ],
    optional: false,
    defaultable: false,
    selected: false,
};

describe("isIntersectionRecord", () => {
    it("returns false for a plain record", () => {
        expect(isIntersectionRecord(plainRecord)).toBe(false);
    });

    it("returns true for intersection containing a record", () => {
        expect(isIntersectionRecord(intersectionPet)).toBe(true);
    });

    it("returns false for intersection without a record member", () => {
        const tf: TypeField = {
            typeName: "intersection",
            members: [
                { typeName: "readonly", selected: false },
                { typeName: "json", selected: false },
            ],
        };
        expect(isIntersectionRecord(tf)).toBe(false);
    });

    it("returns false for null/undefined", () => {
        expect(isIntersectionRecord(null)).toBe(false);
        expect(isIntersectionRecord(undefined)).toBe(false);
    });
});

describe("unwrapIntersectionRecord", () => {
    it("returns input unchanged for a plain record", () => {
        const result = unwrapIntersectionRecord(plainRecord);
        expect(result).toBe(plainRecord);
    });

    it("extracts the inner record from an intersection", () => {
        const result = unwrapIntersectionRecord(intersectionPet);
        expect(result.typeName).toBe("record");
        expect(result.fields).toBeDefined();
        expect(result.fields!.length).toBe(3);
        expect(result.fields!.map(f => f.name)).toEqual(["photoUrls", "name", "id"]);
    });

    it("carries forward identity fields from the wrapper", () => {
        const wrapped: TypeField = {
            ...intersectionPet,
            name: "Pet",
            typeInfo: {
                name: "Pet",
                orgName: "kanushkagayan",
                moduleName: "test_4_25_1.petStore",
                version: "0.1.0",
            },
        };
        const result = unwrapIntersectionRecord(wrapped);
        expect(result.typeName).toBe("record");
        expect(result.name).toBe("Pet");
        expect(result.typeInfo?.name).toBe("Pet");
    });

    it("returns input unchanged when intersection has no record member", () => {
        const tf: TypeField = {
            typeName: "intersection",
            members: [
                { typeName: "readonly", selected: false },
                { typeName: "json", selected: false },
            ],
        };
        expect(unwrapIntersectionRecord(tf)).toBe(tf);
    });
});

