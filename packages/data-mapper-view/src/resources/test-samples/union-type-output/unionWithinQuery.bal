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
// query expression returns arrays of union type (not supported ATM https://github.com/ballerina-platform/ballerina-lang/issues/40012)
function tnfUnionQuery1(T3 t3) returns T4 => {
    t1sOrT2s: from var t1sItem in t3.t1s
        select {
            str:
        }
};

// query expression returns union type consist of arrays , type resolved by casting
function tnfUnionQuery2(T3 t3) returns T5 => {
    t1OrT2s: from var t1sItem in t3.t1s
        select <T1>{
            str: 0
        }
};

// query expression returns union type consist of arrays , type resolved via value expression
function tnfUnionQuery3(T3 t3) returns T5 => {
    t1OrT2s: from var t1sItem in t3.t1s
        select {
            str: t1sItem.str
        }
};

// query expression returns union type consist of arrays , type resolved via value expression
function tnfUnionQuery5(T3 t3) returns T51 => {
    t11sOrT2s: from var t1sItem in t3.t1s
        select {
            str: "",
            person: {
                name: t1sItem.str,
                age: 10,
                parent: {
                    parentName: t1sItem.str,
                    parentAge: 100
                }
            }
        }
};

// query expression returns union type consist of arrays , select clause contains conditional expression (not supported ATM https://github.com/ballerina-platform/ballerina-lang/issues/40013)
function tnfUnionQuery6(T3 t3) returns T5 => {
    t1OrT2s: from var t1sItem in t3.t1s
        select t1sItem.str == "foo" ? {str: t1sItem.str} : {foo: true}
};
