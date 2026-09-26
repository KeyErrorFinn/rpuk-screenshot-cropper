export function getImageViewerAction(event) {
    if (event.ctrlKey && event.key.toLowerCase() === "c") return "copy";
    if (event.key === "ArrowLeft") return "previous";
    if (event.key === "ArrowRight") return "next";
    if (event.key === " ") return "select";
    if (event.key === "Escape") return "close";
    return null;
}
