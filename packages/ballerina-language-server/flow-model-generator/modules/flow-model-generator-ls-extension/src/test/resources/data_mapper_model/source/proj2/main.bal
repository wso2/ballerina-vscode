public type Sale record {
    string item;
    int quantity;
};

public type Array record {
    int[] values;
};

public function main() returns error? {
    do {
        Sale[] sales = [
            {item: "apple", quantity: 10},
            {item: "banana", quantity: 20},
            {item: "apple", quantity: 15},
            {item: "orange", quantity: 25}
        ];

        Array meanQuantity = {
            values: from var salesItem in sales
                let var quantity = salesItem.quantity
                group by var item = salesItem.item
                select sum(quantity)
        };

    } on fail error e {
        return e;
    }
}
