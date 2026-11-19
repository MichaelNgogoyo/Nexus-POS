import LocalAtmRoundedIcon from '@mui/icons-material/LocalAtmRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import PhoneAndroidRoundedIcon from '@mui/icons-material/PhoneAndroidRounded';

export default function PaymentMethodAvailability() {
  return (
    <div className="payment-method-options" role="group" aria-label="Payment method availability">
      <div className="payment-method-option is-available">
        <LocalAtmRoundedIcon aria-hidden="true" />
        <span>Cash<small>Available</small></span>
      </div>
      <div className="payment-method-option is-unavailable" aria-label="Card unavailable: provider setup required">
        <CreditCardRoundedIcon aria-hidden="true" />
        <span>Card<small>Provider setup required</small></span>
      </div>
      <div className="payment-method-option is-unavailable" aria-label="M-Pesa unavailable: Daraja setup required">
        <PhoneAndroidRoundedIcon aria-hidden="true" />
        <span>M-Pesa<small>Daraja setup required</small></span>
      </div>
    </div>
  );
}
