import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import AuthCallbackPage from './pages/AuthCallbackPage.tsx';
import GoogleCompleteRegistrationPage from './pages/GoogleCompleteRegistrationPage.tsx';
import HomePage from './pages/HomePage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import RoomDetailPage from './pages/RoomDetailPage.tsx';
import WorkInstructionPage from './pages/WorkInstructionPage.tsx';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: '/auth/callback',
        element: <AuthCallbackPage />,
      },
      {
        path: '/complete-google-registration',
        element: <GoogleCompleteRegistrationPage />,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
      {
        path: '/room/:id',
        element: <RoomDetailPage />,
      },
      {
        path: '/room/:id/work-instruction',
        element: <WorkInstructionPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
);