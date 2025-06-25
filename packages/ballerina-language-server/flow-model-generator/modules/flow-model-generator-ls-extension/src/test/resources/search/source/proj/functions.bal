
# Adds two integers and returns the result.
#
# + a - The first integer to be added
# + b - The second integer to be added
#
# + return - The sum of the two integers
#
# # Example
# ```
# int result = add(5, 3);
# // result will be 8
# ```
function add(int a, int b) returns int => a + b;

function sum(int... numbers) returns int {
    int total = 0;
    foreach var num in numbers {
        total += num;
    }
    return total;
}

# Computes the prefix sum of an array of integers.
#
# The prefix sum of an array is a new array where each element at index `i` is the sum of the elements
# from the start of the array up to index `i`.
#
# + numbers - The array of integers for which the prefix sum is to be computed.
# + return - An array of integers representing the prefix sum of the input array.
function prefixSum(int[] numbers) returns int[] {
    int[] result = [];
    int currentSum = 0;
    foreach var num in numbers {
        currentSum += num;
        result.push(currentSum);
    }
    return result;
}

# Performs a safe division operation.
#
# This function divides the given numerator by the denominator and returns the result.
# If the denominator is zero, it returns an error indicating a division by zero.
#
# + a - The numerator of type `float`.
# + b - The denominator of type `float`.
#
# # Returns
# - `float` - The result of the division if the denominator is not zero.
# - `error` - An error indicating division by zero if the denominator is zero.
#
# + return - The result of the division or an error.
public function safeDivide(float a, float b) returns float|error {
    if (b == 0.0) {
        return error("Division by zero");
    }
    return a / b;
}

// Natural Functions (NP Functions)
function suggestMovieGenre() returns string|error => natural {
    **Assumption**
    Think yourself as a movie expert

    **What to do**
    Suggest a movie genre

    **Output**
    string - The suggested movie genre
};

function suggestMovieName1(string genre, int i) returns string|error => natural {
    **Assumption**
    Think yourself as a movie expert

    **What to do**
    Suggest a movie name matching to the genre given:
    ${genre}

    **Output**
    string - The suggested movie name
};

function suggestMovieName2() returns string|error => natural {
    **Assumption**
    Think yourself as a movie expert

    **What to do**
    Suggest a movie name

    **Output**
    string - The suggested movie name
};

function rateMovie(string movieName) returns int|error => natural {
    **Assumption**
    Think yourself as a movie expert

    **What to do**
    Give rating for the movie ${movieName} out of 10 based on your opinion

    **Output**
    int - number between 1 and 10 as the rating
};

