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
    Dog? dog = {
        name: "Dog",
        breed: "Husky"
    };

    Elephant elephant = {
        name: "Elephant",
        cast: "Asian"
    };

    AnimalType animalType = {};
}