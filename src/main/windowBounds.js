export const BASELINE_DISPLAY = { width: 1920, height: 1080 }
export const BASELINE_WINDOW = { width: 900, height: 670 }

export function calculateWindowBounds(display) {
    const displaySize = display.size || display.workAreaSize
    const workArea = display.workArea || { x: 0, y: 0, ...display.workAreaSize }
    const scale = Math.min(
        displaySize.width / BASELINE_DISPLAY.width,
        displaySize.height / BASELINE_DISPLAY.height
    )
    const width = Math.min(Math.round(BASELINE_WINDOW.width * scale), workArea.width)
    const height = Math.min(Math.round(BASELINE_WINDOW.height * scale), workArea.height)

    return {
        width,
        height,
        x: workArea.x + Math.floor((workArea.width - width) / 2),
        y: workArea.y + Math.floor((workArea.height - height) / 2)
    }
}
