import ballerinax/redis;

type Student record {|
    string username;
    string password;
|};

function pv1ToEncounter(Student pv1) returns redis:Options => {};
