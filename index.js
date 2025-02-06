const { Client, Events, GatewayIntentBits } = require('discord.js');

const { TOKEN, dbhost, database, dbuser, dbpass  } = require('./config.json');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] });
//const collector = message.createMessageComponentCollector({});
client.on(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});


const { DatabaseHandler } = require('./databaseHandler.js');
const DBHandler = new DatabaseHandler({
  intervalTimer: 60000,
  dbSettings: {
    host: dbhost,
    user: dbuser,
    password: dbpass,
    database: database,
    connectionLimit: 100
  },
  DEBUG: false
});


function getTimestamp() {
  return (new Date()).toISOString().slice(0, 19).replace('T', ' ');
}

const cutOffTime = 604800000;
const DEBUG = false;
const ROLEFLAG = '1328465625743495269';

function convertToTime(timestamp) {
  let days = Math.floor(timestamp / (1000 * 60 * 60 * 24));
  let hours = Math.floor((timestamp % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  let minutes = Math.floor((timestamp % (1000 * 60 * 60)) / (1000 * 60));
  let seconds = Math.floor((timestamp % (1000 * 60)) / 1000);

  let timeString = '';
  timeString += days > 0 ? `${days}d ` : '';
  timeString += hours > 0 ? `${hours}h ` : '';
  timeString += minutes > 0 ? `${minutes}m ` : '';
  timeString += seconds > 0 ? `${seconds}s` : '';

  return timeString;
}

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  const user = message.guild.members.cache.get(message.author.id);

  console.log(message.author.id)
  if (!user.roles.cache.has(ROLEFLAG) || message.author.id === '176532282935345153')
    return;

  if (DEBUG)
    console.log(`User ${message.author.id} sent a message in channel ${message.channelId} at ${message.createdTimestamp}`)
  
  if (message.author.id !== '176532282935345153')
    DBHandler.insertMessage(getTimestamp(), message.author.id, 1);

  if (message.content.startsWith('!activity')) {

    const args = message.content.split(' ');
    let filterNum = 5;

    if (args.length > 1) {
      filterNum = parseInt(args[1]);
      if (isNaN(filterNum))
        filterNum = 5;
    }

  const messages = await DBHandler.getMessages();
  const voice = await DBHandler.getVoiceStatus();
  let Users = {};
  for (let i = 0; i < messages.length; i++) {
    if (Date.parse(messages[i][0]) < Date.now() - cutOffTime)
      continue;
    if (Users[messages[i][1]]) {
      Users[messages[i][1]][2] += messages[i][2];
    } else {
      Users[messages[i][1]] = [...messages[i], []];
    }
  }
  for (let i = 0; i < voice.length; i++) {
    if (Date.parse(voice[i][0]) < Date.now() - cutOffTime)
      continue;
    if (Users[voice[i][1]]) {
      Users[voice[i][1]][3].push([voice[i][0], voice[i][1], voice[i][2]]);
    } else {
      Users[voice[i][1]] = [0, voice[1][1], 0, [[voice[i][0], voice[i][1], voice[i][2]]]];
    }
  }


  for (const key in Users) {
    let totalTime = 0;
    let lastJoinTime = 0;

    for (let i = 0; i < Users[key][3].length; i++) {
      if (Users[key][3][i][2] === 'JOIN') {
        lastJoinTime = Date.parse(Users[key][3][i][0]);
      } else if (Users[key][3][i][2] === 'LEAVE') {
        if (lastJoinTime === 0)
          continue;
        totalTime += Date.parse(Users[key][3][i][0]) - lastJoinTime;
        lastJoinTime = 0;
      }
    }
    if (lastJoinTime !== 0)
      totalTime += Date.parse(getTimestamp()) - lastJoinTime;

    Users[key][3] = `${(totalTime)}`;
  }

  let ara = [['Username', 'Messages', 'Voice Time', 'Activity']];

  for (const key in Users) {
    const tUser = message.guild.members.cache.get(Users[key][1]);
    ara.push([tUser.user.username, Users[key][2], convertToTime(Users[key][3], 'Activity'), ((Users[key][2] + Math.floor((Users[key][3] / (1000 * 60 * 5)))))]);
  }

  ara = ara.sort(function (a, b) {
    return b.Activity - a.Activity;
  });

  ara = ara.slice(0, filterNum + 1);

  let colLengths = [8, 8, 10, 8]
  let headerLengths = [8, 8, 10, 8]

  for (let i = 1; i < ara.length; i++) {
    for (let j = 0; j < ara[i].length; j++) {
      colLengths[j] = Math.max(colLengths[j], String(ara[i][j]).length);
    }
  }
  let str = '```md\n'

  for (let i = 0; i < ara.length; i++) {

    if (i !== 0) {
      str += '> '
    } else {
      str += '  ';
    }
    for (let j = 0; j < ara[i].length; j++) {
      if (i === 0) {
        str += String(ara[i][j]).padEnd(colLengths[j] + 4, ' ');
      } else {
        if (j !== 0)
          str += String(ara[i][j]).padEnd(colLengths[j] + 4, ' ');
        else
          str += String(ara[i][j]).padEnd(colLengths[j] + 4, ' ');
      }
    }
    if (i === 0) {
      str += '\n';
      str += '-'.repeat(colLengths.reduce((a, b) => a + b, 0) + 14);
    }
    str += '\n';
  }

  str += '```'


  message.reply({ content: str, ephemeral: true });
}

});

client.on(Events.VoiceStateUpdate, async (oldState, newState, t) => {

  const user = oldState.guild.members.cache.get(oldState.id);

  if (!user.roles.cache.has(ROLEFLAG))
    return;

  if (oldState.channelId === null && newState.channelId !== null) {
    if (DEBUG)
      console.log(`User ${newState.id} joined channel ${newState.channelId} at ${Date.now()}`)
    DBHandler.insertVoiceStatus(getTimestamp(), newState.id, 'JOIN');
  }

  if (oldState.channelId !== null && newState.channelId === null) {
    if (DEBUG)
      console.log(`User ${oldState.id} left channel ${oldState.channelId} at ${Date.now()}`)
    DBHandler.insertVoiceStatus(getTimestamp(), oldState.id, 'LEAVE');
  }

});

client.login(TOKEN);