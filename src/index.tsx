import React from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/main.css';
import './styles/app.scss';
import App from './App';

createRoot(document.getElementById('app')).render(<App />);
