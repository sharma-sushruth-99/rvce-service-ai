
import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="theme-toggle flex items-center justify-between px-5 py-4">
      <span className="text-sm">Dark theme</span>
      <label className="switch relative inline-block w-12 h-6">
        <input 
          type="checkbox" 
          className="opacity-0 w-0 h-0"
          checked={theme === 'dark'}
          onChange={toggleTheme}
        />
        <span className="slider absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 dark:bg-gray-700 transition duration-400 rounded-full">
            <span className={`absolute content-[''] h-5 w-5 left-0.5 bottom-0.5 bg-white transition duration-400 rounded-full ${theme === 'dark' ? 'transform translate-x-6' : ''}`}></span>
        </span>
      </label>
    </div>
  );
};

export default ThemeToggle;