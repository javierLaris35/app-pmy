import { describe, it, expect } from "vitest"
import { toggleSelection, summarizeSelection } from "@/lib/filter-chip-logic"

describe("toggleSelection", () => {
  it("multiple: adds a value when absent", () => {
    expect(toggleSelection([], "a", true)).toEqual(["a"])
    expect(toggleSelection(["a"], "b", true)).toEqual(["a", "b"])
  })

  it("multiple: removes a value when present", () => {
    expect(toggleSelection(["a", "b"], "a", true)).toEqual(["b"])
  })

  it("single: replaces selection with the picked value", () => {
    expect(toggleSelection([], "a", false)).toEqual(["a"])
    expect(toggleSelection(["a"], "b", false)).toEqual(["b"])
  })

  it("single: picking the already-selected value clears it", () => {
    expect(toggleSelection(["a"], "a", false)).toEqual([])
  })
})

describe("summarizeSelection", () => {
  const options = [
    { label: "Uno", value: "1" },
    { label: "Dos", value: "2" },
    { label: "Tres", value: "3" },
  ]

  it("reports zero when nothing is selected", () => {
    expect(summarizeSelection(options, [])).toEqual({ count: 0, labels: [], overflow: false })
  })

  it("lists labels (in options order) when at or under maxLabels", () => {
    expect(summarizeSelection(options, ["2", "1"])).toEqual({
      count: 2,
      labels: ["Uno", "Dos"],
      overflow: false,
    })
  })

  it("overflows when selected count exceeds maxLabels", () => {
    expect(summarizeSelection(options, ["1", "2", "3"])).toEqual({
      count: 3,
      labels: [],
      overflow: true,
    })
  })

  it("honors a custom maxLabels", () => {
    expect(summarizeSelection(options, ["1", "2", "3"], 3)).toEqual({
      count: 3,
      labels: ["Uno", "Dos", "Tres"],
      overflow: false,
    })
  })
})
