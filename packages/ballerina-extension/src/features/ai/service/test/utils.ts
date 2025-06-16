import { ProjectSource, Diagnostic } from "./test";

// ==============================================
//            UTILITY FUNCTIONS
// ==============================================

export function extractCodeFromResponse(testCode: string): string {
    const matches = testCode.split("```ballerina\n");
    if (matches.length > 1) {
        const codeParts = matches[1].split("\n```");
        if (codeParts.length > 0) {
            return codeParts[0];
        }
        throw new Error("No code found between the delimiters.");
    }
    throw new Error("No Ballerina code block found in the content.");
}

export function extractConfigFromResponse(response: string): string | undefined {
    const configMatches = response.split("```toml\n");
    if (configMatches.length > 1) {
        const configParts = configMatches[1].split("\n```");
        if (configParts.length > 0) {
            return configParts[0];
        }
    }
    return undefined;
}

export function flattenProjectToText(projectSource: ProjectSource): string {
    let flattenedProject = "";

    const modules = projectSource.projectModules;
    if (modules) {
        for (const module of modules) {
            let moduleSource = "";
            for (const sourceFile of module.sourceFiles) {
                moduleSource += `\`\`\`ballerina
# modules/${module.moduleName}/${sourceFile.fileName}

${sourceFile.content}
\`\`\`

`;
            }
            flattenedProject += moduleSource;
        }
    }
    
    for (const sourceFile of projectSource.sourceFiles) {
        flattenedProject += `\`\`\`ballerina
# ${sourceFile.fileName}

${sourceFile.content}
\`\`\`

`;
    }
    
    return flattenedProject;
}

export function getExternalTypesAsJsonSchema(openApiSpec: string): string {
    try {
        const externalTypes: Record<string, any> = {};

        const openApiSpecObj = JSON.parse(openApiSpec);
        const components = openApiSpecObj.components;
        
        if (components && components.schemas) {
            for (const componentName in components.schemas) {
                const componentSchema = components.schemas[componentName];
                if (componentSchema && componentSchema['x-ballerina-type'] !== undefined) {
                    externalTypes[componentName] = componentSchema;
                }
            }
        }

        return JSON.stringify(externalTypes);
    } catch (error) {
        // Return empty object if parsing fails
        return "{}";
    }
}

export function getTypesAsJsonSchema(openApiSpec: string): string {
    try {
        const openApiSpecObj = JSON.parse(openApiSpec);
        const components = openApiSpecObj.components;
        
        if (components) {
            return JSON.stringify(components);
        }

        return "{}";
    } catch (error) {
        // Return empty object if parsing fails
        return "{}";
    }
}

export function getDiagnosticsAsText(diagnostics: Diagnostic[]): string {
    let flattenedDiagnostics = "";

    for (const diagnostic of diagnostics) {
        flattenedDiagnostics += `- Message: ${diagnostic.message}

`;
    }
    
    return flattenedDiagnostics;
}

export function extractSectionToFix(existingTests: string): string {
    const marker = "// >>>>>>>>>>>>>>TEST CASES NEED TO BE FIXED <<<<<<<<<<<<<<<";
    const index = existingTests.indexOf(marker);
    if (index !== -1) {
        return existingTests.substring(index + marker.length);
    }
    return "";
}
