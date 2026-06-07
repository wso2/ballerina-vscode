import ballerina/test;

Student student = {
    id: 1001,
    studentName: "Alice Johnson",
    age: 20,
    gender: "Female",
    semesterGPA: ["3.8", "3.9", "4.0"],
    academicMajor: "Computer Science",
    roommates: [
        {
            id: 1002,
            studentName: "Bob Smith",
            age: 21,
            gender: "Male",
            semesterGPA: [],
            academicMajor: "Mathematics",
            roommates: [],
            address: ""
        }
    ],
    address: "123 College Ave"
};

PersonalProfile profile = transform(student);

@test:Config {}
function testId() {
    test:assertEquals(profile.id, 1001);
}

@test:Config {}
function testBioName() {
    test:assertEquals(profile.bio.name, "Alice Johnson");
}

@test:Config {}
function testBioGender() {
    test:assertEquals(profile.bio.gender, "Female");
}

@test:Config {}
function testBioAge() {
    test:assertEquals(profile.bio.age, 20);
}

@test:Config {}
function testAcademicMajor() {
    test:assertEquals(profile.academicRecord.major, "Computer Science");
}

@test:Config {}
function testSemesterGPA() {
    test:assertEquals(profile.academicRecord.semesterGPA, ["3.8", "3.9", "4.0"]);
}

@test:Config {}
function testNumberOfRoomates() {
    test:assertEquals(profile.accommodationDetails.numberOfRoomates, 1);
}

@test:Config {}
function testAddress() {
    test:assertEquals(profile.accommodationDetails.address, "123 College Ave");
}
