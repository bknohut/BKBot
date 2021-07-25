// Berke Kagan Nohut
// 27.02.2020 - v.1.0
// 27.12.2020 - v.1.1
// 20.06.2021 - v.1.2
// 25.07.2021 - v.1.3

// imports
const Discord = require('discord.js');
const fs = require('fs');
const discordTTS = require('discord-tts');
require('dotenv').config();

// client definition
const client = new Discord.Client();
client.login(process.env.BOT_TOKEN);
// constants
const resources = './resources';
const soundFilePath = resources + '/sounds/';

// variables
const commands = [];
const commandMap = {};
const commandQueue = [];
let globalCommandQueueLock = false;

// on bot launch
client.on('ready', () => {
	console.log('BKBot Status: Logged in as BKBot');
	const files = fs.readdirSync(soundFilePath);
	for(let i = 0; i < files.length; i++) {
		const key = files[i].split('.').slice(0, -1).join('.');
		commands.push(key);
		commandMap[key] = soundFilePath + files[i];
	}
});


// on member sent message
client.on('message', async message => {
	if(message.author.bot) return;

	if(message.content.indexOf(process.env.PREFIX) !== 0) return;

	const args = message.content.slice(process.env.PREFIX.length).trim().split(process.env.PREFIX);
	const command = args.shift().toLowerCase().split(' ');

	if(command.length == 1 && command[0] === 'help') {
		let m = 'BKBot Help\n' +
            '!BK prefix to command me\n' +
            'Available Commands:\n';
		for(let i = 0; i < commands.length; i++) {
			m = m + '!BK ' + commands[i] + '\n';
		}
		m = m + '!BK say <Text> to make the me speak the words.';
		message.channel.send(m);
		return;
	}

	if(command.length > 1 && command[0] === 'say') {
		if(globalCommandQueueLock) {
			return;
		}

		globalCommandQueueLock = true;
		const connection = await joinAuthorChannel(message.member);
		const broadcast = client.voice.createBroadcast();
		const duration = command.length * 500;
		const text = command.slice(1).join(' ');
		broadcast.play(discordTTS.getVoiceStream(text, { lang:'tr' }));
		connection.play(broadcast);
		setTimeout(() => {
			globalCommandQueueLock = false;
			if(commandQueue.length > 0) {
                commandQueue.shift()();
			}
			else{
				connection.disconnect();
			}
		}, 3000 + duration);
	}

	for(let i = 0; i < commands.length; i++) {
		if(command == commands[i]) {
			const connection = await joinAuthorChannel(message.member);
			playSound(connection, commandMap[command]);
		}
	}
});

/*
// runs when a member joins a voice channel
client.on('voiceStateUpdate', (oldmember, newmember)=>{
    //let oldvoice = oldmember.voiceChannel;
    let newvoice = newmember.voiceChannel;
})
*/

async function joinAuthorChannel(author) {
	const connection = await author.voice.channel.join();
	return connection;
}

async function playSound(connection, sound) {

	if(!globalCommandQueueLock) {
		globalCommandQueueLock = true;
		connection.play(sound).on('finish', () => {
            console.log('Finished playing sound.');
            console.log('The number of commands waiting to be executed is: ' + commandQueue.length);
            globalCommandQueueLock = false;
            if(commandQueue.length > 0) {
                commandQueue.shift()();
            }
            else{
                connection.disconnect();
            }
        }).on('error', () => {
            console.log('Error occurred while executing command. The voice channel connection might have failed. Exitting...');
            connection.disconnect();
        });
	}
	else{
		commandQueue.push(function() {playSound(connection, sound);});
        console.log('Sound added to queue');
        console.log(commandQueue.length + ' are waiting in line to be executed.');
	}
}
