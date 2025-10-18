import ballerina/test;

Employee employee = {
    id: "E123",
    name: "Alice Johnson",
    skills: ["Java", "Python", "Ballerina"],
    yearsOfExperience: 5
};

EmployeeProfile profile = transformEmployee(employee);

@test:Config {}
function testEmployeeId() {
    test:assertEquals(profile.employeeId, "E123");
}

@test:Config {}
function testFullName() {
    test:assertEquals(profile.fullName, "Alice Johnson");
}

@test:Config {}
function testSkills() {
    test:assertEquals(profile.technicalSkills, ["Java", "Python", "Ballerina"]);
}

@test:Config {}
function testExperienceLevel() {
    test:assertEquals(profile.experienceLevel, "Mid-level");
}
