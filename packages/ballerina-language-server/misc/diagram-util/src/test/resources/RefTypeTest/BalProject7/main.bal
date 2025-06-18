type Employee record {
    string name;
};

type EmployeeWithID Employee & readonly;