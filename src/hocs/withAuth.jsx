import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const withAuth = (WrappedComponent) => {
    return (props) => {
        const navigate = useNavigate();
        const token = localStorage.getItem("token");

        useEffect(() => {
            if (!token) {
                navigate("/");
            }
        }, [token, navigate]);

        if (!token) return null;

        return <WrappedComponent {...props} />;
    };
};

export default withAuth;
