import { useCallback, useEffect, useRef, useState } from 'react'

export function useActivityCenter() {
    const [open, setOpen] = useState(false)
    const [activities, setActivities] = useState([])
    const [loaded, setLoaded] = useState(false)
    const retryActions = useRef(new Map())

    useEffect(() => {
        window.api
            .getPreference('activityHistory')
            .then((history) => {
                if (Array.isArray(history))
                    setActivities(
                        history
                            .slice(0, 50)
                            .map((item) =>
                                item.retry === 'session' ? { ...item, retry: undefined } : item
                            )
                    )
            })
            .finally(() => setLoaded(true))
    }, [])
    useEffect(() => {
        if (loaded) window.api.setPreference('activityHistory', activities.slice(0, 50))
    }, [activities, loaded])
    useEffect(
        () =>
            window.api.onOperationProgress((progress) =>
                setActivities((previous) =>
                    previous.map((item) =>
                        item.status === 'running' &&
                        item.title
                            .toLowerCase()
                            .startsWith(progress.type === 'crop' ? 'cropping' : 'uploading')
                            ? { ...item, progress: progress.value }
                            : item
                    )
                )
            ),
        []
    )

    const begin = useCallback((title, detail, retry, retryAction) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        if (retryAction) retryActions.current.set(id, retryAction)
        setActivities((previous) =>
            [
                {
                    id,
                    title,
                    detail,
                    retry,
                    status: 'running',
                    createdAt: new Date().toISOString()
                },
                ...previous
            ].slice(0, 50)
        )
        return id
    }, [])
    const finish = useCallback(
        (id, status, detail) =>
            setActivities((previous) =>
                previous.map((item) =>
                    item.id === id ? { ...item, status, detail: detail || item.detail } : item
                )
            ),
        []
    )
    const setRetry = useCallback((id, action) => retryActions.current.set(id, action), [])
    const runRetry = useCallback((item) => {
        const action = retryActions.current.get(item.id)
        if (!action) return false
        setActivities((previous) =>
            previous.map((activity) =>
                activity.id === item.id
                    ? { ...activity, status: 'queued', detail: 'Retry started' }
                    : activity
            )
        )
        action()
        return true
    }, [])
    const clearFinished = useCallback(
        () => setActivities((previous) => previous.filter((item) => item.status === 'running')),
        []
    )
    return { open, setOpen, activities, begin, finish, setRetry, runRetry, clearFinished }
}
