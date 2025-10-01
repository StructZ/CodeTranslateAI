let hoveredElement = null;
let currentClickHandler = null;

function onMouseOver(e) {
  hoveredElement = e.target;
  hoveredElement.classList.add("translator-highlight");
}

function onMouseOut(e) {
  e.target.classList.remove("translator-highlight");
  hoveredElement = null;
}

function disablePicker() {
  document.body.style.cursor = "default";
  if (hoveredElement) {
    hoveredElement.classList.remove("translator-highlight");
  }
  document.removeEventListener("mouseover", onMouseOver);
  document.removeEventListener("mouseout", onMouseOut);
  if (currentClickHandler) {
    document.removeEventListener("click", currentClickHandler, true);
  }
}

export function enablePicker(onClickCallback) {
  document.body.style.cursor = "crosshair";
  currentClickHandler = (e) => {
    disablePicker();
    onClickCallback(e);
  };
  document.addEventListener("mouseover", onMouseOver);
  document.addEventListener("mouseout", onMouseOut);
  document.addEventListener("click", currentClickHandler, true);
}
