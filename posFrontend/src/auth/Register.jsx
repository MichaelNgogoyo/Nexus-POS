import { Link } from 'react-router-dom';
import { ROUTES } from '../routes.js';

function Register() {
    return (
        <main className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
            <section className="card p-8 w-full max-w-md text-center" aria-labelledby="registration-title">
                <h1 id="registration-title" className="text-2xl font-bold mb-3 text-text-primary">Staff accounts are managed by your administrator</h1>
                <p className="text-text-secondary mb-6">Self-registration is disabled for this restaurant. Ask a manager to create your Keycloak account and assign the right POS role.</p>
                <Link to={ROUTES.LOGIN} className="btn-primary inline-flex justify-center w-full">Return to sign in</Link>
            </section>
        </main>
    );
}

export default Register;
