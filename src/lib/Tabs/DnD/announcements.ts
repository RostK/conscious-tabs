import type { Announcements, ScreenReaderInstructions } from "@dnd-kit/core";

import type { GroupItem, TabItem } from "../types.ts";
import type { DefaultDrag, DZCurrentData } from "./useDropzone.tsx";

/**
 * What a screen reader is told while a row is being moved — SPEC-04 AC-15.
 *
 * dnd-kit's defaults speak "Picked up draggable item 2877238473248723", which
 * is the id of a tab and nothing a person can use. These say what is being
 * moved and where it would land instead, in the words of what each dropzone's
 * handler actually does, and **never say an id**: nothing here reads `id`
 * except to compare two of them.
 *
 * Plain functions of dnd-kit's own arguments, so the wording is testable
 * without mounting a drag — jsdom cannot drive dnd-kit's collision detection,
 * but it does not need to for a string.
 *
 * Every value is a string handed to dnd-kit, which renders it as a text node:
 * never markup, never a selector (AC-24). Tab and group titles are untrusted —
 * they are whatever a web page called itself — and reach speech only as text.
 */

type Dragged = DefaultDrag | undefined;

/** A trimmed, non-empty string, or nothing: titles are untrusted. */
const textOf = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/**
 * What is being moved. `start` is for the front of a sentence, where a
 * generic noun wants a capital; a title is left exactly as the page wrote it.
 */
const subjectOf = (drag: Dragged, start = false): string => {
  if (Array.isArray(drag)) {
    return `${drag.length} tab${drag.length === 1 ? "" : "s"}`;
  }
  if (drag?.type === "group") {
    return `${start ? "Group" : "group"} ${textOf(drag.title) ?? "Untitled"}`;
  }
  if (drag?.type === "tab") {
    return textOf(drag.title) ?? (start ? "Untitled tab" : "untitled tab");
  }
  return start ? "Item" : "item";
};

// "Before tab." is what a bare "tab" comes out as, and it sounds like a
// sentence that lost a word. Heard in a browser, 2026-10-02.
const tabName = (tab: TabItem): string =>
  textOf(tab.title) ?? "untitled tab";
const groupName = (group: GroupItem): string =>
  `group ${textOf(group.title) ?? "Untitled"}`;

/**
 * Where a drop on this zone would put the thing, as the zone's handler would.
 *
 * - `at` — a place. `over` is the phrase to speak while hovering, `drop` the
 *   one for the result, because "End of window" and "to the end of the window"
 *   are the same place and not the same sentence.
 * - `own` — the item's own spot, which is a no-op.
 * - `nowhere` — a zone that would do nothing with this item (a group over a
 *   group's inner half, where `handleInnerDrop` returns without acting).
 * - `unknown` — a zone this file has no wording for. Silent while hovering,
 *   and not claimed to have moved anything when dropped.
 */
type Place =
  | { kind: "at"; over: string; drop: string }
  | { kind: "own" }
  | { kind: "nowhere" }
  | { kind: "unknown" };

const OWN: Place = { kind: "own" };
const NOWHERE: Place = { kind: "nowhere" };
const UNKNOWN: Place = { kind: "unknown" };

