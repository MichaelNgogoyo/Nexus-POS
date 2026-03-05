import CheckoutComponent from "../../components/sales/CheckoutComponent.jsx";

export default function Checkout() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-3xl font-bold text-text-primary">Checkout</h1>
                <p className="text-text-secondary mt-1">Add products to the cart and process a sale.</p>
            </div>
            <CheckoutComponent />
        </div>
    );
}
