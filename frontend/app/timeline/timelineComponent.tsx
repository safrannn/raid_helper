"use client";

import { useEffect, useRef } from "react";
import { TimelineToolbar } from "@/app/timeline/timelineToolBar";
import TimelineOutline from "@/app/timeline/timelineOutline";
import useEditorStore from "@/app/timeline/states";
import {
  useInitTimeline,
  useInitTimelineListeners,
} from "@/app/timeline/useInitTimeline";
import { Divider } from "@heroui/divider";
import { EncounterNotes } from "./encounterNotes";
import { SpellDetails } from "./spellDetails";

export const TimelineComponent = () => {
  const timelineElRef = useRef<HTMLDivElement>(null);
  const outlineContainerRef = useRef<HTMLDivElement>(null);
  const outlineScrollContainerRef = useRef<HTMLDivElement>(null);

  const { timeline } = useInitTimeline({ timelineElRef });
  useInitTimelineListeners({
    timeline,
    outlineContainerRef,
    outlineScrollContainerRef,
  });

  const timelineModel = useEditorStore((state) => state.timelineModel);

  useEffect(() => {
    timeline?.setModel(timelineModel);
  }, [timelineModel, timeline]);

  return (
    <div className="flex flex-row h-full gap-1">
      <div className="basis-3/4 h-full rounded-md border border-content3">
        <div className="timelineToolbar">
          <TimelineToolbar timeline={timeline} timelineElRef={timelineElRef} />
        </div>

        <div className="flex flex-col">
          <div className="flex flex-row h-[calc(100vh-7rem)]">
            <TimelineOutline timeline={timeline} />
            <div
              className="basis-4/5 h-full"
              ref={timelineElRef}
              id="timeline"
            ></div>
          </div>
        </div>
      </div>

      <div className="basis-1/4 flex flex-col bg-content2 rounded-md border border-gray-500/50">
        <div className="h-2/3">
          <SpellDetails timeline={timeline} />
        </div>

        <div className="h-1/3 flex">
          <EncounterNotes />
        </div>
      </div>
    </div>
  );
};
