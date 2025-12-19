import new_connection1.db;

import ballerina/http;
import ballerina/io;

http:Client httpClient = check new ("http://localhost:9090");

public function main() returns error? {
    db:Client dbClient = check new ("localhost", 3306, "root", "Test@123", "album_db");

    // Test case 1: Resource function with inferred type and mixed required/defaultable args
    db:Album[] albums = check dbClient->/albums("Rock", 50.0);
    io:println(albums);

    // Test case 2: Resource function with single path parameter and inferred type
    db:Album album = check dbClient->/albums/[1]();
    io:println(album);

    // Test case 3: Resource function with multiple path parameters and inferred type
    db:AlbumRating albumRating = check dbClient->/albumratings/[1]/["John"]();
    io:println(albumRating);

    // Test case 4: Resource function with inferred type and one required argument
    db:Purchase[] purchases = check dbClient->/purchases(5);
    io:println(purchases);

    // Test case 5: Resource function with inferred type and one defaultable argument
    db:AlbumRating[] ratings = check dbClient->/albumratings(minRating = 4);
    io:println(ratings);

    // Test case 6: Resource function with all arguments (required and defaultable)
    db:Purchase[] filteredPurchases = check dbClient->/purchases(2, maxPrice = 500.0, customerFilter = "Alice");
    io:println(filteredPurchases);

    int x = 32;
    while x < 50 {
        if (x % 2 == 0) {
            int y = 12;
        } else {
            string z = "hello";
            do {
                if z.length() == x {
                    Address address = {houseNo: "10", line1: "foo", line2: "bar", city: "Colombo", country: "Sri Lanka"};

                } else {
                    fail error("error");
                }
            } on fail {
                break;
            }
        }
        x += 2;
    }
}

function fn(int x) returns int {
    return x + 1;
}

http:Client httpClientResult = check new ("http://localhost:9091");

final Address[] addresses = [];
final Address var1 = {country: "", city: "", houseNo: "", line2: "", line1: ""};

function customFn(Address address, Person Person) returns Location {
    return {
        country: "",
        city: ""
    };
};

function customFnWithImportedType(http:ClientConfiguration config, Address address) returns http:HttpServiceConfig {
    return {};
}
