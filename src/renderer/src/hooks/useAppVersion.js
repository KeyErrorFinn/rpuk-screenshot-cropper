import { useEffect, useState } from 'react'

let cachedVersion = ''
let versionRequest

export function useAppVersion() {
    const [version, setVersion] = useState(cachedVersion)

    useEffect(() => {
        if (cachedVersion || !window.api?.getAppVersion) return
        versionRequest ||= window.api.getAppVersion().then((value) => {
            cachedVersion = value
            return value
        })
        versionRequest.then(setVersion).catch(() => {})
    }, [])

    return version
}
