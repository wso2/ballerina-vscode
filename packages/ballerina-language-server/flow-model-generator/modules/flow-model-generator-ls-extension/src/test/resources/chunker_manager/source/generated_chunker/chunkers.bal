import ballerina/ai;
import ballerinax/ai.devant;

devant:Chunker devantChunker = check new ("service-url", "access-token");
ai:GenericRecursiveChunker genericChunker = new;
ai:MarkdownChunker mdChunker = new;
