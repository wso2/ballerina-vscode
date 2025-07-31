import { GenerationType } from "./libs";
import { jsonSchema } from "ai";
import { langClient } from "../../activator";
import { getGenerationMode } from "../utils";
import { Library } from "./libs_types";

export const LibraryProviderToolSchema = jsonSchema<{
    libraryNames: string[];
    libraries: Library[];
}>({
    type: "object",
    properties: {
        libraryNames: {
            type: "array",
            items: { type: "string" },
            description: "List of Ballerina library names to fetch details for",
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
    required: ["libraryNames"],
});

export async function LibraryProviderTool(
    params: { libraryNames: string[] },
    generationType: GenerationType
): Promise<Library[]> {
    try {
        const startTime = Date.now();
        const libraries = (await langClient.getCopilotFilteredLibraries({
            libNames: params.libraryNames,
            mode: getGenerationMode(generationType),
        })) as { libraries: Library[] };
        console.log(
            `[LibraryProviderTool] Fetched ${libraries.libraries.length} libraries: ${params.libraryNames.join(", ")}`
        );
        console.log(
            `[LibraryProviderTool] Called with ${params.libraryNames.length} libraries, took ${
                (Date.now() - startTime) / 1000
            }s`
        );
        return libraries.libraries;
    } catch (error) {
        console.error(`[LibraryProviderTool] Error fetching libraries: ${error}`);
        return [];
    }
}
