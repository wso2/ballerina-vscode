import ballerina/http;

type Journey record {
    string tripStart;
    string tripEnd ;
};

type Ticket record {
    string ticketId;
    string seat;
    int price;
};

# Comment
service /deltaLine on new http:Listener(9092) {
    resource function post ticketing(@http:Payload Journey journey) returns Ticket|error {        
        return {ticketId: "T120", seat: "A10", price: 68};
    }
}
