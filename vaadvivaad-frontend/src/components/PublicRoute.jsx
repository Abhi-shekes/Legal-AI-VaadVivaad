import React from 'react';
import useAuthStore from '../store/authStore';
import { Navigate } from "react-router-dom";

const PublicRoute = ({ children }) => {
    const { isLoggedIn } = useAuthStore((state) => state);

    // If logged in, redirect to dashboard. Otherwise, render children (auth page).
    return (
        <>
            {isLoggedIn ? <Navigate to='/user/dashboard' replace /> : children}
        </>
    );
};

export default PublicRoute;
