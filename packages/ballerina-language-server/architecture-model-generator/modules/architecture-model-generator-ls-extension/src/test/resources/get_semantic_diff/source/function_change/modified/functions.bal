import ballerina/log;

function addNumbers(decimal firstNumber, decimal secondNumber) returns decimal {
    return firstNumber + secondNumber;
}

function multiply(decimal first, decimal secondNumber) returns decimal {
    return first * secondNumber;
}

function divide(decimal dividend, decimal divisor) returns decimal|error {
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
        log:printInfo("Calculating power for negative exponent");
    }
    return result;
}

function modulo(decimal dividend, decimal divisor) returns decimal|error {
    if divisor == 0.0d {
        return error("Modulo by zero is not allowed");
    }
    return dividend % divisor;
}
