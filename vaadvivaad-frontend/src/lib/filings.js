/**
 * Worked example filings.
 *
 * These seed the empty docket and the New Case templates. They are written the
 * way a good filing reads -- dated, located, specific about what is held and
 * what is not -- because the quality of the intake is what the whole pipeline
 * runs on, and a blank textarea teaches none of that.
 *
 * They are plainly labelled as examples and are never presented as the user's
 * own matters.
 */
export const EXAMPLE_FILINGS = [
  {
    id: "theft",
    tag: "Example · s.379",
    title: "Theft from a locked office",
    incident:
      "On the night of 12 August 2026, a laptop was taken from a locked office at 14 Nehru Road, Pune. " +
      "The door lock showed tool marks. The office was last secured by the night guard at 21:00 and the " +
      "loss was noticed at 08:30 the next morning. The laptop belonged to the firm, not to any individual.",
    evidence: [
      { text: "CCTV footage from the lobby camera, 20:00–09:00", held: true },
      { text: "Statement of the night guard on duty", held: true },
      { text: "Purchase invoice establishing ownership of the laptop", held: true },
      { text: "Forensic report on the tool marks", held: false },
    ],
  },
  {
    id: "cheating",
    tag: "Example · s.420",
    title: "Advance paid, goods never delivered",
    incident:
      "An advance of ₹2,40,000 was paid on 3 March 2026 against a written order for industrial fittings, " +
      "to be delivered within thirty days. Nothing was delivered. The supplier stopped answering calls in " +
      "April and the registered office address on the invoice turned out to be a closed shop.",
    evidence: [
      { text: "Bank transfer receipt for the advance", held: true },
      { text: "Signed purchase order and invoice", held: true },
      { text: "WhatsApp messages promising delivery", held: true },
      { text: "Company registration records for the supplier", held: false },
    ],
  },
  {
    id: "assault",
    tag: "Example · s.323",
    title: "Assault during a parking dispute",
    incident:
      "On 27 July 2026 at about 19:40, an argument over a blocked driveway in Sector 21, Noida, ended with " +
      "the other party striking the complainant twice on the face. The complainant attended a clinic the " +
      "same evening and was treated for a split lip and swelling.",
    evidence: [
      { text: "Medical record and treatment note from the clinic", held: true },
      { text: "Two neighbours who saw the exchange", held: true },
      { text: "Photographs of the injuries taken that night", held: true },
      { text: "Doorbell camera footage from the adjacent house", held: false },
    ],
  },
]

/** The evidence chips serialise back into the single string the API takes, so
 *  none of this needs a backend change. */
export function evidenceToText(items = []) {
  const held = items.filter((i) => i.held).map((i) => i.text)
  const notHeld = items.filter((i) => !i.held).map((i) => i.text)
  const parts = []
  if (held.length) parts.push(`Evidence held: ${held.join("; ")}.`)
  if (notHeld.length) parts.push(`Referred to but not held: ${notHeld.join("; ")}.`)
  return parts.join(" ")
}
