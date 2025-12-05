public type Grouped record {
    GroupedItems[] items;
};

public type GroupedItems record {
    string item;
    int totalQuantity;
    decimal totalPrice;
    int[] quantityArray;
};

function transform(GroupedItems input) returns Grouped => {
    items: []
};
