public function main() {
    string message = formatMessage("Hello", "World");
    string upper = toUpperCase(message);
    string _ = reverseString(upper);
}

# Formats a message with two parts
#
# + part1 - First part of the message
# + part2 - Second part of the message
# + return - Formatted message
public function formatMessage(string part1, string part2) returns string {
    return part1 + " " + part2;
}

# Converts a string to uppercase
#
# + text - Input text
# + return - Uppercase version of the input
public function toUpperCase(string text) returns string {
    return text.toUpperAscii();
}

# Reverses a string
#
# + text - Input text
# + return - Reversed version of the input
public function reverseString(string text) returns string {
    string reversed = "";
    int length = text.length();
    int i = length - 1;
    while i >= 0 {
        reversed += text[i];
        i = i - 1;
    }
    return reversed;
}

# Represents a physical address
public type Address record {|
    string street;
    string city;
|};
