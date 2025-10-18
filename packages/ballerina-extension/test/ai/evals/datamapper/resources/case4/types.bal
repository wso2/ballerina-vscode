type Product record {
    string productId;
    string name;
    decimal price;
    int stock;
    string? description;
};

type ProductDTO record {
    string id;
    string productName;
    string priceString;
    boolean inStock;
    string description;
};
