export default class Json_String {
    static build(obj: unknown) { return JSON.stringify(obj, null, 4); }
}
