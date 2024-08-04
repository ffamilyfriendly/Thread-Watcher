export default class Chunkable<T> {
    private inner: T[] = []
    private pointer = 0
    public chunkSize = 25
    
    constructor(chunkSize: number) {
        this.chunkSize = chunkSize
    }

    get current() {
        return this.getChunk(this.pointer)
    }

    add(item: T|T[]) {
        if(!(item instanceof Array)) item = [ item ]
        this.inner.push(...item)
    }

    getChunk(index: number): T[] {
        const start = this.chunkSize * index
        return this.inner.slice(start, start + this.chunkSize)
    }

    forwards(): T[] {
        this.pointer++
        return this.getChunk(this.pointer)
    }

    back(): T[] {
        this.pointer = Math.max(0, this.pointer - 1)
        return this.getChunk(this.pointer)
    }

    next(): T[]|false {
        const res = (this.chunkSize * this.pointer) < this.inner.length

        if(res) {
            const curr = this.current
            this.pointer++
            return curr
        }
        else return false
    }

    static from<T>(arr: T[], chunkSize = 25): Chunkable<T> {
        const instance = new Chunkable<T>(chunkSize)
        instance.add(arr)

        return instance
    }
}

