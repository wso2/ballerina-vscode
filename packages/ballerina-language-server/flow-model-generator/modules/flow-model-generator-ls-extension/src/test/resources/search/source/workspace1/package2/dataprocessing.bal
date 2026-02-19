# Data Processing Functions

# Filters an array of integers based on a condition
#
# + values - Array of integers to filter
# + threshold - Threshold value
# + return - Array of values greater than threshold
public function filterGreaterThan(int[] values, int threshold) returns int[] {
    int[] result = [];
    foreach var val in values {
        if val > threshold {
            result.push(val);
        }
    }
    return result;
}

# Computes the average of an array of integers
#
# + values - Array of integers
# + return - Average value as a float
public function computeAverage(int[] values) returns float {
    if values.length() == 0 {
        return 0.0;
    }
    int sum = 0;
    foreach var val in values {
        sum += val;
    }
    return <float>sum / <float>values.length();
}

# Sorts an array in ascending order
#
# + values - Array to sort
# + return - Sorted array
public function sortArray(int[] values) returns int[] {
    int[] sorted = values.clone();
    int n = sorted.length();
    int i = 0;
    while i < n {
        int j = 0;
        while j < n - i - 1 {
            if sorted[j] > sorted[j + 1] {
                int temp = sorted[j];
                sorted[j] = sorted[j + 1];
                sorted[j + 1] = temp;
            }
            j = j + 1;
        }
        i = i + 1;
    }
    return sorted;
}
