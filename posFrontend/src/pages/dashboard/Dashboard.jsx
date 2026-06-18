import React from 'react';
import Stats from "../../components/dashboard/Stats.jsx";
import Charts from "../../components/dashboard/Charts.jsx";
import Tables from "../../components/dashboard/Tables.jsx";
import Modules from "../../components/dashboard/Modules.jsx";
import HealthScore from "../../components/dashboard/HealthScore.jsx";
import QuickActions from "../../components/dashboard/QuickActions.jsx";
import ActivityFeed from "../../components/dashboard/ActivityFeed.jsx";

const Dashboard = () => {
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Dashboard</h1>
            </div>

            {/* Command Center Row: Health Score + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <HealthScore />
                </div>
                <div className="lg:col-span-2">
                    <QuickActions />
                </div>
            </div>

            <Stats />
            <Charts />

            {/* Activity Feed alongside Tables */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <Tables />
                </div>
                <div className="xl:col-span-1">
                    <ActivityFeed />
                </div>
            </div>

            <Modules />
        </div>
    );
};

export default Dashboard;
