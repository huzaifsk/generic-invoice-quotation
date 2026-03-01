
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { AppContextType } from '../types';

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
