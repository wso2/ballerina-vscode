import ballerina/test;

Product product1 = {
    productId: "P789",
    name: "Laptop",
    price: 999.99,
    stock: 10,
    description: "High-performance laptop"
};

Product product2 = {
    productId: "P790",
    name: "Mouse",
    price: 29.99,
    stock: 0,
    description: ()
};

ProductDTO dto1 = transformProduct(product1);
ProductDTO dto2 = transformProduct(product2);

@test:Config {}
function testProductId1() {
    test:assertEquals(dto1.id, "P789");
}

@test:Config {}
function testProductName1() {
    test:assertEquals(dto1.productName, "Laptop");
}

@test:Config {}
function testPriceString1() {
    test:assertEquals(dto1.priceString, "999.99");
}

@test:Config {}
function testInStock1() {
    test:assertTrue(dto1.inStock);
}

@test:Config {}
function testDescription1() {
    test:assertEquals(dto1.description, "High-performance laptop");
}

@test:Config {}
function testInStock2() {
    test:assertFalse(dto2.inStock);
}

@test:Config {}
function testDescription2() {
    test:assertEquals(dto2.description, "");
}
