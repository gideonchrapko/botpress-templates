"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { linkedinFormSchema, type LinkedinFormData } from "@/lib/validations";
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

export default function MTLCodeForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LinkedinFormData>({
    resolver: zodResolver(linkedinFormSchema),
    defaultValues: {
      primaryColor: "#3D9DFF",
      scale: "1",
      formats: ["png"], // Default to PNG
      doorTime: "18:00", // Default to 6:00 PM in 24-hour format
      people: [{ name: "", role: "", talkTitle: "", headshot: undefined as any }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "people",
  });

  const canAddPerson = fields.length < 3;

  // Compress image client-side before upload
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxWidth = 800;
          const maxHeight = 800;
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Compression failed"));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            "image/jpeg",
            0.85 // 85% quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const onSubmit = async (data: LinkedinFormData) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("primaryColor", data.primaryColor);
      formData.append("peopleCount", data.people.length.toString());
      formData.append("scale", data.scale);
      // Append each format
      data.formats.forEach((format) => {
        formData.append("formats", format);
      });
      formData.append("eventTitle", data.eventTitle);
      formData.append("eventDate", data.eventDate.toISOString());
      formData.append("doorTime", data.doorTime);

      // Append headshots (compress first if needed)
      for (let index = 0; index < data.people.length; index++) {
        const person = data.people[index];
        let headshotFile = person.headshot;
        
        // Compress if file is larger than 2MB
        if (headshotFile.size > 2 * 1024 * 1024) {
          try {
            headshotFile = await compressImage(headshotFile);
          } catch {
            // Continue with original file if compression fails
          }
        }
        
        formData.append(`headshot_${index}`, headshotFile);
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
              throw new Error(errorData.error || "Submission failed");
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
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-4 items-center mt-2">
              <Input
                id="primaryColor"
                type="color"
                value={watch("primaryColor")}
                onChange={(e) => setValue("primaryColor", e.target.value, { shouldValidate: true })}
                className="w-24 h-10"
              />
              <Input
                type="text"
                value={watch("primaryColor")}
                onChange={(e) => setValue("primaryColor", e.target.value, { shouldValidate: true })}
                placeholder="#3D9DFF"
                className="flex-1"
              />
            </div>
            {errors.primaryColor && (
              <p className="text-sm text-destructive mt-1">
                {errors.primaryColor.message}
              </p>
            )}
          </div>
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
          <div>
            <Label htmlFor="eventTitle">Event Title</Label>
            <Input
              id="eventTitle"
              {...register("eventTitle")}
              placeholder="Code @ Quebec"
              maxLength={60}
            />
            {errors.eventTitle && (
              <p className="text-sm text-destructive mt-1">
                {errors.eventTitle.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="eventDate">Event Date</Label>
            <DatePicker
              value={watch("eventDate")}
              onChange={(date) => setValue("eventDate", date!)}
              error={errors.eventDate?.message}
            />
            {errors.eventDate && (
              <p className="text-sm text-destructive mt-1">
                {errors.eventDate.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="doorTime">Door Opening Time</Label>
            <Input
              id="doorTime"
              type="time"
              value={watch("doorTime")}
              onChange={(e) => setValue("doorTime", e.target.value, { shouldValidate: true })}
            />
            {errors.doorTime && (
              <p className="text-sm text-destructive mt-1">
                {errors.doorTime.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* People Blocks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>People</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: "", role: "", talkTitle: "", headshot: undefined as any })}
            disabled={!canAddPerson}
          >
            Add Person
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="relative">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Person {index + 1}</CardTitle>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
              <div>
                <Label htmlFor={`people.${index}.name`}>Name</Label>
                <Input
                  id={`people.${index}.name`}
                  {...register(`people.${index}.name`)}
                  placeholder="John Doe"
                  maxLength={40}
                />
                {errors.people?.[index]?.name && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.people[index]?.name?.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor={`people.${index}.role`}>Role</Label>
                <Input
                  id={`people.${index}.role`}
                  {...register(`people.${index}.role`)}
                  placeholder="CTO @ Botpress"
                  maxLength={60}
                />
                {errors.people?.[index]?.role && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.people[index]?.role?.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor={`people.${index}.talkTitle`}>Talk Title</Label>
                <Input
                  id={`people.${index}.talkTitle`}
                  {...register(`people.${index}.talkTitle`)}
                  placeholder="Kubernetes the right way: A platform engineering approach to K8s"
                  maxLength={120}
                />
                {errors.people?.[index]?.talkTitle && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.people[index]?.talkTitle?.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor={`people.${index}.headshot`}>Headshot</Label>
                <Input
                  id={`people.${index}.headshot`}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setValue(`people.${index}.headshot`, file, { shouldValidate: true });
                    }
                  }}
                />
                {errors.people?.[index]?.headshot && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.people[index]?.headshot?.message}
                  </p>
                )}
              </div>
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

