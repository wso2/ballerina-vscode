type Input record {
    string st1;
    string st2;
    string st3;
    string st4;
    int d1;
    record {
        string Type;
        string Id;
        boolean Confirmed;
    }[] Assets;
};

type Output record {
    string st1;
    string st2;
    decimal d1;
    record {
        string Type;
        string Id;
        boolean Confirmed;
    }[] Assets;
    string[] stArr;
};

function transform() => ();

function transform2(Input input) returns Output => {
    Assets: input.Assets
};
