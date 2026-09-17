import { useCallback, useEffect, useRef, useState } from "react";
import { Button, PressEvent } from "@heroui/button";
import { PlusCircleIcon } from "@heroicons/react/24/solid";
import { Timeline } from "animation-timeline-js/lib/animation-timeline";
import useEditorStore from "@/app/states";
import { setAutoFreeze } from "immer";
import { useShallow } from "zustand/react/shallow";
import {
  createBossRow,
  createIntervalKeyframes,
  createPlayerRow,
  createSingleKeyframe,
  TimelineKeyframeExtra,
  TimelineModelExtra,
  TimelineRowExtra,
} from "./createRow";
import {
  addToast,
  Avatar,
  Card,
  CardBody,
  Form,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spacer,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import { BossSpell, BossSpellMap, TimelineBossSpellsReturn } from "./types";
import { FRAME_RATE } from "./timelineComponent";
import {
  RowGroup,
  playerRowGroup,
  updatePlayer,
  updatedPlayerRowGroup,
} from "@/app/visTimeline/model";

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
  // timeline: Timeline | undefined;
  index: number;
  rowId: string;
}

function OutlineNode({ index, rowId }: OutlineNodeProps) {
  const classSpecIconMap_ = useEditorStore((state) => state.classSpecIconMap);
  const {
    // addTimelineRow, deleteTimelineRow, rows,
    bossMap,
  } = useEditorStore(
    useShallow((state) => ({
      // addTimelineRow: state.addTimelineRow,
      // deleteTimelineRow: state.deleteTimelineRow,
      // rows: state.timelineModel.rows,
      bossMap: state.bossMap,
    })),
  );

  // const onDeleteRow = useCallback(
  //   (indexToDelete: number) => {
  //     if (!timeline) {
  //       return;
  //     }
  //     deleteTimelineRow(indexToDelete);
  //   },
  //   [deleteTimelineRow, timeline]
  // );

  // if by default is player
  var characterName: string;
  var iconURL: string | undefined;
  if (rowId.startsWith("boss__")) {
    // if boss
    characterName = rowId.split("__", 3)[1];
    iconURL = bossMap.get(characterName)?.bossIcon;
  } else if (rowId.startsWith("player__")) {
    // if player
    // player__{name}__{id}__{class}__{spec}
    const [, playerName, , playerClassName, playerSpecName] = rowId.split("__");
    characterName = playerName ?? "row" + index.toString();
    // No spec ("" or the Generic "*") falls back to the class icon.
    iconURL =
      playerSpecName && playerSpecName !== "*"
        ? classSpecIconMap_.get(`${playerClassName}__${playerSpecName}`)
        : classSpecIconMap_.get(playerClassName);
  } else {
    characterName = "row" + index.toString();
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

interface ClassSpecSelectionProps {
  selectedClassSpec: string;
  setSelectedClassSpec: React.Dispatch<React.SetStateAction<string>>;
}
const ClassSpecSelection = ({
  selectedClassSpec,
  setSelectedClassSpec,
}: ClassSpecSelectionProps) => {
  const [classNames, setClassNames] = useState<string[]>([]);
  const classSpecIconMap_ = useEditorStore((state) => state.classSpecIconMap);

  const columns = [
    { name: "class", uid: "class" },
    { name: "specialization", uid: "spec" },
  ];

  useEffect(() => {
    const loadClassNames = async () => {
      try {
        const response = await fetch(
          "/get_player_class_names",
        );
        const data: string[] = await response.json();
        // Server returns names alphabetically; pin "Generic" to the top.
        setClassNames([
          ...data.filter((name) => name === "Generic"),
          ...data.filter((name) => name !== "Generic"),
        ]);
      } catch (error) {
        console.error("Error getting player class names:", error);
      }
    };
    loadClassNames();
  }, []);

  const classSpecOnPress = (e: PressEvent) => {
    setSelectedClassSpec(e.target.id);
  };

  const renderCell = useCallback(
    (className: string, columnKey: React.Key, selectedClassSpec: string) => {
      switch (columnKey) {
        case "class":
          // Selecting the class alone (no spec) uses the bare class name as
          // the selection id; specs use `${class}__${spec}`.
          return (
            <div className="flex flex-row items-center gap-1 p-0 border-r-2 border-content1">
              <Button
                isIconOnly
                id={className}
                radius="full"
                variant="bordered"
                onPress={classSpecOnPress}
                color={selectedClassSpec === className ? "success" : "default"}
              >
                <Avatar
                  src={classSpecIconMap_.get(className)}
                  size="sm"
                  radius="full"
                />
              </Button>
              <span className="text-tiny text-shadow-sm tracking-tight text-default-600 font-medium">
                {className}
              </span>
            </div>
          );
        case "spec": {
          return (
            <div className="flex flex-row gap-1">
              {Array.from(classSpecIconMap_.entries()).map(
                ([classSpec, icon]) => {
                  if (classSpec.startsWith(className + "__")) {
                    const specName = classSpec.split("__", 2)[1];

                    return (
                      <Tooltip
                        key={classSpec}
                        content={specName}
                        size="md"
                        radius="full"
                        delay={500}
                      >
                        <Button
                          isIconOnly
                          id={classSpec}
                          radius="full"
                          variant="bordered"
                          onPress={classSpecOnPress}
                          color={
                            selectedClassSpec === classSpec
                              ? "success"
                              : "default"
                          }
                        >
                          <Avatar src={icon} size="sm" radius="full" />
                        </Button>
                      </Tooltip>
                    );
                  }
                },
              )}
            </div>
          );
        }
        default:
          return;
      }
    },
    [],
  );

  return (
    <Table
      // isHeaderSticky
      // isStriped
      aria-label="playerClassSpecSelection"
      hideHeader
      radius="sm"
      shadow="md"
      fullWidth
      removeWrapper
      isCompact
      layout="auto"
      classNames={{
        base: "max-h-[400px] rounded-lg bg-content2 overflow-auto inset-shadow-md ",
        table: "min-h-[300px] mt-1",
      }}
    >
      <TableHeader columns={columns}>
        {(column) => (
          <TableColumn key={column.uid} align="start">
            {column.name}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody>
        {classNames.map((className) => {
          return (
            <TableRow key={className}>
              {(columnKey) => (
                <TableCell key={columnKey} className="py-1">
                  {renderCell(className, columnKey, selectedClassSpec)}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

interface AddNewPlayerModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // When set, the dialog edits this player row instead of adding one.
  editing?: RowGroup;
}

// ClassSpecSelection's value is "" (nothing / Generic), "{class}" (class
// only, no spec), or "{class}__{spec}"; the db stores Generic as "Generic"/"*".
const parseClassSpec = (selection: string): [string, string] => {
  if (selection === "") return ["Generic", "*"];
  const [className, specName] = selection.split("__", 2);
  return [className, specName ?? ""];
};

const toClassSpecSelection = (className: string, specName: string) => {
  if (className === "Generic") return "";
  return specName === "" || specName === "*"
    ? className
    : `${className}__${specName}`;
};

// The "add player" dialog on its own, so it can be opened from either outline
// (the legacy React one, or the vis-timeline label column). With `editing` it
// becomes the "update player" dialog for that row.
export function AddNewPlayerModal({
  isOpen,
  onOpenChange,
  editing,
}: AddNewPlayerModalProps) {
  const {
    bossName,
    difficulty,
    pushTimelineRow,
    pushVisGroup,
    updateVisGroup,
  } = useEditorStore(
    useShallow((state) => ({
      bossName: state.bossName,
      difficulty: state.difficulty,
      pushTimelineRow: state.pushTimelineRow,
      pushVisGroup: state.pushVisGroup,
      updateVisGroup: state.updateVisGroup,
    })),
  );
  const [playerName, setPlayerName] = useState<string>("");
  const [selectedClassSpec, setSelectedClassSpec] = useState<string>("");

  // Prefill from the row being edited (or start blank) each time it opens.
  // In edit mode the name is fixed (renaming is the label's double-click).
  useEffect(() => {
    if (!isOpen) return;
    setPlayerName(editing?.name ?? "");
    setSelectedClassSpec(
      editing
        ? toClassSpecSelection(
            editing.playerClass ?? "",
            editing.playerSpec ?? "",
          )
        : "",
    );
  }, [isOpen, editing]);

  const addPlayerOnPress = (onClose: () => void) => {
    const addPlayer = async () => {
      try {
        const [playerClassName, playerSpecName] =
          parseClassSpec(selectedClassSpec);
        const newParams = new URLSearchParams({
          player_name: playerName,
          player_class_name: playerClassName,
          player_spec_name: playerSpecName,
          boss_name: bossName,
          difficulty: difficulty,
        });
        const paramsString = newParams.toString();
        const encodedUrl = `/add_player?` + paramsString;
        const response = await fetch(encodedUrl);
        const data: number = await response.json();
        if (data === -2) {
          // Entry already exist in db.
          addToast({
            title: "Error",
            description: "Player already exist",
            color: "danger",
          });
          return;
        } else if (data === -1) {
          // Unable to add player into db
          addToast({
            title: "Error",
            description: "Unable to add player",
            color: "danger",
          });
          return;
        }
        // add player to timeline outline
        const newPlayerTimelineRow: TimelineRowExtra = createPlayerRow(
          playerName,
          data,
          playerClassName,
          playerSpecName,
          undefined,
        );

        pushTimelineRow(newPlayerTimelineRow);
        // vis-timeline model
        pushVisGroup(
          playerRowGroup(playerName, data, playerClassName, playerSpecName),
        );
      } catch (error) {
        console.error("Error adding player:", error);
      }
    };
    const editPlayer = async (row: RowGroup) => {
      if (row.playerId === undefined) return;
      try {
        const [playerClassName, playerSpecName] =
          parseClassSpec(selectedClassSpec);
        const data = await updatePlayer(
          row.playerId,
          playerName,
          playerClassName,
          playerSpecName,
        );
        if (data === -2) {
          addToast({
            title: "Error",
            description: "Player already exist",
            color: "danger",
          });
          return;
        } else if (data === -1) {
          addToast({
            title: "Error",
            description: "Unable to update player",
            color: "danger",
          });
          return;
        }
        updateVisGroup(
          updatedPlayerRowGroup(
            row,
            playerName,
            playerClassName,
            playerSpecName,
          ),
        );
      } catch (error) {
        console.error("Error updating player:", error);
      }
    };
    if (bossName === "" || difficulty === "") {
      addToast({
        title: "Error",
        description: "Select an encounter before adding a player.",
        color: "danger",
      });
    } else if (playerName.length === 0) {
      addToast({
        title: "Error",
        description: "Please enter a name for player.",
        color: "danger",
      });
    } else {
      if (editing) editPlayer(editing);
      else addPlayer();
      onClose();
    }
  };

  return (
    <Modal
      size="sm"
      backdrop="transparent"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      classNames={{
        body: "pb-5",
        footer: "py-2 border-t-[1px] border-[#292f46]",
        closeButton: "hover:bg-white/5 active:bg-white/10",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col">
              {/* Adding new player */}
            </ModalHeader>
            <ModalBody className="">
              <Form className="gap-5 flex flex-col">
                {!editing && (
                  <Input
                    isRequired
                    errorMessage="Please enter a name for player."
                    label="Enter Player Name:"
                    labelPlacement="outside"
                    name="name"
                    placeholder="Enter player name:"
                    type="text"
                    radius="sm"
                    value={playerName}
                    onValueChange={setPlayerName}
                  />
                )}
                <div className="flex flex-col gap-2">
                  <h5 className="text-small text-default-900 font-medium">
                    Select class and spec:
                  </h5>
                  <ClassSpecSelection
                    selectedClassSpec={selectedClassSpec}
                    setSelectedClassSpec={setSelectedClassSpec}
                  />
                </div>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="light" onPress={onClose}>
                Close
              </Button>
              <Button
                color="primary"
                className="shadow-md"
                radius="sm"
                onPress={() => {
                  addPlayerOnPress(onClose);
                }}
              >
                {editing ? "Update" : "Add"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

export function OutlineNodeAddNewPlayer() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  return (
    <>
      <Card
        isBlurred
        className="border-none w-full dark:bg-default-100/50 h-10"
        shadow="sm"
        radius="none"
        isHoverable
        onPress={onOpen}
        isPressable={true}
      >
        <CardBody>
          <div className="flex h-full justify-between items-center">
            <div className="flex items-center">
              <Avatar
                isBordered
                className="h-5 w-5 text-tiny bg-transparent p-0"
                src={undefined}
              />
              <Spacer x={2} />
              <div className="text-xs">Add New Player</div>
            </div>
            <>{<PlusCircleIcon className="size-6 text-500" />}</>
          </div>
        </CardBody>
      </Card>
      <AddNewPlayerModal isOpen={isOpen} onOpenChange={onOpenChange} />
    </>
  );
}

interface TimelineOutlineProps {
  // timeline: Timeline | undefined;
}

export default function TimelineOutline() {
  const timelineModel = useEditorStore((state) => state.timelineModel);
  return (
    <div className="basis-1/5 bg-content2">
      <div
        className="h-[30px] content-center px-2 bg-content1"
        id="outline-header"
      >
        <p className="text-xs text-center">Character List \ Timeline</p>
      </div>
      {timelineModel?.rows?.length > 0 ? (
        <div>
          {timelineModel?.rows.map((row, index) => {
            return (
              <OutlineNode
                key={row.id ?? "row" + index.toString()}
                // timeline={timeline}
                index={index}
                rowId={row.id ?? "row" + index.toString()}
              />
            );
          })}
          <OutlineNodeAddNewPlayer />
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}
