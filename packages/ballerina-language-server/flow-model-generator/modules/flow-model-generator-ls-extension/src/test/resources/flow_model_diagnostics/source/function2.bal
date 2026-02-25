import ballerina/file;
function foo() {
        string[] data = getCSVFiles("");

}
function getCSVFiles(string directoryPath) returns string[]|error {
    file:MetaData[] & readonly fileList = check file:readDir(string `${directoryPath}`);
    string[] csvFiles = [];
    foreach file:MetaData & readonly fileMetaData in fileList {
        string filePath = fileMetaData.absPath;
        if filePath.endsWith("csv") {
            csvFiles.push(filePath);
        }
    }
    return csvFiles;
}