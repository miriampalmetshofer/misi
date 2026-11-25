// iOS keyboards shrink the visual viewport without resizing fixed-position layouts.
export function fitVisualViewport(node: HTMLDivElement | null) {
  const viewport = window.visualViewport;
  if (!node || !viewport) return;
  const update = () => {
    node.style.top = `${viewport.offsetTop}px`;
    node.style.height = `${viewport.height}px`;
  };
  update();
  viewport.addEventListener("resize", update);
  viewport.addEventListener("scroll", update);
  return () => {
    viewport.removeEventListener("resize", update);
    viewport.removeEventListener("scroll", update);
  };
}
