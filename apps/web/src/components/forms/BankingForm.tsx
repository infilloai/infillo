import { FormField } from "@/components/FormField";
import { FormSection } from "@/components/FormSection";
import { FORM_CONTENT } from "@/lib/constants";

export function BankingForm() {
  const { title, description, fields } = FORM_CONTENT.BANKING;

  return (
    <FormSection title={title} description={description}>
      {/* Bank Name and Account Type Row */}
      <div className="flex gap-4 w-full h-16">
        <FormField 
          id="bankName"
          label={fields.bankName.label}
          placeholder={fields.bankName.placeholder}
          className="flex-1"
        />
        <FormField 
          id="accountType"
          label={fields.accountType.label}
          placeholder={fields.accountType.placeholder}
          className="flex-1"
        />
      </div>

      {/* Account Number Field */}
      <FormField 
        id="accountNumber"
        label={fields.accountNumber.label}
        placeholder={fields.accountNumber.placeholder}
        className="w-full h-16"
      />

      {/* Routing Number Field */}
      <FormField 
        id="routingNumber"
        label={fields.routingNumber.label}
        placeholder={fields.routingNumber.placeholder}
        className="w-full h-16"
      />

      {/* Account Holder and Branch Row */}
      <div className="flex gap-4 w-full h-16">
        <FormField 
          id="accountHolder"
          label={fields.accountHolder.label}
          placeholder={fields.accountHolder.placeholder}
          className="flex-1"
        />
        <FormField 
          id="branch"
          label={fields.branch.label}
          placeholder={fields.branch.placeholder}
          className="flex-1"
        />
      </div>
    </FormSection>
  );
}
