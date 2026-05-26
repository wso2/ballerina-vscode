# Define a closed record type named `Address`. The `{|` and `|}` delimiters indicate that this record type
# allows mapping values, which contain only the described fields.
#
# + number - Parameter Description  
# + country - Parameter Description  
public type Address record {|
    string number;
    string city;
    string country;
|};
