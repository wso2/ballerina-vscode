import ballerina/graphql;

public type CovidEntry record {|
    readonly string isoCode;
    string country;
    decimal active?;
|};

table<CovidEntry> key(isoCode) covidEntriesTable = table [
    {isoCode: "AFG", country: "Afghanistan", active: 5833}
];

service /config on new graphql:Listener(9000) {
    resource function get all() returns CovidData[] {
        CovidEntry[] covidEntries = covidEntriesTable.toArray().cloneReadOnly();
        return covidEntries.map(entry => new CovidData(entry));
    }

    resource function get filter(string isoCode) returns CovidData? {
        CovidEntry? covidEntry = covidEntriesTable[isoCode];
        if covidEntry is CovidEntry {
            return new (covidEntry);
        }
        return;
    }

    remote function add(CovidEntry entry) returns CovidData {
        covidEntriesTable.add(entry);
        return new CovidData(entry);
    }
}

public distinct service class CovidData {
    private final readonly & CovidEntry entryRecord;

    function init(CovidEntry entryRecord) {
        self.entryRecord = entryRecord.cloneReadOnly();
    }

    resource function get isoCode() returns string {
        return self.entryRecord.isoCode;
    }

    resource function get country() returns string {
        return self.entryRecord.country;
    }

    resource function get active() returns decimal? {
        if self.entryRecord.active is decimal {
            return self.entryRecord.active / 1000;
        }
        return;
    }
}

string x = "";




