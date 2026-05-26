import testorg/core;

public function main() {
    // Test 1: Function call - cursor on 'getGreeting'
    string greeting = core:getGreeting("World");
    
    // Test 2: Type reference - cursor on 'User'
    core:User user = {id: "001", name: "Alice"};
}
