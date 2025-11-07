import ballerina/test;

Person person = {
    firstName: "John",
    lastName: "Doe",
    age: 19
};

Student student = transform(person);

@test:Config {}
function testA() {
    test:assertEquals(student.fullName, "John Doe");
}

@test:Config {}
function testB() {
    test:assertEquals(student.age, "19");
}
