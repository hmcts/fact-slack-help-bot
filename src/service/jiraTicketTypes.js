class JiraType {
    static ISSUE = new JiraType('Task', 3, 'Support request');
    static BUG = new JiraType('Bug', 10900, 'Bug');

    constructor(name, id, requestType) {
        this.name = name
        this.id = id
        this.requestType = requestType
    }
}

module.exports = {
    JiraType
}
