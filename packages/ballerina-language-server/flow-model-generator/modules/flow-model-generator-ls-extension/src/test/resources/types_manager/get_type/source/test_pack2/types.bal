import ballerina/graphql;

type Person record {
	@graphql:ID
    string name;
	int age;
};

type Employee record {|
    string name;
    @graphql:ID
    int id;
|};
