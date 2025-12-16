import ballerina/log;

type Baz record {|
    int x;
    int y;
|};

type Bar record {|
    int a;
    int b;
|};

public function main() returns error? {
    do {
        Baz[] bazs = [{x: 10, y: 20}, {x: 30, y: 40}];
        Bar[] bars = [
            {a: 1, b: 3},
            (from var baz in bazs
                select {a: baz.x, b: baz.y})[0]
        ];
    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}
