/**
 * Shared Field Value Resolution
 * Used by both legacy HTML and node-based renderers
 * Ensures consistent formatting for dates, times, and nested fields
 */

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Submission } from "@prisma/client";
import { TemplateConfig, TemplateField } from "./template-registry";

/**
 * Resolve a field value from submission data with proper formatting
 */
export function resolveFieldValue(
  fieldName: string,
  submission: Submission,
  config: TemplateConfig
): string | undefined {
  // Handle nested paths (e.g., "people[0].name")
  if (fieldName.includes("[")) {
    return resolveNestedField(fieldName, submission);
  }

  // Handle top-level fields
  switch (fieldName) {
    case "eventTitle":
      return submission.eventTitle;
    case "eventDate":
      return formatDateField(submission, config);
    case "doorTime":
      return formatTimeField(submission, config);
    case "venueName":
      return submission.venueName;
    case "addressLine":
      return submission.addressLine;
    case "cityLine":
      return submission.cityLine;
    case "primaryColor":
      return submission.primaryColor;
    case "secondaryColor":
      return submission.secondaryColor;
    case "logo":
      // Logo is handled separately via assets
      return undefined;
    default:
      // Try to get from submission directly
      return (submission as any)[fieldName]?.toString();
  }
}

/**
 * Format date field based on config
 */
function formatDateField(submission: Submission, config: TemplateConfig): string {
  const dateField = config.fields && Array.isArray(config.fields) 
    ? config.fields.find(f => f.name === "eventDate") 
    : undefined;
  
  if (!dateField || !dateField.format) {
    return submission.eventDate.toString();
  }

  const locale = dateField.locale === "fr" ? fr : undefined;
  return format(submission.eventDate, dateField.format, locale ? { locale } : undefined);
}

/**
 * Format time field based on config
 */
function formatTimeField(submission: Submission, config: TemplateConfig): string {
  const timeField = config.fields && Array.isArray(config.fields)
    ? config.fields.find(f => f.name === "doorTime")
    : undefined;
  
  if (!timeField) {
    return submission.doorTime;
  }

  const prefix = timeField.prefix || "";

  if (timeField.format === "12h") {
    const [hours, minutes] = submission.doorTime.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${prefix}${hour12}:${minutes} ${ampm}`;
  } else {
    // 24h format
    return `${prefix}${submission.doorTime}`;
  }
}

/**
 * Resolve nested field paths (e.g., "people[0].name")
 */
function resolveNestedField(fieldPath: string, submission: Submission): string | undefined {
  const parts = fieldPath.split(/[\.\[\]]/).filter(p => p);
  let current: any = submission;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }

    // Handle array indices
    if (!isNaN(Number(part))) {
      current = current[parseInt(part, 10)];
    } else {
      current = current[part];
    }
  }

  return current?.toString();
}

/**
 * Prepare complete data object for node template binding
 * This ensures all fields are properly formatted
 */
export function prepareBindingData(
  submission: Submission,
  config: TemplateConfig
): Record<string, any> {
  // Safely parse people, defaulting to empty array
  let people: any[] = [];
  try {
    if (submission.people && typeof submission.people === "string" && submission.people.trim() !== "") {
      people = JSON.parse(submission.people);
      if (!Array.isArray(people)) people = [];
    }
  } catch {
    people = [];
  }
  
  const data: Record<string, any> = {
    eventTitle: resolveFieldValue("eventTitle", submission, config),
    eventDate: resolveFieldValue("eventDate", submission, config),
    doorTime: resolveFieldValue("doorTime", submission, config),
    venueName: resolveFieldValue("venueName", submission, config),
    addressLine: resolveFieldValue("addressLine", submission, config),
    cityLine: resolveFieldValue("cityLine", submission, config),
    primaryColor: resolveFieldValue("primaryColor", submission, config),
    secondaryColor: resolveFieldValue("secondaryColor", submission, config),
    people: people,
  };
  
  // Add nested people fields for easier binding
  if (Array.isArray(people)) {
    people.forEach((person: any, index: number) => {
      data[`people[${index}].name`] = person.name;
      data[`people[${index}].role`] = person.role;
      data[`people[${index}].talkTitle`] = person.talkTitle;
      data[`people[${index}].headshot`] = person.headshot;
    });
  }
  
  return data;
}

