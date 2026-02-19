import ballerina/data.jsondata;

type User record {|
    string code;
    string number;
|};

type SecondaryPhones record {|
    string code;
    string number;
|};

type Foo record {|
    string code;
    string number;
|};

function transform(json j, User u) returns json|error =>
    let User user = {code: u.code, number: u.number}, Foo foo = check j.ensureType(),
    SecondaryPhones secondaryPhones = {} in secondaryPhones;

function transform1(xml varXml) returns json => let Foo varXmlConverted = check varXml.ensureType() in {};

function transform2(json j, User u) returns json|error =>
    let User user = {code: u.code, number: u.number}, Foo foo = check j.ensureType(),
    SecondaryPhones secondaryPhones = {} in jsondata:toJson(secondaryPhones);
