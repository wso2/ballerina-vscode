type RecType record {|
    int i;
|};

type ArrType record {|
    RecType[] rec;
|}

public function main() returns error? {
    do {
        ArrType arr1 = {};
        ArrType arr2 = {
            rec: [{i: 0}, {i: 1}, {i: 2}]
        };
    } on fail error e {

    }
}