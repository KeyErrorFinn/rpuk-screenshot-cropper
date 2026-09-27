export function createObjectUrlCache({ limit, revoke = (value) => URL.revokeObjectURL(value) }) {
    const entries = new Map()
    return {
        get(key) {
            if (!entries.has(key)) return undefined
            const value = entries.get(key)
            entries.delete(key)
            entries.set(key, value)
            return value
        },
        has: (key) => entries.has(key),
        set(key, value) {
            if (entries.has(key)) revoke(entries.get(key))
            entries.delete(key)
            entries.set(key, value)
            while (entries.size > limit) {
                const [oldestKey, oldestValue] = entries.entries().next().value
                entries.delete(oldestKey)
                revoke(oldestValue)
            }
            return value
        },
        clear() {
            entries.forEach(revoke)
            entries.clear()
        },
        delete(key) {
            if (!entries.has(key)) return false
            revoke(entries.get(key))
            return entries.delete(key)
        },
        get size() {
            return entries.size
        }
    }
}
