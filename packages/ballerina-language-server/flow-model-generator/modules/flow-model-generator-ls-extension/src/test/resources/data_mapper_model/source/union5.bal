type InvalidIntDetail record {|
    int value;
|};

type InvalidI32Detail record {|
    int:Signed32 value;
|};

type InvalidIntError error<InvalidIntDetail>;

type Dog record {
    string name;
    string breed;
};

type Elephant record {
    string name;
    string cast;
};

type Animal Dog|Elephant;

type AnimalType record {
    Animal? animal;
};

function fn1() {
    Elephant|InvalidIntError elephant = {
        name: "Elephant",
        cast: "Asian"
    };

    Elephant? elephantOrNil = {
        name: "Dog",
        breed: "Husky"
    };

    AnimalType animalType = {};
}