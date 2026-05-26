type RecType record {|
    int i;
|};

public function main() {
    RecType[][] arr3 = [];
    RecType[][] arr4 = from var arr3Item in arr3
                        select from var arr3ItemItem in arr3Item
                            select {i: 0};
}
