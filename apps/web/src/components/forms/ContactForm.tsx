import { FormField } from "@/components/FormField";
import { FormSection } from "@/components/FormSection";
import { FORM_CONTENT } from "@/lib/constants";

export function ContactForm() {
  const { title, description, fields } = FORM_CONTENT.CONTACT;

  return (
    <FormSection title={title} description={description}>
      {/* Name Fields Row */}
      <div className="flex gap-4 w-full h-16">
        <FormField 
          id="firstName"
          label={fields.firstName.label}
          placeholder={fields.firstName.placeholder}
          className="flex-1"
        />
        <FormField 
          id="lastName"
          label={fields.lastName.label}
          placeholder={fields.lastName.placeholder}
          className="flex-1"
        />
      </div>

      {/* Email Field */}
      <FormField 
        id="email"
        label={fields.email.label}
        placeholder={fields.email.placeholder}
        type={fields.email.type}
        className="w-full h-16"
      />

      {/* Phone Field */}
      <FormField 
        id="phone"
        label={fields.phone.label}
        placeholder={fields.phone.placeholder}
        type={fields.phone.type}
        className="w-full h-16"
      />

      {/* Street Address */}
      <FormField 
        id="street"
        label={fields.street.label}
        placeholder={fields.street.placeholder}
        className="w-full h-16"
      />

      {/* Location Fields Row */}
      <div className="flex gap-4 w-full h-16">
        <FormField 
          id="city"
          label={fields.city.label}
          placeholder={fields.city.placeholder}
          className="flex-1"
        />
        <FormField 
          id="state"
          label={fields.state.label}
          placeholder={fields.state.placeholder}
          className="flex-1"
        />
        <FormField 
          id="zip"
          label={fields.zip.label}
          placeholder={fields.zip.placeholder}
          className="flex-1"
        />
      </div>
    </FormSection>
  );
} 