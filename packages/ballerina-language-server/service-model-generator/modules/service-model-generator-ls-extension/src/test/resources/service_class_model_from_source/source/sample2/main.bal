# This is a sample Ballerina service class definition with methods and error handling.
# It includes a resource method to get an author by ID and a remote method to add an author.
public service class Book {
    private final string id;
    private final string name;
    private Author[] authors = [];

    function init(string name) returns error? {
        do {
            self.id = "";
            self.name = name;
        } on fail error err {
            // hanlde error
        }
    }

    # This resource function retrieves an author's name by their ID.
    # If the author is not found, it returns an error.
    # + id - The ID of the author to retrieve.
    # + return - The name of the author or an error if not found.
    resource function get author(int id) returns string|error? {
        do {
            Author[] result = from Author author in self.authors
                where author.id == id
                limit 1
                select author;
            if result.length() > 0 {
                return result[0].name;
            }
            check error("Author not found!");
        } on fail error err {
            // hanlde error
            return err;
        }
    }
}

type Author record {|
    int id;
    string name;
|};
