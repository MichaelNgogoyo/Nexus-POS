import {useMemo} from "react";
import ReportsComponent from "../../components/sales/ReportsComponent";
import {useKeycloak} from "@react-keycloak/web";

function Reports() {
    const {keycloak} = useKeycloak();

    const operator = useMemo(() => {
        return keycloak?.tokenParsed?.preferred_username || "Operator";
    }, [keycloak]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-text-primary">Reports & Analysis</h1>
                <p className="text-text-secondary">
                    Monitor revenue trends, product performance, and transaction health across your POS operations.
                </p>
                <div className="card px-4 py-2 w-fit text-sm text-text-secondary">
                    Viewing as: <span className="font-semibold text-text-primary">{operator}</span>
                </div>
            </div>

            <ReportsComponent/>
        </div>
    );
}

export default Reports;
