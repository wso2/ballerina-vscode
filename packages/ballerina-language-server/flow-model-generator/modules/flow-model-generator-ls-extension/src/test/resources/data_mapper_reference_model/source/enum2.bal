enum DepartmentCode {
    HR,
    IT,
    FINANCE
}

type Department record {
    string name;
    DepartmentCode code;
};

type Employee record {
    string name;
    Department department;
};

function fn1() {

    Department engineering = {
        name: "Engineering",
        code: IT
    };

    Department engineering2 = {
        name: "Engineering",
        code: engineering.code
    };


    Employee alice = {
        name: "Alice",
        department: engineering
    };
}