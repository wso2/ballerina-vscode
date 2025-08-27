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
    Elephant|Dog? dog = {
        name: "Dog",
        breed: "Husky"
    };

    Elephant|error elephant = {
        name: "Elephant",
        cast: "Asian"
    };

    AnimalType animalType = {};
}