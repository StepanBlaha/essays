export type BookData = {
  id: string
  title: string
  author: string
  description: string
  /** matte spine / cover color */
  color: string
}

// Restrained, muted palette — modern minimal.
export const BOOKS: BookData[] = [
  { id: "quiet-structures", title: "Quiet Structures", author: "M. Halden", description: "On the architecture of stillness and the spaces we leave intentionally empty.", color: "#c8c2b6" },
  { id: "grain", title: "Grain", author: "L. Sato", description: "A study of texture, material honesty, and the beauty of the unfinished surface.", color: "#b7796a" },
  { id: "north-light", title: "North Light", author: "E. Vold", description: "Essays on cold clarity, long winters, and the discipline of restraint.", color: "#7f8a80" },
  { id: "paper-weight", title: "Paper Weight", author: "R. Innes", description: "Small objects, careful attention, and the quiet gravity of everyday things.", color: "#3f4247" },
  { id: "dune-sequence", title: "Dune Sequence", author: "A. Merle", description: "Movement across shifting ground, and the shapes wind leaves behind.", color: "#d8c9a3" },
  { id: "slow-water", title: "Slow Water", author: "J. Park", description: "Reflections on patience, tide, and the long work of erosion.", color: "#5f7480" },
  { id: "off-white", title: "Off White", author: "C. Dane", description: "Notes toward a theory of near-neutrals and the color of restraint.", color: "#e6e1d7" },
]
