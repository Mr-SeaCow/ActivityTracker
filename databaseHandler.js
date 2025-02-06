const util = require('util')
const mysql = require('mysql');
class DatabaseHandler {

    constructor(options) {
        this.intervalTimer = options.intervalTimer;
        this.dbSettings = options.dbSettings;
        this.pool = mysql.createPool(this.dbSettings);
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

        this.pool.getConnection((err, connection) => {
            if (err) {
              if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                console.error('Database connection was closed.')
              }
              if (err.code === 'ER_CON_COUNT_ERROR') {
                console.error('Database has too many connections.')
              }
              if (err.code === 'ECONNREFUSED') {
                console.error('Database connection was refused.')
              }
            }
          
            if (connection) connection.release()
          
            return
        })
        this.pool.query = util.promisify(this.pool.query);
    }

    async insertMessage(timestamp, userID, messageCount) {
        await this.tempStore.messages.push([timestamp, userID, messageCount]);
    }

    async getMessages() {
        let sqlQuery = 'SELECT * FROM `Messages` ORDER BY `Timestamp` ASC;';
        let res = await this._query(sqlQuery);
        console.log(res)    
        return this.db.messages
    }
    /*
    INSERT INTO tbl_name
    (a,b,c)
    VALUES
    (1,2,3),
    (4,5,6),
    (7,8,9);
    */

    // INSERT INTO `Messages` (`ID`, `Timestamp`, `UserID`, `MessageCount`) VALUES (NULL, '2025-02-11 22:56:35', '176532282935345153', '10');
    async insertMessagesDB(messages) {
        if (messages.length == 0)
            return;
        if (this.debug)
            console.log(messages)
        this.db.messages.push(...messages);
        let sqlQuery = 'INSERT INTO `Messages` (`ID`, `Timestamp`, `UserID`, `MessageCount`) VALUES ';

        for (let i = 0; i < messages.length; i++) {
            sqlQuery += `(NULL, '${messages[i][0]}', '${messages[i][1]}', '${messages[i][2]}'),`;
        }
        sqlQuery = sqlQuery.substring(0, sqlQuery.length - 1);
        let res = await this._query(sqlQuery);
        console.log(res)
        return res
    }
    
    async insertVoiceStatus(timestamp, userID, status) {        
        await this.tempStore.voiceStatus.push([timestamp, userID, status]);
    }

    async getVoiceStatus() {
        let sqlQuery = 'SELECT * FROM `Voice` ORDER BY `Timestamp` ASC;';
        let res = await this._query(sqlQuery);
        console.log(res)
        return res
    }

    // INSERT INTO `Voice` (`ID`, `Timestamp`, `UserID`, `Status`) VALUES (NULL, '2025-02-11 22:55:35', '373669826859761664', 'JOIN');
    async insertVoiceStatusDB(voiceStatus) {
        if (voiceStatus.length == 0)
            return;
        this.db.voiceStatus.push(...voiceStatus);
        let sqlQuery = 'INSERT INTO `Voice` (`ID`, `Timestamp`, `UserID`, `Status`) VALUES ';
        for (let i = 0; i < voiceStatus.length; i++) {
            sqlQuery += `(NULL, '${voiceStatus[i][0]}', '${voiceStatus[i][1]}', '${voiceStatus[i][2]}'),`;
        }
        sqlQuery = sqlQuery.substring(0, sqlQuery.length - 1);
        let res = await this._query(sqlQuery);
        console.log(res)
        return res
    }

    async _query(sql) {
        try {
            let result = this.pool.query(sql);
            return result;
        } catch (err) {
            this.pool.query("ROLLBACK");
            console.log('ROLLBACK at dbQuery', err);
            throw err;
        }
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





// setInterval(() => {
//     let m = tempStore.messages;
//     let v = tempStore.voiceStatus;
//     let tempM = {};
//     tempStore.messages = [];
//     tempStore.voiceStatus = [];
//     for (let i = 0; i < m.length; i++) {
//         if (tempM[m[i][1]]) {
//             tempM[m[i][1]][2] += m[i][2];
//             tempM[m[i][1]][0] = m[i][0];
//         } else {
//             tempM[m[i][1]] = m[i];
//         }
//     }
//     for (const key in tempM) {
//         db.messages.push(tempM[key]);
//     }

//     db.voiceStatus.push(...v);
// }, 10000)


module.exports = {DatabaseHandler};