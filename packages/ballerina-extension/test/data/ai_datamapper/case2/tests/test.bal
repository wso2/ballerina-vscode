import ballerina/test;

Employee employee = {
    id: 1001,
    name: "Jane Smith",
    salary: 75000.50
};

EmployeeInfo info = transform(employee);

@test:Config {}
function testA() {
    test:assertEquals(info.employeeId, "1001");
}

@test:Config {}
function testB() {
    test:assertEquals(info.displayName, "Jane Smith");
}

@test:Config {}
function testC() {
    test:assertEquals(info.formattedSalary, "$75000.50");
}
