export const parameters = {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
        matchers: {
            color: /(background|color)$/i,
            date: /Date$/,
        },
    },
};

export const decorators = [
    (Story, context) => {
        if (context.globals.theme === "Dark_Theme") {
            import("../.storybook/darkTheme.css");
        } else if (context.globals.theme === "Light_Theme") {
            import("../.storybook/lightTheme.css");
        }
        import("@vscode/codicons/dist/codicon.css");
        return <Story />;
    },
];

export const globalTypes = {
    theme: {
        name: "Theme",
        description: "Global theme for components",
        defaultValue: "Light_Theme",
        toolbar: {
            icon: "circlehollow",
            items: ["Light_Theme", "Dark_Theme"],
        },
    },
};
