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
import ballerina/email;

// array of union types, type resolved through value expression
function tnfUnionArray1(Vehicle vehicle) returns (SUV|HighEndCar)[] => [
    {
        model: vehicle.model.transmission,
        year: vehicle.year
    }
];

// array of union types, type resolved through value expression
function tnfUnionArray2(Vehicle vehicle) returns (SUV|HighEndCar)[] => [
    {
        year: 0,
        model: vehicle.model.transmission
    },
    {
        year: vehicle.year,
        model: {
            transmission: "",
            engine: ""
        }
    }
];

// array of union types which are arrays, type resolved via casting and via value expression
function tnfUnionArray3(Vehicle vehicle) returns (SUV[]|HighEndCar[])[] => [
    <SUV[]>[
        {
            year: 0,
            model: ""
        },
        {}
    ],
    [
        {
            year: 0,
            model: {
                transmission: vehicle.model.transmission,
                engine: ""
            }
        }
    ]
];

// array of union types which are arrays, the value is empty
function tnfUnionArray4(Vehicle vehicle) returns (SUV[]|HighEndCar[])[] => [
];

// array of union types which are arrays (imported types), type is resolved through value expression
function tnfUnionArray5(Vehicle vehicle) returns (email:Message[]|HighEndCar[])[] => [
    [
        {
            subject: "",
            to: ""
        }
    ]
];

// array of union types which consists of array and record type (imported)
function tnfUnionArray6(Vehicle vehicle) returns (email:Message|HighEndCar[])[] => [
    {
        subject: "",
        to: ""
    }
];

// array of union types, type resolved via type casting
function tnfUnionArray7(Vehicle vehicle) returns (SUV|HighEndCar)[] => [
    <SUV>{
        year: 0
    }
];

// array of union types, type narrowed to single type
function tnfUnionArray8(Vehicle vehicle) returns (SUV|error)[] => [
    {}
];

// optional type array, type narrowed to single type
function tnfUnionArray9(Vehicle vehicle) returns SUV?[] => [
    {}
];

// array of imported union types, type resolved via value expression
function tnfUnionArray10(Vehicle vehicle) returns (email:Options|auth:LdapUserStoreConfig)[] => [
    {
        userEntryObjectClass: "",
        userNameSearchFilter: "",
        groupNameAttribute: "",
        userNameAttribute: "",
        membershipAttribute: "",
        groupNameListFilter: "",
        groupSearchBase: [
            vehicle.model.engine
        ],
        userSearchBase: "",
        groupNameSearchFilter: "",
        userNameListFilter: "",
        domainName: "",
        connectionUrl: "",
        groupEntryObjectClass: "",
        connectionName: "",
        connectionPassword: ""
    }
];

// array of imported union types, type resolved via type casting and via value expression
function tnfUnionArray11(Vehicle vehicle) returns (email:Options|auth:LdapUserStoreConfig)[] => [
    <auth:LdapUserStoreConfig>{
        userEntryObjectClass: "",
        userNameSearchFilter: "",
        groupNameAttribute: ""
    },
    {}
];

// array of imported union types consist of primitive type
function tnfUnionArray12(Vehicle vehicle) returns (int|SUV)[] => [
    0,
    <SUV>{}
];

// regular array typed output
function tnfUnionArray13(Vehicle v) returns SUV[] => [

];
