

let db = {
    messages: [],
    voiceStatus: []
};


let tempStore = {
    messages: [],
    voiceStatus: []
}

class DatabaseHandler {

    constructor(options) {
        this.intervalTimer = options.intervalTimer;
        this.dbSettings = options.dbSettings;
        this.pool; //todo
        this.debug = options.DEBUG;

        // remove this later
        this.db = {
            messages: [],
            voiceStatus: []
        }

        this.tempStore = {
            messages: [],
            voiceStatus: []
        };

        setInterval(this.__intervalFunc.bind(this), this.intervalTimer);
    }

    async insertMessage(timestamp, userID, messageCount) {
        console.log(timestamp)
        await this.tempStore.messages.push([timestamp, userID, messageCount]);
    }

    async getMessages() {
        return this.db.messages
    }

    async insertMessagesDB(messages) {
        if (this.debug)
        console.log(messages)
        this.db.messages.push(...messages);
    }
    
    async insertVoiceStatus(timestamp, userID, status) {        
        await this.tempStore.voiceStatus.push([timestamp, userID, status]);
    }

    async getVoiceStatus() {
        return this.db.voiceStatus        
    }

    async insertVoiceStatusDB(voiceStatus) {
        this.db.voiceStatus.push(...voiceStatus);
    }

    async _query(query) {
        return false;
    }

    clearTempStore() {
        this.tempStore.messages = [];
        this.tempStore.voiceStatus = [];
    }


    async __intervalFunc() {
        let m = this.tempStore.messages;
        let v = this.tempStore.voiceStatus;
        let tempM = {};

        this.clearTempStore();

        for (let i = 0; i < m.length; i++) {
            if (tempM[m[i][1]]) {
                tempM[m[i][1]][2] += m[i][2];
                tempM[m[i][1]][0] = m[i][0];
            } else {
                tempM[m[i][1]] = m[i];
            }
        }
        m = []
        for (const key in tempM) {
            m.push(tempM[key]);
        }

        this.insertMessagesDB(m);


        this.insertVoiceStatusDB(v);
    }
}





setInterval(() => {
    let m = tempStore.messages;
    let v = tempStore.voiceStatus;
    let tempM = {};
    tempStore.messages = [];
    tempStore.voiceStatus = [];
    for (let i = 0; i < m.length; i++) {
        if (tempM[m[i][1]]) {
            tempM[m[i][1]][2] += m[i][2];
            tempM[m[i][1]][0] = m[i][0];
        } else {
            tempM[m[i][1]] = m[i];
        }
    }
    for (const key in tempM) {
        db.messages.push(tempM[key]);
    }

    db.voiceStatus.push(...v);
}, 10000)

/// MESSAGES
// TIMESTAMP USERID MESSAGE COUNT
async function insertMessage(timestamp, userID, messageCount) {
    await tempStore.messages.push([timestamp, userID, messageCount]);
}

async function getMessages() {
    console.log(db.messages)
    return db.messages
}

/// VOICE STATUS
// TIMESTAMP USERID STATUS (JOIN/LEAVE)
async function insertVoiceStatus(timestamp, userID, status) {
    await tempStore.voiceStatus.push([timestamp, userID, status]);
}

async function getVoiceStatus() {
    return db.voiceStatus
}


module.exports = {DatabaseHandler};