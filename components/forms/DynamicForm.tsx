"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/DatePicker";
import { X } from "lucide-react";
import { TemplateConfig, TemplateField } from "@/lib/template-registry";

interface DynamicFormProps {
  templateFamily: string;
  config: TemplateConfig;
}

// Helper function for client-side image compression
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const maxWidth = 800;
        const maxHeight = 800;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error("Canvas toBlob failed"));
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Build Zod schema from config
function buildSchema(config: TemplateConfig) {
  const schema: Record<string, any> = {
    primaryColor: z.string().min(1),
    scale: z.enum(["1", "2", "3"]),
    formats: z.array(z.enum(["png", "jpg", "webp", "pdf"])).min(1),
  };

  // Add ALL dynamic fields from config FIRST
  config.fields.forEach((field) => {
    if (field.type === "text") {
      // Text fields are required unless marked as optional
      if (field.optional) {
        // Optional fields can be empty strings (no min length requirement)
        schema[field.name] = z.string().max(field.maxLength || 100);
      } else {
        schema[field.name] = z.string().min(1, `${field.label} is required`).max(field.maxLength || 100);
      }
    } else if (field.type === "color") {
      schema[field.name] = z.string().min(1);
    } else if (field.type === "date") {
      schema[field.name] = z.date();
    } else if (field.type === "time") {
      schema[field.name] = z.string();
    } else if (field.type === "image") {
      schema[field.name] = z.instanceof(File).optional();
    }
  });

  // Don't add hardcoded fields if they're not in the config
  // These are only for backwards compatibility with old templates that explicitly have them

  // Find people field
  const peopleField = config.fields.find((f) => f.type === "people");
  if (peopleField) {
    const personSchema: Record<string, any> = {
      name: z.string().min(1).max(peopleField.fields?.find((f) => f.name === "name")?.maxLength || 40),
      role: z.string().min(1).max(peopleField.fields?.find((f) => f.name === "role")?.maxLength || 60),
      talkTitle: z.string().min(1).max(peopleField.fields?.find((f) => f.name === "talkTitle")?.maxLength || 120),
      headshot: z.instanceof(File).optional(),
    };
    schema.people = z.array(z.object(personSchema)).min(1);
  }

  return z.object(schema);
}

