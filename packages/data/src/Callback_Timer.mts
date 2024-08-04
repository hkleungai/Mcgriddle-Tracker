export default class Callback_Timer {
    static call<Y>(cb: () => Y              ):  ReturnType<typeof cb>;
    static call<Y>(cb: () => Promise<Y>     ):  ReturnType<typeof cb>;
    static call<Y>(cb: () => Y | Promise<Y> ) {
        console.time(cb.name);

        let result: Y | Promise<Y>

        // cb() can be sync or async, cannot add await keyword here
        try {
            result = cb();
        } catch (error) {
            // Non-awaited async cb() is just a promise, which will not be thrown.
            // Hence we are handling a sync-thrown case here.
            console.timeEnd(cb.name);
            throw error;
        }

        // Handle async-done / async-thrown cases here
        if (result instanceof Promise) {
            return result.finally(() => console.timeEnd(cb.name));
        }

        // Handle sync-done here
        console.timeEnd(cb.name);
        return result;
    }

    static wrap<X extends unknown[], Y>(cb: (...args: [...X]) => Y              ):  typeof cb
    static wrap<X extends unknown[], Y>(cb: (...args: [...X]) => Promise<Y>     ):  typeof cb
    static wrap<X extends unknown[], Y>(cb: (...args: [...X]) => Y | Promise<Y> ) {
        const alias = (alias_cb: typeof cb) => (
            Object.defineProperty(alias_cb, 'name', { value: cb.name })
        )
        return alias((...args: [...X]) => Callback_Timer.call(alias(() => cb(...args))));
    }
}
