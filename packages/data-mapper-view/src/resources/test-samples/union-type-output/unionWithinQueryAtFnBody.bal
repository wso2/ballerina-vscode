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
// query expression returning union type consist of array of records
function tnfUnionQueryAtFnBody1(T3 t3) returns T1[]|T2[] => <T1[]>from var t1sItem in t3.t1s
    select {
        str: ""
    };

// mapped to root level and type resolved through value
function tnfUnionQueryAtFnBody3(T3 t3) returns T1[]|T2[] => t3.t1s;

// query expression returns array of union types , type resolved by value expression
function tnfUnionQueryAtFnBody4(T3 t3) returns (T1|T2)[] => from var t1sItem in t3.t1s
    select {
        str: t1sItem.str
    };

// query expression returns array of union types , type resolved via type casting
function tnfUnionQueryAtFnBody5(T3 t3) returns (T1|T2)[] => from var t1sItem in t3.t1s
    select <T1>{
        str: 100
    };

// query expression returns array of union types , type resolved by value expression
function tnfUnionQueryAtFnBody6(Vehicle[] vehicle) returns (SUV|HighEndCar)[] => from var item in vehicle
        select {
            year: item.year,
            model: item.category
        };
