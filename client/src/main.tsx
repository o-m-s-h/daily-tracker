import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import './analytics.css';
import './polish.css';
import { ThemeProvider } from './context/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider></React.StrictMode>);
