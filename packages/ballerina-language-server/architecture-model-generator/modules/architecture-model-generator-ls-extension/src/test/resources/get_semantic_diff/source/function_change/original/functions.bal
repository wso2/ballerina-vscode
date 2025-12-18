function add(decimal firstNumber, decimal secondNumber) returns decimal {
    return firstNumber + secondNumber;
}

function subtract(decimal firstNumber, decimal secondNumber) returns decimal {
    return firstNumber - secondNumber;
}

function multiply(decimal firstNumber, decimal secondNumber) returns decimal {
    return firstNumber * secondNumber;
}

function divide(decimal dividend, decimal divisor) returns decimal|error {
    if divisor == 0.0d {
        return error("Division by zero is not allowed");
    }
    return dividend / divisor;
}

function power(decimal baseNumber, int exponent) returns decimal {
    if exponent == 0 {
        return 1;
    }
    
    decimal result = 1;
    int absoluteExponent = exponent < 0 ? -exponent : exponent;
    
    int counter = 0;
    while counter < absoluteExponent {
        result = result * baseNumber;
        counter = counter + 1;
    }
    
    if exponent < 0 {
        return 1 / result;
    }
    return result;
}

