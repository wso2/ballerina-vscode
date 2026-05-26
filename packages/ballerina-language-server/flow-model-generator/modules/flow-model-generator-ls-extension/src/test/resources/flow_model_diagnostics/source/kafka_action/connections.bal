import ballerinax/kafka;

final kafka:Consumer kafkaConsumer = check new ("localhost:9090", autoCommit = false, checkCRCS = false, excludeInternalTopics = false, decoupleProcessing = false, validation = false, autoSeekOnValidationFailure = false);
