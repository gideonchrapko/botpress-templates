import { Submission } from "@prisma/client";
import { renderTemplateWithConfig } from "@/lib/template-engine";

const BASE_WIDTH = 1080;
const BASE_HEIGHT = 1350;

export function getPosterDimensions(scale: number) {
  return {
    width: BASE_WIDTH * scale,
    height: BASE_HEIGHT * scale,
  };
}

export async function renderTemplate(submission: Submission): Promise<string> {
  return renderTemplateWithConfig(submission);
}
