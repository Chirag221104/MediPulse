import React, { createContext, useContext, useState } from 'react';

interface PatientContextType {
    activePatientId: string | null;
    setActivePatientId: (id: string | null) => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activePatientId, setActivePatientId] = useState<string | null>(null);

    return (
        <PatientContext.Provider value={{ activePatientId, setActivePatientId }}>
            {children}
        </PatientContext.Provider>
    );
};

export const usePatientContext = () => {
    const context = useContext(PatientContext);
    if (!context) throw new Error('usePatientContext must be used within PatientProvider');
    return context;
};
