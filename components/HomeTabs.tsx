"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Wrench } from "lucide-react";

const TAB_HASH = { tools: "tools", resources: "resources" } as const;
type TabValue = keyof typeof TAB_HASH;

function tabFromHash(): TabValue {
  if (typeof window === "undefined") return "tools";
  const hash = window.location.hash.slice(1).toLowerCase();
  if (hash === "resources" || hash === "design-resources") return "resources";
  if (hash === "tools") return "tools";
  return "tools";
}

export function HomeTabs({
  toolsTab,
  resourcesTab,
}: {
  toolsTab: React.ReactNode;
  resourcesTab: React.ReactNode;
}) {
  const [value, setValue] = useState<TabValue>("tools");

  useEffect(() => {
    setValue(tabFromHash());
    const onHashChange = () => setValue(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const want = TAB_HASH[value];
    const current = window.location.hash.slice(1);
    if (current !== want) {
      window.history.replaceState(null, "", `${window.location.pathname}#${want}`);
    }
  }, [value]);

  return (
    <Tabs value={value} onValueChange={(v) => setValue(v as TabValue)} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="tools" className="gap-2">
          <Wrench className="h-4 w-4" />
          Tools
        </TabsTrigger>
        <TabsTrigger value="resources" className="gap-2">
          <Palette className="h-4 w-4" />
          Design Resources
        </TabsTrigger>
      </TabsList>
      <TabsContent value="tools">{toolsTab}</TabsContent>
      <TabsContent value="resources">{resourcesTab}</TabsContent>
    </Tabs>
  );
}
