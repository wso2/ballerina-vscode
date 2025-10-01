type MyType record {|
    string name1;
|};

type MyType2 record {|
    MyType name1;
    Red selectedColor;
    Color colorOptions;
|};

enum Color {
    Red,
    Green,
    Blue
}
