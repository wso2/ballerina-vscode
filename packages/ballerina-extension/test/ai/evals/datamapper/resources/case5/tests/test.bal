import ballerina/test;

PersonalInfo personal = {
    firstName: "Jane",
    lastName: "Williams",
    dateOfBirth: "1990-05-15"
};

ContactInfo contact = {
    email: "jane.williams@example.com",
    phoneNumber: "555-9876",
    address: "456 Oak Avenue"
};

UserAccount account = createUserAccount(personal, contact, "jwilliams");

@test:Config {}
function testUsername() {
    test:assertEquals(account.username, "jwilliams");
}

@test:Config {}
function testFullName() {
    test:assertEquals(account.fullName, "Jane Williams");
}

@test:Config {}
function testBirthDate() {
    test:assertEquals(account.birthDate, "1990-05-15");
}

@test:Config {}
function testContactEmail() {
    test:assertEquals(account.contactEmail, "jane.williams@example.com");
}

@test:Config {}
function testContactPhone() {
    test:assertEquals(account.contactPhone, "555-9876");
}

@test:Config {}
function testResidentialAddress() {
    test:assertEquals(account.residentialAddress, "456 Oak Avenue");
}
