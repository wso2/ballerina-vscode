const int index = 1;

public type MyRecord record  {|
    string name;
|};

public function main() returns error? {
    do {
        string[][][] names = [[["Alice", "Bob"], ["Charlie"]], [["David"]]];
        MyRecord var1 = {name: names[0][0][index]};
    } on fail error e {
        return e;
    }
}