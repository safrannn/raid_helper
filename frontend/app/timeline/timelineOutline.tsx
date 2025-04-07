import { useCallback, useEffect, useRef, useState } from "react";
import { PressEvent } from "@heroui/button";
import { PlusCircleIcon } from "@heroicons/react/24/solid";
import { Timeline } from "animation-timeline-js/lib/animation-timeline";
import useEditorStore from "@/app/timeline/states";
import { setAutoFreeze } from "immer";
import { useShallow } from "zustand/react/shallow";
import { TimelineModelExtra } from "./createRow";
import { Avatar, Card, CardBody, Spacer } from "@heroui/react";

setAutoFreeze(false);

interface OutlineNodeTemplateProps {
  onPressFn: ((e: PressEvent) => void) | undefined;
  iconURL: string | undefined;
  characterName: string | undefined;
  utilityButtons: JSX.Element | undefined;
  isPressable: boolean;
}

function OutlineNodeTemplate({
  onPressFn,
  iconURL,
  characterName,
  utilityButtons,
  isPressable,
}: OutlineNodeTemplateProps) {
  const iconURL_: string = iconURL
    ? iconURL
    : "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
  const characterName_: string = characterName ? characterName : "unknown";
  const utilityButtons_ = utilityButtons ? utilityButtons : HTMLElement;

  return (
    <Card
      isBlurred
      className="border-none w-full dark:bg-default-100/50 h-10"
      shadow="sm"
      radius="none"
      isHoverable
      onPress={onPressFn}
      isPressable={isPressable}
    >
      <CardBody>
        <div className="flex h-full justify-between items-center">
          <div className="flex items-center">
            <Avatar
              isBordered
              className="h-5 w-5 text-tiny bg-transparent p-0"
              src={iconURL_}
            />
            <Spacer x={2} />
            <div className="text-xs">{characterName_}</div>
          </div>
          <>{utilityButtons_}</>
        </div>
      </CardBody>
    </Card>
  );
}

interface OutlineNodeProps {
  timeline: Timeline | undefined;
  index: number;
}

function OutlineNode({ timeline, index }: OutlineNodeProps) {
  console.log("OutlineNode: ", { timeline });

  const { addTimelineRow, deleteTimelineRow, rows, bossMap } = useEditorStore(
    useShallow((state) => ({
      addTimelineRow: state.addTimelineRow,
      deleteTimelineRow: state.deleteTimelineRow,
      rows: state.timelineModel.rows,
      bossMap: state.bossMap,
    }))
  );

  const onDeleteRow = useCallback(
    (indexToDelete: number) => {
      if (!timeline) {
        return;
      }
      deleteTimelineRow(indexToDelete);
    },
    [deleteTimelineRow, timeline]
  );

  const row = rows[index];
  // if by default is player
  var characterName: string;
  var iconURL: string | undefined;
  // if boss
  if (row.id?.startsWith("boss_")) {
    characterName = row.id?.split("_", 3)[1];
    iconURL = bossMap.get(characterName)?.bossIcon;
  } else {
    // if player
    characterName = row?.id ?? "row" + index.toString();
  }

  return (
    <OutlineNodeTemplate
      onPressFn={undefined}
      characterName={characterName}
      iconURL={iconURL}
      isPressable={false}
      utilityButtons={
        <div className="justify-right">{/* <Button></Button> */}</div>
      }
    />
  );
}

interface OutlineProps {
  timeline: Timeline | undefined;
  timelineModel: TimelineModelExtra;
}

function onAddPlayerEntry() {
  console.log("add player clicked");
}

function OutlinNodeAddNewPlayer() {
  return (
    <OutlineNodeTemplate
      onPressFn={onAddPlayerEntry}
      characterName="Add New Player"
      iconURL={undefined}
      isPressable={true}
      utilityButtons={<PlusCircleIcon className="size-6 text-500" />}
    />
  );
}

interface TimelineOutlineProps {
  timeline: Timeline | undefined;
}

export default function TimelineOutline({ timeline }: TimelineOutlineProps) {
  const outlineContainerRef = useRef<HTMLDivElement>(null);
  const outlineScrollContainerRef = useRef<HTMLDivElement>(null);
  const allowLoadFight_ = useEditorStore((state) => state.allowLoadFight);
  var rows = useEditorStore((state) => state.timelineModel.rows);

  const onWheelScroll = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      // Set scroll back to timeline when mouse scroll over the outline
      if (timeline) {
        const unknownEvent = event as unknown;
        const coercedEvent = unknownEvent as WheelEvent;
        timeline._handleWheelEvent(coercedEvent);
      }
    },
    [timeline]
  );

  return (
    <div className="basis-1/5 bg-content2">
      <div
        className="h-[30px] content-center px-2 bg-content1"
        id="outline-header"
      >
        <p className="text-xs text-center">Character List \ Timeline</p>
      </div>
      {allowLoadFight_ ? (
        <div
          className="outline-scroll-container"
          id="outline-scroll-container"
          ref={outlineScrollContainerRef}
          onWheel={onWheelScroll}
        >
          <div ref={outlineContainerRef}>
            {rows.map((row, index) => {
              return (
                <OutlineNode
                  key={row?.id ?? "row" + index.toString()}
                  timeline={timeline}
                  index={index}
                />
              );
            })}
            <OutlinNodeAddNewPlayer />
          </div>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}
