import { useState } from 'react';
import axios from 'axios';
import {Link, useLocation, useNavigate} from "react-router-dom";
import {ROUTES} from "../routes.js";

function Register() {

    const navigate = useNavigate();
    const location = useLocation();

    // Get path user tried to access before redirect to /login
    const redirectTo = location.state?.from || '/';
    const [form, setForm] = useState({
        username: '',
        password: '',
        email: '',
    });

    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        try {
            await axios.post('/api/register', form);

            await axios.post('/api/auth/login',
                new URLSearchParams({
                    username: form.username,
                    password: form.password,
                }),{
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    withCredentials: true,
                });

            navigate(redirectTo, { replace: true });
        } catch (error) {
            console.log(error);
            setMessage('Registration failed. Try a different username.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
            <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Register</h2>

                {message && (
                    <div className="mb-4 text-sm text-center text-green-600">{message}</div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Username</label>
                        <input
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition"
                    >
                        Register
                    </button>
                    <div className="flex justify-between">
                        <span className="">Already have an account?</span>
                        <Link className="text-blue-500 font-semibold" to={ROUTES.LOGIN}> Log in </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Register;
