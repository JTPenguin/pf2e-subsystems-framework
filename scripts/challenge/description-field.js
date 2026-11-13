/**
 * The look of the toggled description editors (Subject and Action descriptions, GM notes). Foundry's toggled <prose-mirror> has no
 * placeholder and shows its edit button on hover only. Here an empty one is a dashed box saying "Click to add a description" that
 * opens the editor on a click. A filled one shows its edit button on hover, set in to clear the scrollbar (styles: .ssm-description-*).
 */

/** Content that counts as filled even with no text. */
const MEDIA = "img, video, audio, iframe, table, hr";

/** Mark each toggled editor in `root` as empty or filled, and open an empty one on a click. Call on every render. */
export function markDescriptionFields(root) {
  if (!root) return;
  for (const editor of root.querySelectorAll("prose-mirror[toggled]")) markField(editor);
  if (watched.has(root)) return;
  watched.add(root);
  root.addEventListener("click", onClick);
  // Foundry redraws the shown text when the editor closes.
  root.addEventListener("close", (event) => event.target.matches?.("prose-mirror[toggled]") && markField(event.target));
}

const watched = new WeakSet();

function markField(editor) {
  const content = editor.querySelector(":scope > .editor-content");
  if (!content) return;
  content.dataset.placeholder = game.i18n.localize("SSM.Challenge.DescriptionPlaceholder");
  const empty = !content.textContent.trim() && !content.querySelector(MEDIA);
  editor.classList.add("ssm-description-field");
  editor.classList.toggle("ssm-description-empty", empty);
}

function onClick(event) {
  const editor = event.target.closest?.("prose-mirror.ssm-description-empty.inactive");
  if (!editor || editor.disabled || event.target.closest("button")) return;
  // The click was into the box, so the cursor goes there, ready to type.
  editor.addEventListener("open", () => editor.focus(), { once: true });
  editor.open = true;
}
