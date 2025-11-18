import { DevantScopes } from "@wso2/wso2-platform-core";

const INTEGRATION_API_MODULES = ["http", "graphql", "tcp"];
const EVENT_INTEGRATION_MODULES = ["kafka", "rabbitmq", "salesforce", "trigger.github", "mqtt", "asb"];
const FILE_INTEGRATION_MODULES = ["ftp", "file"];
const AI_AGENT_MODULE = "ai";

export function findDevantScopeByModule(moduleName: string): DevantScopes | undefined {
    if (AI_AGENT_MODULE === moduleName) {
        return DevantScopes.AI_AGENT;
    } else if (INTEGRATION_API_MODULES.includes(moduleName)) {
        return DevantScopes.INTEGRATION_AS_API;
    } else if (EVENT_INTEGRATION_MODULES.includes(moduleName)) {
        return DevantScopes.EVENT_INTEGRATION;
    } else if (FILE_INTEGRATION_MODULES.includes(moduleName)) {
        return DevantScopes.FILE_INTEGRATION;
    }
}