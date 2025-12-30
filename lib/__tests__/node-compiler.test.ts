/**
 * Test file for node-to-HTML compiler
 * Phase 1: Basic compilation test
 */

import { compileNodeGraphToHTML } from "../node-to-html-compiler";
import { TemplateSchema } from "../node-types";

// Simple test schema
const testSchema: TemplateSchema = {
  id: "test-template",
  name: "test-template",
  title: "Test Template",
  version: 1,
  dimensions: {
    width: 1080,
    height: 1350,
  },
  nodes: [
    {
      id: "title",
      type: "text",
      x: 100,
      y: 100,
      width: 800,
      height: 60,
      zIndex: 1,
      content: "Event Title",
      fontFamily: "Arial",
      fontSize: 48,
      fontWeight: "bold",
      lineHeight: 1.2,
      textAlign: "center",
      color: "#000000",
      binding: {
        field: "eventTitle",
        type: "text",
      },
    },
    {
      id: "logo",
      type: "image",
      x: 400,
      y: 200,
      width: 200,
      height: 200,
      zIndex: 2,
      src: "https://example.com/logo.png",
      fit: "contain",
    },
    {
      id: "background",
      type: "shape",
      x: 0,
      y: 0,
      width: 1080,
      height: 1350,
      zIndex: 0,
      shapeType: "rectangle",
      fill: "token:primary",
    },
  ],
  tokens: {
    primary: {
      name: "primary",
      default: "#3D9DFF",
      editable: true,
    },
  },
  variants: [
    {
      id: "variant-1",
      name: "Variant 1",
      overrides: [
        {
          nodeId: "logo",
          operation: "hide",
        },
      ],
    },
  ],
  bindings: [
    {
      nodeId: "title",
      field: "eventTitle",
      type: "text",
    },
  ],
};

// Test data
const testData = {
  eventTitle: "Test Event",
};

// Test tokens
const testTokens = {
  primary: "#FF5733",
};

// Test compilation
export function testCompiler() {
  console.log("Testing node-to-HTML compiler...");
  
  // Test basic compilation
  const html = compileNodeGraphToHTML(testSchema, {
    data: testData,
    tokens: testTokens,
  });
  
  console.log("✅ Compiler test passed");
  console.log("Generated HTML length:", html.length);
  
  // Verify HTML contains expected elements
  if (!html.includes("Test Event")) {
    throw new Error("HTML should contain bound data");
  }
  
  if (!html.includes("#FF5733")) {
    throw new Error("HTML should contain resolved token color");
  }
  
  if (!html.includes("1080px")) {
    throw new Error("HTML should contain dimensions");
  }
  
  // Test variant
  const htmlWithVariant = compileNodeGraphToHTML(testSchema, {
    data: testData,
    tokens: testTokens,
    variantId: "variant-1",
  });
  
  if (htmlWithVariant.includes('id="node-logo"')) {
    throw new Error("Variant should hide logo node");
  }
  
  console.log("✅ Variant test passed");
  
  return html;
}

// Run test if this file is executed directly
if (require.main === module) {
  try {
    testCompiler();
    console.log("✅ All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

