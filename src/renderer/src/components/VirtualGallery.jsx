/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'

function VirtualRow({ entries, columns, renderItem }) {
    const rowRef = useRef(null)
    const [nearViewport, setNearViewport] = useState(false)
    useEffect(() => {
        const row = rowRef.current
        if (!row) return undefined
        const observer = new IntersectionObserver(
            ([entry]) => setNearViewport(entry.isIntersecting),
            { rootMargin: '700px 0px' }
        )
        observer.observe(row)
        return () => observer.disconnect()
    }, [])
    return (
        <div
            ref={rowRef}
            className="grid gap-3"
            style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                aspectRatio: `${columns * 16} / 9`
            }}
        >
            {nearViewport ? entries.map(renderItem) : null}
        </div>
    )
}

export default function VirtualGallery({ items, columns, renderItem, className = '' }) {
    const rows = []
    for (let index = 0; index < items.length; index += columns)
        rows.push(items.slice(index, index + columns))
    return (
        <div className={`space-y-3 ${className}`}>
            {rows.map((row, rowIndex) => (
                <VirtualRow
                    key={row.map((item) => item.key).join('|') || rowIndex}
                    entries={row}
                    columns={columns}
                    renderItem={renderItem}
                />
            ))}
        </div>
    )
}
