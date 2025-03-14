"use client";

import { useEffect, useState, createContext, useContext, useReducer, useCallback, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { Button, ButtonGroup } from "@heroui/button";
import {
    Navbar as HeroUINavbar,
    NavbarContent,
  } from "@heroui/navbar";
import { CalendarIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/solid';
import { Timeline, TimelineModel, TimelineOptions} from "animation-timeline-js/lib/animation-timeline";
import useOnClickPlay from "@/app/timeline/onClickPlay";
import useEditorStore from "@/app/timeline/states";

interface TimelineButtonsProps {
    timeline: Timeline | undefined;
    timelineElRef: React.RefObject<HTMLDivElement>;
}

export const TimelineToolbar = ({
    timeline,
    timelineElRef,
  }: TimelineButtonsProps) => {

    const {
        timelinePlayingState,
        setTimelinePlayingState,
        isTimelinePlayable,
      } = useEditorStore(
        useShallow((state) => ({
          timelinePlayingState: state.timelinePlayingState,
          setTimelinePlayingState: state.setTimelinePlayingState,
          isTimelinePlayable: state.isTimelinePlayable,
        })),
      );

    const { onClickPlay } = useOnClickPlay({ timeline, timelineElRef });

    const isTimelinePlaying = timelinePlayingState === "playing";

    const onPauseClick = useCallback(() => {
        setTimelinePlayingState("idle");
        if (timeline) {
          timeline.setOptions({ timelineDraggable: true });
        }
      }, [setTimelinePlayingState, timeline]);

    return (
        <HeroUINavbar isBordered height="48px" maxWidth="full" position="sticky">
            <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
                <CalendarIcon className="size-6 text-500" fill="white"/>
            </NavbarContent>
            <NavbarContent className="basis-1/5 sm:basis-full" justify="center">
              {!isTimelinePlaying ? (
                  <Button isIconOnly onPress={onClickPlay}>
                      <PlayIcon className="size-6 text-500" />
                  </Button>
              ) : (
                  <Button isIconOnly onPress={onPauseClick}>
                      <PauseIcon className="size-6 text-500" />
                  </Button>
              )}
            </NavbarContent>
        </HeroUINavbar>
    );
}