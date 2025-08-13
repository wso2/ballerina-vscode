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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import { ExpandedDMModel, InputCategory, TypeKind } from "@wso2/ballerina-core";

export const sampleModel: ExpandedDMModel = {
    "inputs": [
        {
            "fields": [
                {
                    "fields": [
                        {
                            "id": "input.user.firstName",
                            "variableName": "firstName",
                            "typeName": "string",
                            "kind": TypeKind.String,
                            "optional": false
                        },
                        {
                            "id": "input.user.lastName",
                            "variableName": "lastName",
                            "typeName": "string",
                            "kind": TypeKind.String,
                            "optional": false
                        },
                        {
                            "id": "input.user.email",
                            "variableName": "email",
                            "typeName": "string",
                            "kind": TypeKind.String,
                            "optional": false
                        },
                        {
                            "fields": [
                                {
                                    "id": "input.user.address.street",
                                    "variableName": "street",
                                    "typeName": "string",
                                    "kind": TypeKind.String,
                                    "optional": false
                                },
                                {
                                    "id": "input.user.address.city",
                                    "variableName": "city",
                                    "typeName": "string",
                                    "kind": TypeKind.String,
                                    "optional": false
                                },
                                {
                                    "id": "input.user.address.state",
                                    "variableName": "state",
                                    "typeName": "string",
                                    "kind": TypeKind.String,
                                    "optional": false
                                },
                                {
                                    "id": "input.user.address.postalCode",
                                    "variableName": "postalCode",
                                    "typeName": "int",
                                    "kind": TypeKind.Int,
                                    "optional": false
                                }
                            ],
                            "id": "input.user.address",
                            "variableName": "address",
                            "typeName": "Address",
                            "kind": TypeKind.Record,
                            "optional": false
                        },
                        {
                            "member": {
                                "id": "input.user.phoneNumbers.0",
                                "variableName": "<phoneNumbersItem>",
                                "typeName": "string",
                                "kind": TypeKind.String,
                                "optional": false
                            },
                            "id": "input.user.phoneNumbers",
                            "variableName": "phoneNumbers",
                            "typeName": "string[]",
                            "kind": TypeKind.Array,
                            "optional": false
                        }
                    ],
                    "id": "input.user",
                    "variableName": "user",
                    "typeName": "User",
                    "kind": TypeKind.Record,
                    "optional": false
                },
                {
                    "fields": [
                        {
                            "id": "input.account.accountNumber",
                            "variableName": "accountNumber",
                            "typeName": "string",
                            "kind": TypeKind.String,
                            "optional": false
                        },
                        {
                            "id": "input.account.balance",
                            "variableName": "balance",
                            "typeName": "int",
                            "kind": TypeKind.Int,
                            "optional": false
                        },
                        {
                            "id": "input.account.lastTransaction",
                            "variableName": "lastTransaction",
                            "typeName": "string",
                            "kind": TypeKind.String,
                            "optional": false
                        }
                    ],
                    "id": "input.account",
                    "variableName": "account",
                    "typeName": "Account",
                    "kind": TypeKind.Record,
                    "optional": false
                }
            ],
            "id": "input",
            "variableName": "input",
            "typeName": "Input",
            "kind": TypeKind.Record,
            "category": InputCategory.Variable,
            "optional": false
        }
    ],
    "output": {
        "fields": [
            {
                "id": "output.fullName",
                "variableName": "fullName",
                "typeName": "string",
                "kind": TypeKind.String,
                "optional": false
            },
            {
                "fields": [
                    {
                        "id": "output.contactDetails.email",
                        "variableName": "email",
                        "typeName": "string",
                        "kind": TypeKind.String,
                        "optional": false
                    },
                    {
                        "id": "output.contactDetails.primaryPhone",
                        "variableName": "primaryPhone",
                        "typeName": "string",
                        "kind": TypeKind.String,
                        "optional": false
                    }
                ],
                "id": "output.contactDetails",
                "variableName": "contactDetails",
                "typeName": "ContactDetails",
                "kind": TypeKind.Record,
                "optional": false
            },
            {
                "fields": [
                    {
                        "id": "output.location.city",
                        "variableName": "city",
                        "typeName": "string",
                        "kind": TypeKind.String,
                        "optional": false
                    },
                    {
                        "id": "output.location.state",
                        "variableName": "state",
                        "typeName": "string",
                        "kind": TypeKind.String,
                        "optional": false
                    },
                    {
                        "id": "output.location.zipCode",
                        "variableName": "zipCode",
                        "typeName": "string",
                        "kind": TypeKind.String,
                        "optional": false
                    }
                ],
                "id": "output.location",
                "variableName": "location",
                "typeName": "Location",
                "kind": TypeKind.Record,
                "optional": false
            },
            {
                "fields": [
                    {
                        "id": "output.accountInfo.accountNumber",
                        "variableName": "accountNumber",
                        "typeName": "string",
                        "kind": TypeKind.String,
                        "optional": false
                    },
                    {
                        "id": "output.accountInfo.balance",
                        "variableName": "balance",
                        "typeName": "int",
                        "kind": TypeKind.Int,
                        "optional": false
                    }
                ],
                "id": "output.accountInfo",
                "variableName": "accountInfo",
                "typeName": "AccountInfo",
                "kind": TypeKind.Record,
                "optional": false
            },
            {
                "id": "output.transactionDate",
                "variableName": "transactionDate",
                "typeName": "string",
                "kind": TypeKind.String,
                "optional": false
            }
        ],
        "id": "output",
        "variableName": "transform",
        "typeName": "Output",
        "kind": TypeKind.Record,
        "optional": false
    },
    "mappings": [],
    "source": "",
    "view": ""
}
