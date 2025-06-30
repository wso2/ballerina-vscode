/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import ballerina/auth;
import ballerina/jwt;
import ballerina/email;

// Type resolved through value expr
function tnfUnionRoot1(Vehicle vehicle) returns SUV|HighEndCar => {
    year: vehicle.year,
    model: {
        transmission: vehicle.model.transmission,
        engine: vehicle.model.engine
    }
};

// Type casted
function tnfUnionRoot2(Vehicle vehicle) returns SUV|HighEndCar => <SUV>{
    model: vehicle.category
};

// Type casted with let expression
function tnfUnionRoot3(Vehicle vehicle) returns SUV|HighEndCar => let var var1 = "100" in <SUV>{
        model: var1
    };

// Mapped to the root type
function tnfUnionRoot4(Vehicle vehicle) returns SUV|HighEndCar => vehicle.model;

// Union of array types
function tnfUnionRoot5(Vehicle vehicle) returns SUV[]|HighEndCar[] => [
];

// Union of array types, resolved type through value expr (need to handle adding new elements)
function tnfUnionRoot6(Vehicle vehicle) returns SUV|HighEndCar[] => [
    {
        year: vehicle.year,
        model: {
            transmission: "",
            engine: ""
        }
    }
];

// Union of multi-dimensional array types
function tnfUnionRoot7(Vehicle vehicle) returns HighEndCar[]|HighEndCar[][] => [
];

// mapped to root union type, a mix of array and non-array types
function tnfUnionRoot8(int x) returns int|float[] => x;

// mapped to root union type, a mix of array and non-array types, resolved type through expr
function tnfUnionRoot9(int x) returns int|float[] => [
    x * 1.0,
    0
];

// union types consisting imported array types
function tnfUnionRoot10(int x) returns email:Options[]|auth:LdapUserStoreConfig[] => [
    {
        connectionName: x
    }
];

// union types consisting imported types, type resolved through value expr
function tnfUnionRoot11(int x) returns email:Options|auth:LdapUserStoreConfig => {

    htmlBody: "",
    contentType: "",
    headers: {},
    cc: <string>"",
    bcc: <string>"",
    replyTo: <string>"",
    attachments: <email:Attachment>{
        filePath: "",
        contentType: ""
    },
    sender: ""
};

// multiple union types including types which are inner union type, type resolved through value expr
function tnfUnionRoot12(int x, string y) returns TypeA|TypeB|TypeC|error => {
    strB1: "12"
};

// multiple union type consist of array types
function tnfUnionRoot13(int x, string y) returns TypeA[]|(TypeB|TypeC)[]|TypeB1 => <(TypeB1|TypeB2|TypeC)[]>[
];

// mapped to root union type, resolved type through expr
function tnfUnionRoot14(TypeA typeA) returns TypeA|TypeB|TypeC|error => typeA.tb1;

// mapped to root union type, resolved type through expr
function tnfUnionRoot15(int x) returns TypeA|TypeB|TypeC|error => {
    strB1: x.toString()
};

// unsupported union type array
function tnfUnionRoot16(Vehicle vehicle) returns (SUV|xml)[] => [];

// unsupported arrays of union types

function tnfUnionRoot17(Vehicle vehicle) returns xml[]|TypeA[] => [];

// anydata typed output
function tnfUnionRoot18(TypeA a) returns anydata => {};
