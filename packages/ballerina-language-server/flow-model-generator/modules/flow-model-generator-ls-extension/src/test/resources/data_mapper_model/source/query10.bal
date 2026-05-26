type RecType record {|
    int i;
|};

type MyRecType record {|
    RecType[][] recType;
|};

public function main() {
    RecType[][] arr3 = [];
    RecType[][] arr4 = from var arr3Item in arr3
                        select from var arr3ItemItem in arr3Item
                            select {i: 0};
    MyRecType myRecType = {recType: from var arr3Item in arr3
                                        select from var arr3ItemItem in arr3Item
                                                select {i: 0}};
}