export default function DynamicForm({ templateFamily, config }: DynamicFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schema = buildSchema(config);
  type FormData = z.infer<typeof schema>;

  const peopleField = config.fields.find((f) => f.type === "people");
  const maxPeople = peopleField?.maxCount || 3;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onSubmit", // Only validate on submit, not on change/blur
    reValidateMode: "onSubmit",
    defaultValues: {
      primaryColor: config.fields.find((f) => f.name === "primaryColor")?.default || "#3D9DFF",
      scale: "1",
      formats: ["png"],
      // Set defaults for all dynamic fields (empty strings for text, so user must fill them)
      ...config.fields.reduce((acc, field) => {
        if (field.type === "text") {
          acc[field.name] = field.default || "";
        } else if (field.type === "color") {
          acc[field.name] = field.default || "#3D9DFF";
        } else if (field.type === "date") {
          acc[field.name] = new Date();
        } else if (field.type === "time") {
          acc[field.name] = field.default || "18:00";
        }
        return acc;
      }, {} as Record<string, any>),
      // No hardcoded defaults - all fields come from config
      // Only include people if the template has a people field
      ...(peopleField ? { people: [{ name: "", role: "", talkTitle: "", headshot: undefined }] } : {}),
    },
  });

  // Always call useFieldArray (React hooks rule), but only use it if people field exists
  const { fields, append, remove } = useFieldArray({
    control,
    name: "people",
  });
  
  // Ensure fields is always an array (safety check)
  const safeFields = Array.isArray(fields) ? fields : [];
  const canAddPerson = peopleField ? safeFields.length < maxPeople : false;

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("primaryColor", data.primaryColor);
      // Only append peopleCount if people field exists
      const peopleCount = peopleField && data.people ? data.people.length : 0;
      formData.append("peopleCount", peopleCount.toString());
      formData.append("scale", data.scale);
      data.formats.forEach((format: "png" | "jpg" | "webp" | "pdf") => {
        formData.append("formats", format);
      });
      
      // Append all dynamic text/date/time fields from config
      config.fields.forEach((field) => {
        if (field.type === "text") {
          const value = data[field.name as keyof FormData];
          // For optional fields, append even if empty. For required fields, value should exist.
          if (field.optional || value) {
            formData.append(field.name, (value as string) || "");
          }
        } else if (field.type === "date" && data[field.name as keyof FormData]) {
          const dateValue = data[field.name as keyof FormData] as Date;
          formData.append(field.name, dateValue.toISOString());
        } else if (field.type === "time" && data[field.name as keyof FormData]) {
          formData.append(field.name, data[field.name as keyof FormData] as string);
        }
      });
      
      formData.append("templateFamily", templateFamily);

      // Append standalone image fields (e.g., logo)
      config.fields
        .filter((f) => f.type === "image" && f.name !== "headshot")
        .forEach((field) => {
          const file = (data as any)[field.name] as File | undefined;
          if (file) {
            formData.append(field.name, file);
          }
        });

      // Append headshots (compress first if needed) - only if people field exists
      if (peopleField && data.people && Array.isArray(data.people)) {
        for (let index = 0; index < data.people.length; index++) {
        const person = data.people[index];
        let headshotFile = person.headshot;
        
        if (headshotFile && headshotFile.size > 2 * 1024 * 1024) {
          try {
            headshotFile = await compressImage(headshotFile);
          } catch {
            // Continue with original file if compression fails
          }
        }
        
        if (headshotFile) {
          formData.append(`headshot_${index}`, headshotFile);
        }
          formData.append(`person_${index}_name`, person.name);
          formData.append(`person_${index}_role`, person.role);
          formData.append(`person_${index}_talkTitle`, person.talkTitle);
        }
      }

      const response = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || "Submission failed";
        throw new Error(errorMessage);
      }

      const result = await response.json();
      router.push(`/results/${result.submissionId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit. Please try again.";
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
    // Find the first error and show which field it is
    const errorEntries = Object.entries(errors);
    if (errorEntries.length > 0) {
      const [fieldName, error] = errorEntries[0];
      const errorMessage = (error as any)?.message || "Validation error";
      const fieldLabel = config.fields.find(f => f.name === fieldName)?.label || fieldName;
      alert(`Validation error in "${fieldLabel}": ${errorMessage}`);
      console.error("Form validation errors:", errors);
    } else {
      alert("Validation error: Please check all required fields");
    }
  };

  const hasColorFields = config.fields.some((f) => f.type === "color");

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8">
      
      {/* Color Section - only when template has color fields in config */}
      {hasColorFields && (
        <Card>
          <CardHeader>
            <CardTitle>Color</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {config.fields
              .filter((f) => f.type === "color")
              .map((field) => (
                <div key={field.name}>
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    type="color"
                    defaultValue={field.default || "#3D9DFF"}
                    {...register(field.name as keyof FormData)}
                    className="h-10 w-full"
                  />
                  {errors[field.name as keyof typeof errors] && (
                    <p className="text-sm text-destructive mt-1">
                      {errors[field.name as keyof typeof errors]?.message as string}
                    </p>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Output Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="scale">Poster Scale</Label>
            <Select
              value={watch("scale")}
              onValueChange={(value) => setValue("scale", value as "1" | "2" | "3")}
            >
              <SelectTrigger id="scale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="3">3x</SelectItem>
              </SelectContent>
            </Select>
            {errors.scale && (
              <p className="text-sm text-destructive mt-1">
                {errors.scale.message as string}
              </p>
            )}
          </div>

          <div>
            <Label>Output Formats</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {(["png", "jpg", "webp", "pdf"] as const).map((format) => (
                <div key={format} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`format-${format}`}
                    checked={watch("formats").includes(format)}
                    onChange={(e) => {
                      const currentFormats = watch("formats");
                      if (e.target.checked) {
                        setValue("formats", [...currentFormats, format], { shouldValidate: true });
                      } else {
                        setValue("formats", currentFormats.filter((f: "png" | "jpg" | "webp" | "pdf") => f !== format), { shouldValidate: true });
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label
                    htmlFor={`format-${format}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {format.toUpperCase()}
                  </Label>
                </div>
              ))}
            </div>
            {errors.formats && (
              <p className="text-sm text-destructive mt-1">
                {errors.formats.message as string}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Event Information */}
      <Card>
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* All text fields (except headerCopy which is handled separately) */}
          {config.fields
            .filter((f) => f.type === "text" && f.name !== "headerCopy")
            .map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  {...register(field.name as keyof FormData)}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                />
                {errors[field.name as keyof typeof errors] && (
                  <p className="text-sm text-destructive mt-1">
                    {errors[field.name as keyof typeof errors]?.message as string}
                  </p>
                )}
              </div>
            ))}

          {config.fields
            .filter((f) => f.type === "date")
            .map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>{field.label}</Label>
                <DatePicker
                  value={watch(field.name as keyof FormData) as Date}
                  onChange={(date) => setValue(field.name as keyof FormData, date! as any)}
                  error={errors[field.name as keyof typeof errors]?.message as string | undefined}
                />
              </div>
            ))}

          {config.fields
            .filter((f) => f.type === "time")
            .map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  type="time"
                  {...register(field.name as keyof FormData)}
                  defaultValue={field.default}
                />
                {errors[field.name as keyof typeof errors] && (
                  <p className="text-sm text-destructive mt-1">
                    {errors[field.name as keyof typeof errors]?.message as string}
                  </p>
                )}
              </div>
            ))}

          {/* Standalone image fields (e.g., logo) */}
          {config.fields
            .filter((f) => f.type === "image" && f.name !== "headshot")
            .map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setValue(field.name as keyof FormData, file as any, { shouldValidate: true });
                    }
                  }}
                />
                {errors[field.name as keyof typeof errors] && (
                  <p className="text-sm text-destructive mt-1">
                    {errors[field.name as keyof typeof errors]?.message as string}
                  </p>
                )}
              </div>
            ))}

          {/* Header copy field (for variant with header) */}
          {config.fields
            .filter((f) => f.type === "text" && f.name === "headerCopy")
            .map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  {...register(field.name as keyof FormData)}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                />
                {errors[field.name as keyof typeof errors] && (
                  <p className="text-sm text-destructive mt-1">
                    {errors[field.name as keyof typeof errors]?.message as string}
                  </p>
                )}
              </div>
            ))}
        </CardContent>
      </Card>

      {/* People Section */}
      {peopleField && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {peopleField.label} ({safeFields.length}/{maxPeople})
            </CardTitle>
            {canAddPerson && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({ name: "", role: "", talkTitle: "", headshot: undefined })
                }
              >
                Add Person
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {safeFields.map((field, index) => (
              <Card key={field.id} className="p-4">
                <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
                  <CardTitle className="text-lg">
                    {peopleField.fields?.find((f) => f.name === "name")?.label || "Speaker"} {index + 1}
                  </CardTitle>
                  {safeFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {peopleField.fields
                    ?.filter((f) => f.type === "text")
                    .map((personField) => (
                      <div key={personField.name}>
                        <Label htmlFor={`people.${index}.${personField.name}`}>
                          {personField.label}
                        </Label>
                        <Input
                          id={`people.${index}.${personField.name}`}
                          {...register(`people.${index}.${personField.name}` as any)}
                          placeholder={personField.placeholder}
                          maxLength={personField.maxLength}
                        />
                        {((errors.people as any)?.[index] as any)?.[personField.name] && (
                          <p className="text-sm text-destructive mt-1">
                            {((errors.people as any)?.[index] as any)?.[personField.name]?.message as string}
                          </p>
                        )}
                      </div>
                    ))}

                  {peopleField.fields
                    ?.filter((f) => f.type === "image")
                    .map((personField) => (
                      <div key={personField.name}>
                        <Label htmlFor={`people.${index}.${personField.name}`}>
                          {personField.label}
                        </Label>
                        <Input
                          id={`people.${index}.${personField.name}`}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setValue(`people.${index}.${personField.name}` as any, file, { shouldValidate: true });
                            }
                          }}
                        />
                        {((errors.people as any)?.[index] as any)?.[personField.name] && (
                          <p className="text-sm text-destructive mt-1">
                            {((errors.people as any)?.[index] as any)[personField.name]?.message as string}
                          </p>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}
            {safeFields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No people added. Click "Add Person" to get started.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting ? "Generating..." : "Generate Poster"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

