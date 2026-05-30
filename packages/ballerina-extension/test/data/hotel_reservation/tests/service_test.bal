import ballerina/http;
import ballerina/test;

http:Client testClient = check new ("http://localhost:9090");

configurable User user = ?;

@test:Config {}
function testReservation() returns error? {
    // Create a reservation
    anydata reservationRequest = {checkinDate: "2024-02-19T14:00:00Z", checkoutDate: "2024-02-20T10:00:00Z", rate: 100, user: user, roomType: "Family"};
    Reservation reservation = check testClient->post("/reservations", reservationRequest);
    test:assertEquals(reservation.room.number, 303);
}

