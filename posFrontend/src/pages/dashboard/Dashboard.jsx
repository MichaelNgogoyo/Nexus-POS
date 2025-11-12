import React from 'react';
import Stats from "../../components/dashboard/Stats.jsx";
import Charts from "../../components/dashboard/Charts.jsx";
import Tables from "../../components/dashboard/Tables.jsx";
import Modules from "../../components/dashboard/Modules.jsx";

const Dashboard = () => {
    return (
        <div className="p-4 md:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            <Stats />
            <Charts />
            <Tables />
            <Modules />
        </div>
    );
};

export default Dashboard;
