/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'

const LazyThumbnail = ({ src, loadSrc, alt, className }) => {
    const elementRef = useRef(null)
    const [visible, setVisible] = useState(false)
    const [loadedSrc, setLoadedSrc] = useState(src || null)
    useEffect(() => {
        const element = elementRef.current
        if (!element || visible) return undefined
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '320px' }
        )
        observer.observe(element)
        return () => observer.disconnect()
    }, [visible])
    useEffect(() => {
        if (src) setLoadedSrc(src)
    }, [src])
    useEffect(() => {
        let cancelled = false
        if (!visible || loadedSrc || !loadSrc) return undefined
        Promise.resolve(loadSrc())
            .then((value) => {
                if (!cancelled) setLoadedSrc(value)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [loadSrc, loadedSrc, visible])
    return (
        <div ref={elementRef} className="h-full w-full bg-white/[0.03]">
            {visible && loadedSrc && (
                <img
                    src={loadedSrc}
                    alt={alt}
                    className={className}
                    loading="lazy"
                    draggable={false}
                />
            )}
        </div>
    )
}

export default LazyThumbnail
