import TransactionsComponent from "../../components/sales/TransactionsComponent.jsx";

export default function Transactions() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-3xl font-bold text-text-primary">Transactions</h1>
                <p className="text-text-secondary mt-1">View and manage all completed sales transactions.</p>
            </div>
            <TransactionsComponent />
        </div>
    );
}
