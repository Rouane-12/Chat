import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const withoutAuth = (WrappedComponent) => {
    return (props) => {
        const navigate = useNavigate();
        const token = localStorage.getItem("token");

        useEffect(() => {
            if (token) {
                navigate("/messagerie");
            }
        }, [token, navigate]);

        if (token) return null;

        return <WrappedComponent {...props} />;
    };
};

export default withoutAuth;
