import ballerina/ai;
import ballerinax/ai.devant;

devant:BinaryDataLoader binaryLoader = new ("./source/");
ai:TextDataLoader textLoader = new ("./source/");
