import React from "react";
import { Story, Meta } from "@storybook/react/types-6-0";
import { Diagram, DiagramProps } from "../components/Diagram";

import model1 from "./1-start.json";
import model2 from "./2-no-cons.json";
import model3 from "./3-no-service.json";
import model4 from "./4-sample.json";
import model5 from "./5-sample.json";

export default {
    title: "BI/Component Diagram",
    component: Diagram,
} as Meta;

const Template: Story<DiagramProps> = (args: JSX.IntrinsicAttributes & DiagramProps) => <Diagram {...args} />;

export const Empty = Template.bind({});
Empty.args = {
    project: { name: "", entryPoints: [], connections: [] },
};

export const Sample = Template.bind({});
Sample.args = {
    project: model1,
};

export const NoConnections = Template.bind({});
NoConnections.args = {
    project: model2,
};

export const NoServices = Template.bind({});
NoServices.args = {
    project: model3,
};

export const Sample2 = Template.bind({});
Sample2.args = {
    project: model4,
};

export const Sample3 = Template.bind({});
Sample3.args = {
    project: model5,
};
