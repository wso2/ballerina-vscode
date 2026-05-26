
type Person readonly & record {|
    string name;
    int age;
    boolean isAdult;
|};

type PersonWithChildren readonly & record {|
    string name;
    int age;
    boolean isAdult;
    Person[] children;
|};

// Array types

type Persons readonly & Person[4];

type Parents readonly & (PersonWithChildren|Person)[];

type Names readonly & string[2];

type Users readonly & (Person|string)[4];

// Record types with readonly fields

type Employees readonly & record {|
    readonly int id;
    string name;
    Names otherNames;
|}[];

type EmptyRecord readonly & record {|
|};

type Human readonly & record {
	readonly int id;
	readonly string name;
};

type Human2 readonly & readonly & record {
	readonly int id;
	string name;
};

type Human3 readonly & record {
	readonly int id;
	string name;
} & readonly;

// Intersection types

type Human4 readonly & Human2;

type Human5 readonly & readonly & Human2;

type Human6 readonly & record {
	readonly int id;
	string name;
} & readonly;

type Human7 readonly & (readonly & record {|
	readonly int id;
	string name;
|});
