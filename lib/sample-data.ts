import type { Bundle } from "@/lib/share";

/**
 * A small demo library, seeded once on first load (see app/page.tsx).
 * Uses the same portable shape as an imported collection.
 */
export const SAMPLE_BUNDLE: Bundle = {
  format: "candlelight-collection",
  version: 1,
  exportedAt: 0,
  books: [
    {
      title: "On Stillness",
      author: "M. Halden",
      description: "Essays on the architecture of quiet.",
      color: "#7f8a80",
      essays: [
        {
          title: "The Quiet Hour",
          createdAt: 0,
          text: "The house is still. Light comes in low and slow across the floorboards.",
          html: "<h2>Morning</h2><p>The house is <strong>still</strong>. Light comes in low and slow across the floorboards, and for a while nothing is asked of anyone.</p><p>I have been trying to notice these hours before they dissolve into the <em>ordinary business</em> of the day.</p><ul><li>First, the kettle.</li><li>Then the window.</li><li>Then, if I am lucky, a sentence.</li></ul><blockquote>Attention is the rarest and purest form of generosity.</blockquote>",
        },
        {
          title: "Rooms We Leave Empty",
          createdAt: 0,
          text: "A room kept empty is not wasted. It is held in reserve for something you cannot yet name.",
          html: "<p>A room kept empty is not wasted. It is <em>held in reserve</em> for something you cannot yet name.</p><p>We fill space the way we fill time - anxiously, and then wonder why neither one breathes.</p><h3>A short list of empty things</h3><ul><li>The margin of a page.</li><li>The pause before an answer.</li><li>The hallway no one decorates.</li></ul>",
        },
      ],
    },
    {
      title: "Grain",
      author: "L. Sato",
      description: "On texture, material honesty, and the unfinished surface.",
      color: "#b7796a",
      essays: [
        {
          title: "The Honest Surface",
          createdAt: 0,
          text: "A surface that hides its making asks nothing of you. A surface that shows it invites your hand.",
          html: "<p>A surface that hides its making asks nothing of you. A surface that <strong>shows</strong> it invites your hand.</p><p>The old joiners left tool marks not from carelessness but confidence - the plane was <em>meant</em> to be felt.</p><blockquote>Perfection conceals labor. Craft reveals it.</blockquote>",
        },
        {
          title: "Unfinished",
          createdAt: 0,
          text: "Some things are better left at ninety percent, where the intention still shows through.",
          html: "<p>Some things are better left at ninety percent, where the <em>intention</em> still shows through.</p><p>The last ten percent is often <s>polish</s> apology - a smoothing-over of everything that made the thing yours.</p>",
        },
      ],
    },
    {
      title: "North Light",
      author: "E. Vold",
      description: "Cold clarity, long winters, and the discipline of restraint.",
      color: "#5f7480",
      essays: [
        {
          title: "Cold Clarity",
          createdAt: 0,
          text: "Winter light is unflattering and therefore true. It shows the room as it is.",
          html: "<h2>Due North</h2><p>Winter light is unflattering and therefore <strong>true</strong>. It shows the room as it is, not as the afternoon would like to flatter it.</p><p>Painters chase the north window for exactly this reason: it does not <em>change its mind</em>.</p><ol><li>Face the cold.</li><li>Draw what you see.</li><li>Resist the urge to warm it.</li></ol>",
        },
      ],
    },
  ],
};
