import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { Code } from "@heroui/code";
import { button as buttonStyles } from "@heroui/theme";

import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";

import { TimelineComponent } from "@/app/timeline/timelineComponent";
import { Divider } from "@heroui/react";

export default function Home() {
  return (
    // <section className="h-full flex flex-col items-center justify-center gap-2 md:py-8 mt-0">
    <section className="h-full p-2">
      <TimelineComponent />
    </section>
  );
}
