import ballerina/io;

// Existing types that will conflict with XML-generated types
type Book record {
    string existingField;
};

type Author record {
    string name;
};

public function main() {
    io:println("Testing duplicate type validation");
}
