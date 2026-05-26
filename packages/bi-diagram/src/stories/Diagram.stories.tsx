import React from "react";
import { Story, Meta } from "@storybook/react/types-6-0";
import { Diagram, DiagramProps } from "../components/Diagram";

import model1 from "./1-start.json";

export default {
    title: "BI/Diagram",
    component: Diagram,
} as Meta;

const Template: Story<DiagramProps> = (args: JSX.IntrinsicAttributes & DiagramProps) => <Diagram {...args} />;

export const Start = Template.bind({});
Start.args = {
    model: model1,
};
