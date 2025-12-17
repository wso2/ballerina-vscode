type Person record {
    int? id?;
    string firstName;
    College? college?;
};

type College record {
    string colegeName?;
};

type Student record {
    string id;
    string firstName;
};

function transform(Person person) returns Student => {
};
