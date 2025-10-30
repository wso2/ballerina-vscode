import test/pkgB;

public function main() {    
    string result1 = pkgB:processData("test", 3);
    float result2 = pkgB:calculate(10.5, 20.3, "add");
    
    // For type hover test
    pkgB:Person person = {name: "John", age: 30, email: "john@example.com"};
    
    // For client and action hover tests
    pkgB:ApiClient cl = new("http://api.example.com");
    string|error data = cl->fetch(123, true);
    boolean success = cl->send("payload", {"header": "value"}, 30);
    
    // For method hover test
    pkgB:DataProcessor processor = new("test-processor");
    string processed = processor.process("test", true);
    string transformed = processor.transform("input", "pre", "suf");
}
