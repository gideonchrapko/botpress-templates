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
    eventTitle: z.string().min(1).max(60),
    eventDate: z.date(),
    doorTime: z.string(),
  };

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
    defaultValues: {
      primaryColor: config.fields.find((f) => f.name === "primaryColor")?.default || "#3D9DFF",
      scale: "1",
      formats: ["png"],
      doorTime: config.fields.find((f) => f.name === "doorTime")?.default || "18:00",
      people: [{ name: "", role: "", talkTitle: "", headshot: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "people",
  });

  const canAddPerson = fields.length < maxPeople;

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("primaryColor", data.primaryColor);
      formData.append("peopleCount", data.people.length.toString());
      formData.append("scale", data.scale);
      data.formats.forEach((format) => {
        formData.append("formats", format);
      });
      formData.append("eventTitle", data.eventTitle);
      formData.append("eventDate", data.eventDate.toISOString());
      formData.append("doorTime", data.doorTime);
      formData.append("templateFamily", templateFamily);

      // Append headshots (compress first if needed)
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
    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      alert(`Validation error: ${firstError.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8">
      {/* Color Section */}
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
                {errors.scale.message}
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
                        setValue("formats", currentFormats.filter((f) => f !== format), { shouldValidate: true });
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
                {errors.formats.message}
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
          {config.fields
            .filter((f) => f.type === "text" && f.name === "eventTitle")
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
                  value={watch("eventDate")}
                  onChange={(date) => setValue("eventDate", date!)}
                  error={errors.eventDate?.message}
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
        </CardContent>
      </Card>

      {/* People Section */}
      {peopleField && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {peopleField.label} ({fields.length}/{maxPeople})
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
            {fields.map((field, index) => (
              <Card key={field.id} className="p-4">
                <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
                  <CardTitle className="text-lg">
                    {peopleField.fields?.find((f) => f.name === "name")?.label || "Speaker"} {index + 1}
                  </CardTitle>
                  {fields.length > 1 && (
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
                        {errors.people?.[index]?.[personField.name as any] && (
                          <p className="text-sm text-destructive mt-1">
                            {(errors.people[index] as any)?.[personField.name]?.message as string}
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
                        {errors.people?.[index] && (errors.people[index] as any)?.[personField.name] && (
                          <p className="text-sm text-destructive mt-1">
                            {(errors.people[index] as any)[personField.name]?.message as string}
                          </p>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}
            {fields.length === 0 && (
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
          onClick={() => router.push("/templates")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

