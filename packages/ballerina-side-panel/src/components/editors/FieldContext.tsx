import React, { createContext, useContext, useState, ReactNode } from "react";
import { FormField } from "../Form/types";

type FieldContextType = {
    field: FormField | null;
    setField: (field: FormField) => void;
};

const FieldContext = createContext<FieldContextType | undefined>(undefined);

export const useFieldContext = () => {
    const context = useContext(FieldContext);
    if (!context) {
        throw new Error("useFieldContext must be used within a FieldProvider");
    }
    return context;
};

export const FieldProvider = ({ children, initialField }: { children: ReactNode; initialField?: FormField }) => {
    const [field, setField] = useState<FormField | null>(initialField ?? null);

    return (
        <FieldContext.Provider value={{ field, setField }}>
            {children}
        </FieldContext.Provider>
    );
};