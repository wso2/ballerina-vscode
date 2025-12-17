type Person record {
    string id;
    string name;
};

type Student record {
    string id;
    string name;
};

function transform(Person p) returns Student => {
    id: p.id
}