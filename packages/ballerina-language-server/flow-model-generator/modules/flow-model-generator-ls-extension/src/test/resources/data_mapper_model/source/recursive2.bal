type Department record {
    string name;
    Employee[] employees;
};

type Employee record {
    string name;
    Department department;
};

function fn1() {
    Department engineering = {
        name: "Engineering",
        employees: []
    };

    Employee alice = {
        name: "Alice",
        department: engineering
    };
}