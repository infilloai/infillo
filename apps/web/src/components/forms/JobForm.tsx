import { FormField } from "@/components/FormField";
import { FormSection } from "@/components/FormSection";
import { FORM_CONTENT } from "@/lib/constants";

export function JobForm() {
  const { title, description, fields } = FORM_CONTENT.JOB;

  return (
    <FormSection title={title} description={description}>
      {/* Position Information */}
      <div className="flex gap-4 w-full">
        <FormField
          id="position"
          label={fields.position.label}
          placeholder={fields.position.placeholder}
          className="flex-1"
        />
        <FormField
          id="company"
          label={fields.company.label}
          placeholder={fields.company.placeholder}
          className="flex-1"
        />
      </div>

      {/* Experience and Salary */}
      <div className="flex gap-4 w-full">
        <FormField
          id="experience"
          label={fields.experience.label}
          placeholder={fields.experience.placeholder}
          type={fields.experience.type}
          className="flex-1"
        />
        <FormField
          id="salary"
          label={fields.salary.label}
          placeholder={fields.salary.placeholder}
          className="flex-1"
        />
      </div>

      {/* Current Position and Skills */}
      <FormField
        id="currentPosition"
        label={fields.currentPosition.label}
        placeholder={fields.currentPosition.placeholder}
        className="w-full"
      />

      <FormField
        id="skills"
        label={fields.skills.label}
        placeholder={fields.skills.placeholder}
        className="w-full"
      />

      {/* Cover Letter */}
      <FormField
        id="coverLetter"
        label={fields.coverLetter.label}
        placeholder={fields.coverLetter.placeholder}
        type={fields.coverLetter.type}
        rows={fields.coverLetter.rows}
        className="w-full"
      />

      {/* Motivation */}
      <FormField
        id="motivation"
        label={fields.motivation.label}
        placeholder={fields.motivation.placeholder}
        type={fields.motivation.type}
        rows={fields.motivation.rows}
        className="w-full"
      />

      {/* Work Details */}
      <div className="flex gap-4 w-full">
        <FormField
          id="availability"
          label={fields.availability.label}
          placeholder={fields.availability.placeholder}
          type={fields.availability.type}
          className="flex-1"
        />
        <FormField
          id="workType"
          label={fields.workType.label}
          placeholder={fields.workType.placeholder}
          type={fields.workType.type}
          options={Array.from(fields.workType.options)}
          className="flex-1"
        />
      </div>

      {/* Resume Upload */}
      <FormField
        id="resume"
        label={fields.resume.label}
        placeholder={fields.resume.placeholder}
        type={fields.resume.type}
        accept={fields.resume.accept}
        className="w-full"
      />
    </FormSection>
  );
} 