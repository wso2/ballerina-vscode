import ballerina/mcp;

listener mcp:Listener mcpListener = check new (9090);

@mcp:ServiceConfig {
    info: {
        name: "MCP Weather Server",
        version: "1.0.0"
    },
    sessionMode: mcp:AUTO
}
service mcp:Service /mcp on mcpListener {
    @mcp:Tool {
        description: string `
            **Description**: Get current weather conditions for a location
            **Parameters**:
            - location (string, required): City name or coordinates (e.g., "London", "40.7128,-74.0060")
            `
    }
    remote function getCurrentWeather(string city) returns Weather|error {
        Weather weather = {condition: "", temperature: 0, humidity: 0, location: "", pressure: 0, timestamp: ""};
        return weather;
    };

    # Get weather forecast for upcoming days
    #
    # + location - City name or coordinates (e.g., "London", "40.7128,-74.0060")
    # + days - Number of days to forecast (1-7)
    # + return - Weather forecast for the specified location and days
    remote function getWeatherForecast(string location, int days) returns WeatherForecast|error {
        WeatherForecast forecast = {
            "location": location,
            "forecast": []
        };
        return forecast;
    }
}

type Weather record {|
    string location;
    decimal temperature;
    int humidity;
    int pressure;
    string condition;
    string timestamp;
|};

type ForecastItem record {|
    string date;
    int high;
    int low;
    string condition;
    int precipitation_chance;
    int wind_speed;
|};

type WeatherForecast record {|
    string location;
    ForecastItem[] forecast;
|};
