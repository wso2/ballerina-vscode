type Department record {
    string name;
    int[] otherCodes;
};

type Employee record {
    string name;
    Department department;
};


function fn1() {
    int[] itemCodes = [1,2,3];

    Department engineering = {
        name: "Engineering",
        otherCodes: itemCodes
    };

    Employee alice = {
        name: "Alice",
        department: engineering
    };
}