public function main() {
    int result = calculateTotal(10, 20, 30);
    int product = multiply(result, 2);
    int[] _ = [result, product];
}

# Calculates the total sum of multiple integers
#
# + numbers - Variable number of integers to sum
# + return - The total sum of all numbers
public function calculateTotal(int... numbers) returns int {
    int total = 0;
    foreach var num in numbers {
        total += num;
    }
    return total;
}

# Multiplies two numbers
#
# + a - First number
# + b - Second number
# + return - Product of a and b
public function multiply(int a, int b) returns int {
    return a * b;
}

# Finds the maximum value in an array
#
# + values - Array of integers
# + return - Maximum value in the array
public function findMax(int[] values) returns int {
    int max = values[0];
    foreach var val in values {
        if val > max {
            max = val;
        }
    }
    return max;
}

# Checks if a number is even
#
# + num - Number to check
# + return - true if even, false otherwise
public function isEven(int num) returns boolean {
    return num % 2 == 0;
}

// Private function - should not appear in search
function helperFunction() {
    // Internal helper
}

# Represents an employee record
public type Employee record {|
    string name;
    int age;
|};

type InternalConfig record {|
    string key;
    string value;
|};
