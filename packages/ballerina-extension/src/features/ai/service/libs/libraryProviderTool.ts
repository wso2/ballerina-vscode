import { tool } from "ai";
import { GenerationType } from "./libs";
import { jsonSchema } from "ai";
import { Library } from "./libs_types";
import { selectRequiredFunctions } from "./funcs";

const LibraryProviderToolSchema = jsonSchema<{
    libraryNames: string[];
    userPrompt: string;
    libraries: Library[];
}>({
    type: "object",
    properties: {
        libraryNames: {
            type: "array",
            items: { type: "string" },
            description: "List of Ballerina library names to fetch details for",
        },
        userPrompt: {
            type: "string",
            description: "User query to determine relevant functions and types",
        },
        libraries: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    typeDefs: { type: "array", items: { type: "object" } },
                    clients: { type: "array", items: { type: "object" } },
                    functions: { type: "array", items: { type: "object" } },
                    services: { type: "array", items: { type: "object" } },
                },
                required: ["name", "description", "typeDefs", "clients"],
            },
            description: "Retrieved library details",
        },
    },
    required: ["libraryNames", "userPrompt"],
});

export async function LibraryProviderTool(
    params: { libraryNames: string[]; userPrompt: string },
    generationType: GenerationType
): Promise<Library[]> {
    try {
        const startTime = Date.now();
        const libraries = await selectRequiredFunctions(params.userPrompt, params.libraryNames, generationType);
        console.log(
            `[LibraryProviderTool] Fetched ${libraries.length} libraries: ${libraries
                .map((lib) => lib.name)
                .join(", ")}, took ${(Date.now() - startTime) / 1000}s`
        );
        return libraries;
    } catch (error) {
        console.error(`[LibraryProviderTool] Error fetching libraries: ${error}`);
        return [];
    }
}

export function getLibraryProviderTool(libraryDescriptions: string, generationType: GenerationType) {
    return tool({
        description: `Fetches detailed information about Ballerina libraries, including clients, functions, and types.
This tool analyzes a user query and returns **only the relevant** clients, functions, and types from the selected Ballerina libraries based on the provided user prompt.

Before calling this tool:
- **Review all library descriptions** below.
- Select only the libraries that might be needed to fulfill the user query.

Available libraries:
${libraryDescriptions}`,
        parameters: LibraryProviderToolSchema,
        execute: async (input: { libraryNames: string[]; userPrompt: string }) => {
            console.log(
                `[LibraryProviderTool] Called with ${input.libraryNames.length} libraries: ${input.libraryNames.join(
                    ", "
                )} and prompt: ${input.userPrompt}`
            );
            return await LibraryProviderTool(input, generationType);
        },
    });
}
