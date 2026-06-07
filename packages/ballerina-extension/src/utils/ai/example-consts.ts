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

export const examplesContent = `// Example Ballerina Project which demonstrates the usage of maps, arrays, union types, optional fields, errors, type narrowing, JSON, and cloning.
import ballerina/io;
import ballerina/http;
import ballerinax/redis;

type Person record {|
    string name;
    int age;
    string|Address address;
    string phoneNumber?;
|};

type Address record {
    string street;
    string city;
    string country;
};

final http:Client httpClient = check new("https://targeturl.com");
final redis:Client redisClient = check new();

public function main() returns error? {
    // Maps
    map<string> countryCapitals = {
        "USA": "Washington, D.C.",
        "UK": "London",
        "India": "New Delhi"
    };

    foreach [string, string] [key, value] in countryCapitals.entries() {
        io:println("Country: ", key, ", Capital: ", value);
    }

    if (countryCapitals.hasKey("USA")) {
        string usaCapital = countryCapitals.get("USA");
        io:println("USA's capital: ", usaCapital);
    }

    int[] numbers = [1, 2, 3, 4, 5];
    io:println("Numbers in array:");
    foreach int number in numbers {
        io:println(number);
    }

    int index = 0;
    io:println("Numbers using while loop:");
    while index < numbers.length() {
        int number = numbers[index];
        io:println(number);
        index += 1;
    }

    // Union type variable  
    int|string unionVar = "Hello";
    io:println("Union variable: ", unionVar);

    Person person1 = {
        name: "Alice",
        age: 30,
        address: {street: "123 Main St", city: "Anytown", country: "USA"} // Address as record
        // phoneNumber is optional
    };

    Person person2 = {
        name: "Bob",
        age: 25,
        address: "123 Main St, Anytown, USA", // Address as string
        phoneNumber: "+1234567890"
    };

    // Accessing union field
    string|Address address = person2.address;
    if address is string {
        io:println("Address: ", address);
    } else {
        // Address is a record
        io:println("Address: ", address.street, ", ", address.city, ", ", address.country);
    }

    // Accessing optional fields
    string? phoneNumber = person1.phoneNumber;
    if phoneNumber is string {
        io:println("Phone number: ", phoneNumber);
    } else {
        io:println("Phone number not available");
    }

    // Errors and check  
    string|error devideResult = divideNumbers(10, 0);
    if (devideResult is error) {
        io:println("Error: ", devideResult.message());
    } else {
        io:println("Result: ", devideResult);
    }

    // Using 'check' to implicitly handle errors
    string computed = check divideNumbers(10, 0);
    io:println("Computation successful: ", computed);

    // 'is' operator with errors and optionals  
    int|string|error value = getValue();
    if (value is error) {
        io:println("An error occurred: ", value.message());
    } else if (value is int) {
        io:println("Value is int: ", value);
    } else if (value is string) {
        io:println("Value is string: ", value);
    }

    // Type narrowing  
    anydata data = 100;
    if (data is int) {
        // Now data is treated as an int  
        int intValue = data;
        io:println("Data as int: ", intValue);
    } else if (data is string) {
        string strValue = data;
        io:println("Data as string: ", strValue);
    } else {
        // now data is anydata
        io:println("Data as anydata: ", data);
    }

    //cloneWithType  
    anydata personData = {name: "Alice", age: 30};
    Person person = check personData.cloneWithType();
    io:println("Person details: ", person);

    // JSON access fields
    json personJson = {"name": "Bob", "age": 25};
    string personName = check personJson.name;
    int personAge = check personJson.age;
    io:println("Person's name: ", personName);
    io:println("Person's age: ", personAge);

    // JSON to Record  
    Person personFromJson = check personJson.cloneWithType();
    io:println("Person from JSON: ", personFromJson);

    // Record to JSON  
    Person newPerson = {name: "Eve", age: 22, address: {street: "456 Elm St", city: "Othertown", country: "USA"}};
    json newPersonJson = newPerson.toJson();
    io:println("Person converted to JSON: ", newPersonJson.toJsonString());
    
    float floatItem = 10.5;
    //float to string
    string floatString = floatItem.toString();

    //string to float
    floatItem = check float:fromString(floatString);

    //int to string
    int intItem = 10;
    string intString = intItem.toString();

    //string to int
    intItem = check int:fromString(intString);

    //decimal to string
    decimal decimalItem = 10.5;
    string decimalString = decimalItem.toString();

    //string to decimal
    decimalItem = check decimal:fromString(decimalString);

    //http

    // Send a GET request
    json jsonPayload = check httpClient->get("/foo/bar");

    // data binding to record
    Person[] people = check httpClient->get("/person");

    // Headers
    map<string> headers = {"header1": "foo"};
    json jsonPayloadWithHeaders = check httpClient->get("/foo/bar", headers);

    // Query Params
    Person personPayload = check httpClient->get("/person?userId=5896544");

    // Send a POST request
    json postPayload = {"name": "Alice", "age": 30};
    json postResponse = check httpClient->post("/foo/bar", postPayload);

    // redis 
    _ = check redisClient->set("key1", personPayload.toJsonString());
    _ = check redisClient->set("key2", "hello");

    string? redisVal = check redisClient->get("key1");
    if (redisVal is string) {
        Person p = check redisVal.fromJsonStringWithType();
        io:println("Value from Redis: ", p);
    } else {
        io:println("Value not found in Redis");
    }
}

// Function that can return an error  
function divideNumbers(int a, int b) returns string|error {
    if (b == 0) {
        return error("Division by zero");
    }
    return "Result: " + (a / b).toString();
}

// Function that returns a union type with error  
function getValue() returns int|string|error {
    // For demonstration, let's return an error  
    return error("Some error occurred");
}
`;