// A zone's `data` is typed `unknown`, and it is only as trustworthy as the
// component that registered it.
const hasType = (value: unknown, type: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === type;
const isTab = (value: unknown): value is TabItem => hasType(value, "tab");
const isGroup = (value: unknown): value is GroupItem => hasType(value, "group");

const placeOf = (drag: Dragged, zone: DZCurrentData | undefined): Place => {
  if (!zone) return UNKNOWN;
  const data = zone.data;
  const draggedGroup = isGroup(drag) ? drag : undefined;

  switch (zone.type) {
    // tabs/Tab/handleDrop: `moveTabsOnTab` puts the thing at the target's
    // index, so it lands in front of that tab — and, for a tab dropped on one
    // that belongs to a group, in that group (`chrome.tabs.group`).
    case "tab": {
      if (!isTab(data)) return UNKNOWN;
      // Only a single tab can be over its own place. A selection dropped on
      // one of its own tabs is still moved — `handleDrop` runs `moveTabsOnTab`
      // for every array — so calling that "where it started" was a lie the
      // drop then contradicted. Found in review.
      if (!Array.isArray(drag) && drag?.type === "tab" && drag.id === data.id) {
        return OWN;
      }
      const joins = !draggedGroup && data.groupId >= 0;
      const tail = joins ? ", in its group" : "";
      return {
        kind: "at",
        over: `Before ${tabName(data)}${tail}`,
        drop: `before ${tabName(data)}${tail}`,
      };
    }
    // TabsGroup/handleDrop: the header's zone passes `forceUngroup`, so a tab
    // lands in front of the group and outside it; a group lands in front too.
    case "group": {
      if (!isGroup(data)) return UNKNOWN;
      if (draggedGroup?.id === data.id) return OWN;
      return {
        kind: "at",
        over: `Before ${groupName(data)}`,
        drop: `before ${groupName(data)}`,
      };
    }
    // TabsGroup/handleInnerDrop: a tab joins the group; a selection goes to
    // the group's first tab's index and is grouped by it; a group does nothing.
    case "group-inner": {
      if (!isGroup(data)) return UNKNOWN;
      if (draggedGroup) return draggedGroup.id === data.id ? OWN : NOWHERE;
      return {
        kind: "at",
        over: `Into ${groupName(data)}`,
        drop: `into ${groupName(data)}`,
      };
    }
    // Window/handleDrop: index -1, the end of that window.
    case "window-end":
      return {
        kind: "at",
        over: "End of window",
        drop: "to the end of the window",
      };
    // Window/handleInnerDrop: index 0, the start of that window — what the
    // window's own header row is.
    case "in-window":
      return {
        kind: "at",
        over: "Start of window",
        drop: "to the start of the window",
      };
    default:
      return UNKNOWN;
  }
};

const dragOf = (active: { data: { current?: unknown } }): Dragged =>
  active.data.current as Dragged;
const zoneOf = (over: { data: { current?: unknown } } | null) =>
  over ? (over.data.current as DZCurrentData | undefined) : undefined;

/**
 * The pick-up sentence, for as long as it could still be cut off.
 *
 * A tab row is removed the moment it is picked up, the row below slides into
 * its place, and dnd-kit reports that row as the first thing the drag is over.
 * Measured in a browser: "Picked up X." was replaced by "Before Y." 55 ms
 * later, which leaves a screen reader no time to say what is being moved. So
 * the first place spoken soon after a pick-up carries the pick-up with it.
 *
 * Module state, and reset at every end and cancel: dnd-kit calls these one
 * drag at a time.
 */
const PICKUP_FOLD_MS = 500;
let pickedUp: { sentence: string; at: number } | undefined;

export const dragAnnouncements: Announcements = {
  onDragStart: ({ active }) => {
    const sentence = `Picked up ${subjectOf(dragOf(active))}.`;
    pickedUp = { sentence, at: Date.now() };
    return sentence;
  },

  // Silence over nothing: a pointer or arrow passing through gaps would
  // otherwise read out a sentence per gap, and the last real one is still true.
  onDragOver: ({ active, over }) => {
    if (!over) return undefined;
    const drag = dragOf(active);
    const place = placeOf(drag, zoneOf(over));
    const lead =
      pickedUp && Date.now() - pickedUp.at <= PICKUP_FOLD_MS
        ? pickedUp.sentence
        : undefined;
    if (place.kind === "at") {
      pickedUp = undefined;
      return lead ? `${lead} ${place.over}.` : `${place.over}.`;
    }
    if (place.kind === "own") {
      // Straight after the pick-up this adds nothing, and saying it would cut
      // the pick-up off. The same sentence again changes nothing in the live
      // region, so nothing is re-read.
      if (lead) return lead;
      return `${subjectOf(drag, true)}, where it started.`;
    }
    return undefined;
  },

  onDragEnd: ({ active, over }) => {
    pickedUp = undefined;
    const drag = dragOf(active);
    if (!over) return `${subjectOf(drag, true)} put back.`;
    const place = placeOf(drag, zoneOf(over));
    if (place.kind === "at") {
      return `Moved ${subjectOf(drag)} ${place.drop}.`;
    }
    if (place.kind === "unknown") return `Dropped ${subjectOf(drag)}.`;
    return `${subjectOf(drag, true)} put back.`;
  },

  onDragCancel: ({ active }) => {
    pickedUp = undefined;
    return `Cancelled. ${subjectOf(dragOf(active), true)} put back.`;
  },
};

/**
 * Read once by the handle (`aria-describedby`), before the drag starts. It
 * names the same keys DnD's KeyboardSensor binds — Space or Enter to pick up
 * and to drop, the arrows to move, Escape to cancel (SPEC-04 DEC-4, §1.6).
 */
export const dragInstructions: ScreenReaderInstructions = {
  draggable:
    "Press Space or Enter to pick up. Arrow keys move it, Space or Enter drops it, Escape cancels.",
};
