export const INTEGRATION_CONFIGS = {
    mulesoft: {
        title: "MuleSoft",
        parameters: [
            {
                key: "keepStructure",
                label: "Preserve Original Process Flow",
                type: "boolean" as const,
                defaultValue: false,
            },
            {
                key: "multiRoot",
                label: "Treat each Directory as a Separate Project",
                type: "boolean" as const,
                defaultValue: false,
            },
        ],
    },
    tibco: {
        title: "TIBCO",
        parameters: [
            {
                key: "keepStructure",
                label: "Preserve Original Process Flow",
                type: "boolean" as const,
                defaultValue: false,
            },
            {
                key: "multiRoot",
                label: "Treat each Directory as a Separate Project",
                type: "boolean" as const,
                defaultValue: false,
            },
        ],
    },
    "logic-apps": {
        title: "Logic Apps",
        parameters: [
            {
                key: "keepStructure",
                label: "Preserve Original Process Flow",
                type: "boolean" as const,
                defaultValue: false,
            },
            {
                key: "multiRoot",
                label: "Treat each Directory as a Separate Project",
                type: "boolean" as const,
                defaultValue: false,
            },
            {
                key: "prompt",
                label: "Describe the Logic App for AI Conversion",
                type: "string" as const,
                defaultValue: "",
            },
        ],
    },
} as const;
