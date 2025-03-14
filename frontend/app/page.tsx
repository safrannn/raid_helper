import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { Code } from "@heroui/code";
import { button as buttonStyles } from "@heroui/theme";

import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";

import { TimelineComponent } from "@/app/timeline/timelineComponent";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-2 py-6 md:py-8">

      <div className="inline-block max-w-xl text-center justify-center">
        <span className={title()}>窝窝&nbsp;</span>
        <span className={title({ color: "violet" })}>腚儿&nbsp;</span>
        <br />
        <div className={subtitle({ class: "mt-4" })}>
          (名字暂定)
        </div>
        <div className={subtitle({ class: "mt-0" })}>
          (全力开发中)
        </div>
      </div>
      <TimelineComponent/>
    </section>
  );
}