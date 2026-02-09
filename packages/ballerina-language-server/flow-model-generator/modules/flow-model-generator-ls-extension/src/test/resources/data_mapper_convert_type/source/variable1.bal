import ballerina/http;

type UserInfo record {|
   string username;
   string password;
|};

type Student record {|
   string username;
   string password;
|};

const string CONST = "CONST";

function transform1(json user, json student) returns json|error => {

};

function transform2(json user, json student) returns json|error =>
    let UserInfo userConverted = check user.ensureType() in
        {a: 10, b: 20};

function transform2(json user, json student) returns json|error =>
    let UserInfo userConverted = check user.ensureType() in {};

function transform3(json user, json student) returns json|error =>
    let UserInfo userConverted = check user.ensureType(),
    Student transform3 = {} in transform3;

function transform4(json user, json student) returns json => {

};

function transform5(json user, json student) returns json|error => {

};

function transform6(json user, json student) => {

};

function transform7(json user, json student) returns () => {

};
