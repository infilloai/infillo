import { FormField } from "@/components/FormField";
import { FormSection } from "@/components/FormSection";
import { FORM_CONTENT } from "@/lib/constants";

export function ShippingForm() {
  const { title, description, fields } = FORM_CONTENT.SHIPPING;

  return (
    <FormSection title={title} description={description}>
      {/* Full Name and Company Row */}
      <div className="flex gap-4 w-full h-16">
        <FormField 
          id="fullName"
          label={fields.fullName.label}
          placeholder={fields.fullName.placeholder}
          className="flex-1"
        />
        <FormField 
          id="companyName"
          label={fields.companyName.label}
          placeholder={fields.companyName.placeholder}
          className="flex-1"
        />
      </div>

      {/* Street Address Field */}
      <FormField 
        id="shippingAddress"
        label={fields.shippingAddress.label}
        placeholder={fields.shippingAddress.placeholder}
        className="w-full h-16"
      />

      {/* Apartment Field */}
      <FormField 
        id="apartment"
        label={fields.apartment.label}
        placeholder={fields.apartment.placeholder}
        className="w-full h-16"
      />

      {/* City, State, ZIP Row */}
      <div className="flex gap-4 w-full h-16">
        <FormField 
          id="shippingCity"
          label={fields.shippingCity.label}
          placeholder={fields.shippingCity.placeholder}
          className="flex-1"
        />
        <FormField 
          id="shippingState"
          label={fields.shippingState.label}
          placeholder={fields.shippingState.placeholder}
          className="flex-1"
        />
        <FormField 
          id="shippingZip"
          label={fields.shippingZip.label}
          placeholder={fields.shippingZip.placeholder}
          className="flex-1"
        />
      </div>

      {/* Phone and Instructions Row */}
      <div className="flex gap-4 w-full h-16">
        <FormField 
          id="shippingPhone"
          label={fields.shippingPhone.label}
          placeholder={fields.shippingPhone.placeholder}
          type={fields.shippingPhone.type}
          className="flex-1"
        />
        <FormField 
          id="instructions"
          label={fields.instructions.label}
          placeholder={fields.instructions.placeholder}
          className="flex-1"
        />
      </div>
    </FormSection>
  );
} 