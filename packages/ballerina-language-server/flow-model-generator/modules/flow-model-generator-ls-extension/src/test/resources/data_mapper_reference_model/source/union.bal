type Dog record {
    string name;
    string breed;
};

type Elephant record {
    string name;
    string cast;
};

type Animal Dog|Elephant;

function fn1() {
    Dog dog = {
        name: "Dog",
        breed: "Husky"
    };

    Elephant elephant = {
        name: "Elephant",
        cast: "Asian"
    };

    Animal animal1 = dog;
}