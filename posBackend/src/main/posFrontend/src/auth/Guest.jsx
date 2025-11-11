function GuestPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-md w-full">
                <h1 className="text-3xl font-bold mb-4 text-gray-800">Welcome Guest!</h1>
                <p className="text-gray-600 mb-6">
                    You're browsing as a guest. Some features may be limited.
                </p>

                <div className="flex flex-col space-y-4">
                    <button className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
                        View Products
                    </button>
                    <button className="bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 transition">
                        Continue as Guest
                    </button>
                    <a
                        href="/login"
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Already have an account? Login
                    </a>
                </div>
            </div>
        </div>
    );
}

export default GuestPage;
