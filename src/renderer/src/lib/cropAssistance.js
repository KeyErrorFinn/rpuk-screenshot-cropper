function lineScore(data, width, height, edge, index) {
    const values = []
    const samples = edge === 'top' || edge === 'bottom' ? width : height
    const stride = Math.max(1, Math.floor(samples / 80))
    for (let position = 0; position < samples; position += stride) {
        const x = edge === 'left' ? index : edge === 'right' ? width - 1 - index : position
        const y = edge === 'top' ? index : edge === 'bottom' ? height - 1 - index : position
        const offset = (y * width + x) * 4
        values.push((data[offset] + data[offset + 1] + data[offset + 2]) / 3)
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
    return { mean, deviation: Math.sqrt(variance) }
}

export function suggestCropInsetsFromPixels(data, width, height) {
    return analyseCropInsetsFromPixels(data, width, height).insets
}

export function analyseCropInsetsFromPixels(data, width, height) {
    const suggestion = { top: 0, right: 0, bottom: 0, left: 0 }
    const edgeConfidence = {}
    for (const edge of Object.keys(suggestion)) {
        const dimension = edge === 'top' || edge === 'bottom' ? height : width
        const maximum = Math.floor(dimension * 0.2)
        let lastUniformScore = null
        let boundaryScore = null
        for (let index = 0; index < maximum; index += 1) {
            const score = lineScore(data, width, height, edge, index)
            if (score.mean < 72 && score.deviation < 38) {
                suggestion[edge] = index + 1
                lastUniformScore = score
            } else if (index > 2) {
                boundaryScore = score
                break
            }
        }
        if (!suggestion[edge]) edgeConfidence[edge] = 0
        else {
            const contrast = Math.max(0, (boundaryScore?.mean || 72) - lastUniformScore.mean)
            edgeConfidence[edge] = Math.min(
                1,
                Math.max(
                    0,
                    (72 - lastUniformScore.mean) / 120 +
                        (38 - lastUniformScore.deviation) / 95 +
                        contrast / 140
                )
            )
        }
    }
    const detected = Object.keys(suggestion).filter((edge) => suggestion[edge] > 0)
    const confidence = detected.length
        ? detected.reduce((sum, edge) => sum + edgeConfidence[edge], 0) / detected.length
        : 0
    return { insets: suggestion, confidence, edgeConfidence }
}

export function combineCropAnalyses(analyses) {
    if (!analyses.length)
        return { insets: { top: 0, right: 0, bottom: 0, left: 0 }, confidence: 0, sampleCount: 0 }
    const insets = {}
    const agreements = []
    for (const edge of ['top', 'right', 'bottom', 'left']) {
        const values = analyses.map((result) => result.insets[edge]).sort((a, b) => a - b)
        const median = values[Math.floor(values.length / 2)]
        insets[edge] = median
        agreements.push(1 - Math.min(1, (values.at(-1) - values[0]) / Math.max(4, median || 4)))
    }
    const meanConfidence =
        analyses.reduce((sum, result) => sum + result.confidence, 0) / analyses.length
    return {
        insets,
        confidence:
            (meanConfidence * agreements.reduce((sum, value) => sum + value, 0)) /
            agreements.length,
        sampleCount: analyses.length
    }
}
