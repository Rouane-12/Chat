import { Field, ErrorMessage, Formik } from "formik";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import withoutAuth from "../hocs/withoutAuth";

const validationSchema = Yup.object().shape({
    email: Yup.string().email("Email invalide").required("Champ requis"),
    password: Yup.string().min(6, "Min 6 caractères").required("Champ requis"),
});

function Login() {
    const navigate = useNavigate();

    const handleLogin = async (values, { setSubmitting }) => {
        try {
            const response = await axios.post(
                "https://beautyswap-back.vercel.app/api/auth/login",
                values
            );

            alert("Connexion réussie !");
            const { token } = response.data;

            localStorage.setItem("token", token);

            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

            const userResponse = await axios.get("https://beautyswap-back.vercel.app/api/user/me");
            localStorage.setItem("user", JSON.stringify(userResponse.data));

            navigate("/conversations");
        } catch (error) {
            console.error("Login error:", error);
            alert("Erreur de connexion. Vérifiez vos identifiants.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="login-background"
            style={{ backgroundImage: "url(/banner1.png)" }}
        >
            <div className="login-container">
                <h1 className="title">BeautySwapp</h1>

                <div className="form-card">
                    <h2 className="subtitle">Se connecter</h2>

                    <Formik
                        initialValues={{ email: "", password: "" }}
                        validationSchema={validationSchema}
                        onSubmit={handleLogin}
                    >
                        {({ handleSubmit, isSubmitting }) => (
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <Field
                                        name="email"
                                        type="email"
                                        placeholder="Adresse email"
                                        className="input"
                                    />
                                    <ErrorMessage
                                        name="email"
                                        component="div"
                                        className="error"
                                    />
                                </div>

                                <div className="form-group">
                                    <Field
                                        name="password"
                                        type="password"
                                        placeholder="Mot de passe"
                                        className="input"
                                    />
                                    <ErrorMessage
                                        name="password"
                                        component="div"
                                        className="error"
                                    />
                                </div>

                                <button type="submit" className="button" disabled={isSubmitting}>
                                    {isSubmitting ? "Connexion..." : "Envoyer"}
                                </button>
                            </form>
                        )}
                    </Formik>
                </div>
            </div>
        </div>
    );
}

export default withoutAuth(Login);
