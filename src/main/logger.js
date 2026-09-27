import { join } from 'node:path'

export function redactDetails(value) {
    if (Array.isArray(value)) return value.map(redactDetails)
    if (!value || typeof value !== 'object') return value
    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            /token|secret|password/i.test(key) ? key : key,
            /token|secret|password/i.test(key) ? '[redacted]' : redactDetails(item)
        ])
    )
}

export function createLogger({ directory, fileSystem, maxBytes = 2 * 1024 * 1024 }) {
    const logPath = join(directory, 'app.log')
    const previousLogPath = join(directory, 'app.previous.log')
    let queue = Promise.resolve()
    const append = (record) => {
        queue = queue
            .then(async () => {
                await fileSystem.mkdir(directory, { recursive: true })
                const size = await fileSystem
                    .stat(logPath)
                    .then((stats) => stats.size)
                    .catch(() => 0)
                if (size > maxBytes)
                    await fileSystem.rename(logPath, previousLogPath).catch(() => {})
                await fileSystem.appendFile(logPath, `${JSON.stringify(record)}\n`, 'utf8')
            })
            .catch(() => {})
        return queue
    }
    const log = (level, event, details = {}) =>
        append({
            timestamp: new Date().toISOString(),
            level,
            event,
            details: redactDetails(details)
        })
    const readRecent = async (limit = 500) => {
        await queue
        const contents = await Promise.all(
            [previousLogPath, logPath].map((path) =>
                fileSystem.readFile(path, 'utf8').catch(() => '')
            )
        )
        return contents
            .join('')
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(-limit)
            .map((line) => {
                try {
                    return redactDetails(JSON.parse(line))
                } catch {
                    return { timestamp: null, level: 'unknown', event: 'unparseable-log-entry' }
                }
            })
    }
    return {
        info: (event, details) => log('info', event, details),
        error: (event, details) => log('error', event, details),
        flush: () => queue,
        readRecent,
        path: logPath
    }
}
